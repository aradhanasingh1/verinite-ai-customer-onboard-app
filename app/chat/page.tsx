// app/chat/page.tsx
'use client';

import { ChatInterface } from '@/components/ChatInterface/ChatInterface';

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">
          Customer Onboarding Assistant
        </h1>
        <ChatInterface />
      </div>
    </div>
  );
}