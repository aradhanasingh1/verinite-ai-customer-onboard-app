// src/app/admin/page.tsx
'use client';

import { NavBar } from '../../components/NavBar/NavBar';
import { AuditTrailDisplay } from '../../components/AuditTrail/AuditTrailDisplay';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col h-screen">
      <NavBar />
      <main className="flex-1 p-4 bg-gray-100 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <AuditTrailDisplay />
      </main>
    </div>
  );
}
