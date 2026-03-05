// src/components/AuditTrail/AuditTrailDisplay.tsx
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Activity, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';

interface AuditEvent {
  traceId: string;
  stage: string;
  timestamp: string;
  payload: any;
}

interface AuditTrailData {
  traceId: string;
  applicantName: string; // This will need to be derived or passed
  status: 'pending' | 'approved' | 'denied' | 'escalated'; // Overall status
  finalDecision: string; // Overall final decision
  steps: AuditEvent[]; // Raw audit events from the backend
}

export function AuditTrailDisplay() {
  const searchParams = useSearchParams();
  const traceId = searchParams.get('traceId');
  const [auditData, setAuditData] = useState<AuditTrailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (traceId) {
      const fetchAuditData = async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch(`${API_BASE_URL}/onboarding/trace/${traceId}`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data: AuditEvent[] = await response.json();

          // Process raw audit events into a more structured AuditTrailData
          const processedData: AuditTrailData = {
            traceId: traceId,
            applicantName: 'N/A', // Placeholder, will need to derive from events
            status: 'pending', // Placeholder, will need to derive from events
            finalDecision: 'PENDING', // Placeholder, will need to derive from events
            steps: data,
          };

          // Attempt to derive applicant name, final status, and decision from events
          const onboardingStartedEvent = data.find(e => e.stage === 'onboarding.started');
          if (onboardingStartedEvent?.payload?.ctx?.payload?.applicant?.fullName) {
            processedData.applicantName = onboardingStartedEvent.payload.ctx.payload.applicant.fullName;
          }

          const finalEvent = data.find(e => e.stage === 'onboarding.finished' || e.stage.endsWith('.completed'));
          if (finalEvent) {
            processedData.finalDecision = finalEvent.payload.finalDecision || finalEvent.payload.final || 'UNKNOWN';
            processedData.status = processedData.finalDecision.toLowerCase() as AuditTrailData['status'];
          }
          
          setAuditData(processedData);
        } catch (err) {
          console.error('Failed to fetch audit trail:', err);
          setError('Failed to load audit trail data. ' + (err instanceof Error ? err.message : String(err)));
        } finally {
          setLoading(false);
        }
      };
      fetchAuditData();
    } else {
      setLoading(false);
      setError('No traceId provided. Please navigate from a completed chat session.');
    }
  }, [traceId]);

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading audit trail...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-600">{error}</div>;
  }

  if (!auditData || auditData.steps.length === 0) {
    return <div className="p-4 text-center text-gray-600">No audit data available for this trace ID.</div>;
  }

  const getStatusIcon = (stage: string, status: string) => {
    if (stage.endsWith('.completed')) {
      if (status === 'APPROVE') return <CheckCircle2 size={16} className="text-emerald-500" />;
      if (status === 'DENY') return <XCircle size={16} className="text-rose-500" />;
      if (status === 'ESCALATE') return <AlertTriangle size={16} className="text-amber-500" />;
    }
    if (stage.endsWith('.invoked')) return <Activity size={16} className="text-indigo-500 animate-pulse" />;
    return <Info size={16} className="text-gray-400" />;
  };

  const getOverallStatusColor = (status: AuditTrailData['status']) => {
    switch (status) {
      case 'approved':
        return 'text-emerald-600';
      case 'denied':
        return 'text-rose-600';
      case 'escalated':
        return 'text-amber-600';
      case 'pending':
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Activity size={24} className="text-indigo-500" />
        Audit Trail for <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">{auditData.traceId}</span>
      </h2>

      <div className="mb-6 p-4 border rounded-lg flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Applicant</p>
          <p className="text-lg font-semibold">{auditData.applicantName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Overall Status</p>
          <p className={`text-lg font-bold ${getOverallStatusColor(auditData.status)}`}>
            {auditData.finalDecision || auditData.status.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {auditData.steps.map((step, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50">
            <div className="flex-shrink-0 mt-1">
              {getStatusIcon(step.stage, step.payload.finalDecision || step.payload.final || '')}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{step.stage.replace(/\./g, ' ').toUpperCase()}</p>
              <p className="text-sm text-gray-600">{step.payload.description || JSON.stringify(step.payload)}</p>
              {step.payload.agentOutput && (
                <div className="mt-2 text-xs text-gray-500">
                  <p className="font-medium">Agent Output:</p>
                  <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{JSON.stringify(step.payload.agentOutput, null, 2)}</pre>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">{new Date(step.timestamp).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
