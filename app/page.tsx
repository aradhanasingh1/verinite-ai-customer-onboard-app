'use client';

import Link from 'next/link';
import MultiStepForm from '../src/components/Form';

export default function CustomerOnboardingPage() {
  return (
    <div className="space-y-6">
      <div className="max-w-2xl mx-auto px-6 pt-6">
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-sm font-medium text-gray-900">Try the conversational demo</div>
            <div className="text-xs text-gray-500">Chat UI + upload, backed by the orchestrator (port 4000)</div>
          </div>
          <Link
            href="/chat"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Open Chat
          </Link>
        </div>
      </div>
      <MultiStepForm />
    </div>
  );
}
