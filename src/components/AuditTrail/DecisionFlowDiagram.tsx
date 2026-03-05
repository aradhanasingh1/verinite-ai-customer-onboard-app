// src/components/AuditTrail/DecisionFlowDiagram.tsx
'use client';

import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Shield, FileCheck, Users, CreditCard, MapPin } from 'lucide-react';

interface DecisionStep {
  agent: string;
  icon: React.ReactNode;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  label: string;
  confidence?: number;
  details?: string;
}

interface DecisionFlowDiagramProps {
  steps: DecisionStep[];
  finalDecision: 'APPROVE' | 'DENY' | 'ESCALATE' | 'PENDING';
  riskTolerance?: 'HIGH' | 'LOW';
}

export function DecisionFlowDiagram({ steps, finalDecision, riskTolerance }: DecisionFlowDiagramProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'from-emerald-500 to-green-600';
      case 'fail': return 'from-red-500 to-rose-600';
      case 'warning': return 'from-amber-500 to-orange-600';
      default: return 'from-slate-500 to-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle2 size={20} className="text-white" />;
      case 'fail': return <XCircle size={20} className="text-white" />;
      case 'warning': return <AlertTriangle size={20} className="text-white" />;
      default: return <div className="w-2 h-2 rounded-full bg-white animate-pulse" />;
    }
  };

  const getFinalDecisionStyle = () => {
    switch (finalDecision) {
      case 'APPROVE':
        return {
          bg: 'from-emerald-500 to-green-600',
          border: 'border-emerald-500/50',
          text: 'text-emerald-300',
          icon: <CheckCircle2 size={32} className="text-white" />,
          label: 'APPROVED'
        };
      case 'DENY':
        return {
          bg: 'from-red-500 to-rose-600',
          border: 'border-red-500/50',
          text: 'text-red-300',
          icon: <XCircle size={32} className="text-white" />,
          label: 'DENIED'
        };
      case 'ESCALATE':
        return {
          bg: 'from-amber-500 to-orange-600',
          border: 'border-amber-500/50',
          text: 'text-amber-300',
          icon: <AlertTriangle size={32} className="text-white" />,
          label: 'ESCALATED'
        };
      default:
        return {
          bg: 'from-slate-500 to-gray-600',
          border: 'border-slate-500/50',
          text: 'text-slate-300',
          icon: <div className="w-8 h-8 rounded-full border-4 border-white border-t-transparent animate-spin" />,
          label: 'PENDING'
        };
    }
  };

  const finalStyle = getFinalDecisionStyle();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          🔄
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Decision Flow</h3>
          <p className="text-xs text-slate-400">Step-by-step verification process</p>
        </div>
      </div>

      {/* Risk Tolerance Badge */}
      {riskTolerance && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
          <Shield size={16} className={riskTolerance === 'HIGH' ? 'text-emerald-400' : 'text-amber-400'} />
          <span className="text-xs text-slate-400">Risk Tolerance:</span>
          <span className={`text-sm font-semibold ${riskTolerance === 'HIGH' ? 'text-emerald-300' : 'text-amber-300'}`}>
            {riskTolerance}
          </span>
          <span className="text-xs text-slate-500 ml-auto">
            {riskTolerance === 'HIGH' ? 'Auto-approve enabled' : 'Manual review required'}
          </span>
        </div>
      )}

      {/* Agent Steps Flow */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={index} className="relative flex items-start gap-4 group">
              {/* Step icon */}
              <div className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${getStatusColor(step.status)} shadow-lg flex items-center justify-center transition-transform group-hover:scale-110`}>
                {step.icon}
              </div>

              {/* Step content */}
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{step.agent}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        step.status === 'pass' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                        step.status === 'fail' ? 'bg-red-500/20 text-red-300 border border-red-500/40' :
                        step.status === 'warning' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                        'bg-slate-500/20 text-slate-300 border border-slate-500/40'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                    {step.details && (
                      <p className="text-xs text-slate-400 leading-relaxed">{step.details}</p>
                    )}
                    {step.confidence !== undefined && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Confidence:</span>
                        <div className="flex-1 max-w-[120px] h-1.5 bg-black/30 rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${getStatusColor(step.status)} transition-all duration-500`}
                            style={{ width: `${step.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">{Math.round(step.confidence * 100)}%</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status indicator */}
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getStatusColor(step.status)} flex items-center justify-center shadow-md`}>
                    {getStatusIcon(step.status)}
                  </div>
                </div>
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <div className="absolute left-6 top-16 flex items-center justify-center">
                  <ArrowRight size={16} className="text-white/20 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Final Decision Arrow */}
      <div className="flex items-center justify-center py-2">
        <div className="flex flex-col items-center gap-2">
          <ArrowRight size={24} className="text-white/30 rotate-90" />
          <span className="text-[10px] text-slate-500 uppercase tracking-wider">Final Decision</span>
          <ArrowRight size={24} className="text-white/30 rotate-90" />
        </div>
      </div>

      {/* Final Decision Card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${finalStyle.bg} p-6 shadow-2xl border-2 ${finalStyle.border}`}>
        {/* Animated background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_50%)]" />
        </div>

        <div className="relative flex items-center gap-4">
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
            {finalStyle.icon}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="text-xs text-white/80 uppercase tracking-wider mb-1">Application Status</div>
            <div className="text-2xl font-bold text-white mb-1">{finalStyle.label}</div>
            <div className="text-sm text-white/90">
              {finalDecision === 'APPROVE' && 'All verification checks passed successfully'}
              {finalDecision === 'DENY' && 'Verification checks failed - application rejected'}
              {finalDecision === 'ESCALATE' && 'Requires manual review by compliance team'}
              {finalDecision === 'PENDING' && 'Verification in progress...'}
            </div>
          </div>

          {/* Decorative element */}
          <div className="hidden sm:block">
            <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center">
              <div className="text-3xl">
                {finalDecision === 'APPROVE' && '✓'}
                {finalDecision === 'DENY' && '✗'}
                {finalDecision === 'ESCALATE' && '⚠'}
                {finalDecision === 'PENDING' && '⏳'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to extract decision flow from audit steps
export function extractDecisionFlow(steps: any[]): DecisionStep[] {
  const agentSteps: DecisionStep[] = [];
  
  // Map of agent categories to icons and labels
  const agentConfig: Record<string, { icon: React.ReactNode; label: string }> = {
    kyc: { icon: <FileCheck size={20} className="text-white" />, label: 'KYC Verification' },
    aml: { icon: <Shield size={20} className="text-white" />, label: 'AML Screening' },
    credit: { icon: <CreditCard size={20} className="text-white" />, label: 'Credit Check' },
    address: { icon: <MapPin size={20} className="text-white" />, label: 'Address Verification' },
    risk: { icon: <AlertTriangle size={20} className="text-white" />, label: 'Risk Assessment' },
  };

  steps.forEach(step => {
    if (step.agentMetadata && step.agentName !== 'legacy') {
      const config = agentConfig[step.category] || { 
        icon: <Users size={20} className="text-white" />, 
        label: step.agentName 
      };

      const decision = step.agentMetadata.decision;
      let status: 'pass' | 'fail' | 'warning' | 'pending' = 'pending';
      
      if (decision?.outcome) {
        const outcome = decision.outcome.toLowerCase();
        if (outcome.includes('approve') || outcome.includes('pass')) status = 'pass';
        else if (outcome.includes('deny') || outcome.includes('fail')) status = 'fail';
        else if (outcome.includes('escalate') || outcome.includes('review')) status = 'warning';
      } else if (step.status === 'completed') {
        status = 'pass';
      } else if (step.status === 'failed') {
        status = 'fail';
      }

      agentSteps.push({
        agent: config.label,
        icon: config.icon,
        status,
        label: status.toUpperCase(),
        confidence: decision?.confidence,
        details: decision?.reasoning || step.description,
      });
    }
  });

  return agentSteps;
}
