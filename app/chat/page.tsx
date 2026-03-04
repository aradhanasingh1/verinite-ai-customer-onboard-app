// app/chat/page.tsx
'use client';

import ChatInterface from '@/components/ChatInterface/ChatInterface';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-2xl">
        {/* <div className="mb-8 text-center space-y-4">
          <img
            src="/verinite-logo.png"
            alt="Verinite Logo"
            className="h-12 mx-auto"
          />
          <p className="text-slate-500 font-medium">
            AI-powered seamless customer onboarding experience
          </p>
        </div> */}

        <div className="rounded-3xl shadow-2xl shadow-indigo-100 overflow-hidden border border-white">
          <ChatInterface />
        </div>

        <div className="mt-8 flex items-center justify-center gap-6 text-xs font-semibold text-slate-400 uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            Secure KYC
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            Address Verified
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-400" />
            Instant Processing
          </div>
        </div>
      </div>
    </div>
  );
}