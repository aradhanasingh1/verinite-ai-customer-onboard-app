'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RiskToleranceToggle } from '../src/components/AuditTrail/RiskToleranceToggle';
import { getCurrentSession, getRiskToleranceAsync, determineApplicationStatus } from '../src/lib/auditStore';
import type { RiskToleranceLevel } from '../src/types/audit';

export default function CustomerOnboardingPage() {
  const [riskTolerance, setRiskToleranceState] = useState<RiskToleranceLevel | null>(null);
  const [loadingRiskTolerance, setLoadingRiskTolerance] = useState(true);
  const [applicationId, setApplicationId] = useState<string | null>(null);

  // Load current session and risk tolerance
  useEffect(() => {
    const session = getCurrentSession();
    if (session) {
      setApplicationId(session.sessionId);
      
      // Load risk tolerance for this session
      getRiskToleranceAsync(session.sessionId)
        .then(level => {
          setRiskToleranceState(level);
        })
        .catch(error => {
          console.error('Failed to load risk tolerance:', error);
          // Set default to HIGH if fetch fails
          setRiskToleranceState('HIGH');
        })
        .finally(() => {
          setLoadingRiskTolerance(false);
        });
    } else {
      // No session yet, check if user set a default risk tolerance
      let defaultLevel: RiskToleranceLevel = 'HIGH'; // Default to HIGH for auto-approval
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('verinite_default_risk_tolerance');
        if (stored === 'HIGH' || stored === 'LOW') {
          defaultLevel = stored;
        }
      }
      setRiskToleranceState(defaultLevel);
      setLoadingRiskTolerance(false);
    }
  }, []);

  const handleRiskToleranceChange = async (newLevel: RiskToleranceLevel) => {
    console.log('[Landing Page] Risk tolerance changed to:', newLevel);
    
    // Update local state immediately for responsive UI
    setRiskToleranceState(newLevel);
    
    // If there's an application ID, persist it
    if (applicationId && applicationId !== 'default') {
      // Determine new application status based on risk tolerance
      const newStatus = determineApplicationStatus(newLevel);
      
      // Update session status
      const session = getCurrentSession();
      if (session) {
        session.applicationStatus = newStatus;
      }
    } else {
      // No session yet - store in localStorage for when session is created
      console.log('[Landing Page] Storing default risk tolerance in localStorage:', newLevel);
      if (typeof window !== 'undefined') {
        localStorage.setItem('verinite_default_risk_tolerance', newLevel);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header with Logo and Navigation */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-white/10 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-lg p-2 shadow-lg group-hover:shadow-indigo-500/50 transition-shadow">
                <img src="/verinite-logo.png" alt="Verinite" className="h-6 w-auto object-contain brightness-0 invert" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
                  Customer Onboarding
                </h1>
                <p className="text-xs text-slate-400">Manual and Bot Flows</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-indigo-400 border-b-2 border-indigo-400 pb-1"
              >
                Home
              </Link>
              <Link
                href="/form"
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h4m-4 4h4m-4-8h4m-4 12h.01M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Form
              </Link>
              <Link
                href="/chat"
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Chat
              </Link>
              <Link
                href="/audit-trail"
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Audit Trail
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-6 py-8">
        <div className="max-w-2xl mx-auto px-6 space-y-3">

          {/* ── Welcome Banner ── */}
          {/* <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 shadow-xl text-white">
            <h2 className="text-2xl font-bold mb-2">Welcome to Verinite Onboarding</h2>
            <p className="text-indigo-100 text-sm">
              Complete your customer verification process with our AI-powered onboarding system.
            </p>
          </div> */}

          {/* ── Top nav bar with Form link ── */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg gap-4 flex-wrap backdrop-blur-sm">
            <div>
              <div className="text-sm font-semibold text-white">Try the form-based onboarding</div>
              <div className="text-xs text-slate-400">Multi-step form with document upload & verification</div>
            </div>
            <Link
              href="/form"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/20"
            >
              Open Form →
            </Link>
          </div>

          {/* ── Chat demo banner ── */}
          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 shadow-lg gap-4 flex-wrap backdrop-blur-sm">
            <div>
              <div className="text-sm font-semibold text-white">Try the conversational demo</div>
              <div className="text-xs text-slate-400">Chat UI + Document upload, backed by the orchestrator</div>
            </div>
            <Link
              href="/chat"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/20"
            >
              Open Chat →
            </Link>
          </div>

          {/* ── Risk Management Section ── */}
          {!loadingRiskTolerance && (
            <div className="rounded-xl border border-orange-500/20 bg-gradient-to-r from-orange-900/20 via-red-900/20 to-rose-900/20 p-5 shadow-lg backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xl shadow-lg shadow-orange-500/30">
                  ⚖️
                </div>
                <div>
                  <h3 className="text-sm font-bold text-orange-300">Risk Tolerance</h3>
                  <p className="text-xs text-orange-400/80">
                    {applicationId 
                      ? 'Control approval threshold for this application' 
                      : 'Set default approval threshold (will apply when you start chat)'}
                  </p>
                </div>
              </div>
              <RiskToleranceToggle
                currentLevel={riskTolerance || 'HIGH'}
                onChange={handleRiskToleranceChange}
                applicationId={applicationId || 'default'}
                disabled={false}
              />
            </div>
          )}

          {/* ── Audit trail banner ── */}
          <div className="flex items-center justify-between rounded-xl z-0 border border-indigo-500/20 bg-gradient-to-r from-indigo-900/20 via-violet-900/20 to-purple-900/20 p-4 shadow-lg gap-4 flex-wrap backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-base shadow-md shadow-indigo-500/20">
                🔍
              </div>
              <div>
                <div className="text-sm font-semibold text-indigo-300">View Audit Trail</div>
                <div className="text-xs text-indigo-400/80">Track your onboarding steps, verifications & application status</div>
              </div>
            </div>
            <Link
              href="/audit-trail"
              className="rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all duration-200"
            >
              Open Audit Trail →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}