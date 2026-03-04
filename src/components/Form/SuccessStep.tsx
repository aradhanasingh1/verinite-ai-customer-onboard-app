import React from 'react';
import Link from 'next/link';

interface SuccessStepProps {
  onNewSubmission: () => void;
  finalDecision?: string | null;
  traceId?: string | null;
}

const SuccessStep: React.FC<SuccessStepProps> = ({ onNewSubmission, finalDecision, traceId }) => {
  const isApproved = finalDecision === 'APPROVE';
  const isDenied = finalDecision === 'DENY';
  const isEscalated = !isApproved && !isDenied;

  const decisionColor = isApproved ? 'text-emerald-600' : isDenied ? 'text-red-600' : 'text-amber-600';
  const decisionBg = isApproved ? 'bg-emerald-50' : isDenied ? 'bg-red-50' : 'bg-amber-50';
  const decisionIcon = isApproved ? '✅' : isDenied ? '❌' : '⚠️';
  const decisionLabel = isApproved
    ? 'Application Approved!'
    : isDenied
      ? 'Application Denied'
      : 'Under Manual Review';
  const decisionDesc = isApproved
    ? 'All checks passed. Welcome aboard! You will receive a confirmation email shortly.'
    : isDenied
      ? 'One or more verification checks did not meet our requirements. Please contact support for assistance.'
      : 'Your application has been flagged for manual review by our compliance team. We will contact you within 2 business days.';

  return (
    <div className="text-center space-y-6">
      {/* Icon */}
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 text-3xl">
        {decisionIcon}
      </div>

      {/* Title */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">Application Submitted!</h3>
        <p className="mt-1 text-sm text-gray-500">{decisionDesc}</p>
      </div>

      {/* Decision badge */}
      {finalDecision && (
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${decisionBg} border`}>
          <span className={`text-sm font-bold ${decisionColor}`}>{decisionLabel}</span>
        </div>
      )}

      {/* Trace ID */}
      {traceId && (
        <div className="text-xs text-gray-400 font-mono">
          Reference ID: <span className="font-semibold">{traceId}</span>
        </div>
      )}

      {/* ── Audit trail CTA ── */}
      <div className="pt-2 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 p-4">
        <div className="text-sm font-semibold text-indigo-800 mb-1">🔍 View Your Journey</div>
        <p className="text-xs text-indigo-600 mb-3">
          See a complete step-by-step record of your onboarding process, verifications performed, and current status.
        </p>
        <Link
          href="/audit-trail"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 hover:-translate-y-0.5"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Open Audit Trail
        </Link>
      </div>

      {/* New application */}
      <button
        type="button"
        onClick={onNewSubmission}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
      >
        Start New Application
      </button>
    </div>
  );
};

export default SuccessStep;