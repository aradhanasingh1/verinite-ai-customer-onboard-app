// src/components/NavBar/NavBar.tsx
'use client';

import Link from 'next/link';
import { MessageSquare, LayoutDashboard } from 'lucide-react';

export function NavBar() {
  return (
    <nav className="bg-slate-950 text-white p-4 shadow-md flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold hover:text-indigo-400 transition-colors">
          <img src="/verinite-logo.png" alt="Verinite" className="h-6 w-auto object-contain" />
          Onboarding Bot
        </Link>
      </div>
      <div className="flex items-center gap-6">
        <Link href="/form" className="flex items-center gap-2 text-sm font-medium hover:text-indigo-400 transition-colors">
          {/* <MessageSquare size={18} /> */}
          <u>Form</u>
        </Link>
        {/* <Link href="/audit-trail" className="flex items-center gap-2 text-sm font-medium hover:text-indigo-400 transition-colors">
          
          Admin Dashboard
        </Link> */}
      </div>
    </nav>
  );
}