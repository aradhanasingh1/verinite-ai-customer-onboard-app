'use client';

import Link from 'next/link';
import MultiStepForm from '../../src/components/Form';

export default function FormPage() {
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
                  Verinite
                </h1>
                <p className="text-xs text-slate-400">Customer Onboarding</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-slate-400 hover:text-indigo-400 transition-colors"
              >
                Home
              </Link>
              <Link
                href="/form"
                className="text-sm font-medium text-indigo-400 border-b-2 border-indigo-400 pb-1"
              >
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
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="space-y-6 py-8">
        <div className="max-w-2xl mx-auto px-6 space-y-3">
          {/* ── Welcome Banner ── */}
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 shadow-xl text-white">
            <h2 className="text-2xl font-bold mb-2">Multi-Step Application Form</h2>
            <p className="text-indigo-100 text-sm">
              Complete your customer verification through our structured form-based onboarding process.
            </p>
          </div>
        </div>
        
        <MultiStepForm />
      </div>
    </div>
  );
}