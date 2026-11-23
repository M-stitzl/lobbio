import React from 'react';
import Sidebar from '@/component/Sidebar';
import AiRecommendations from '@/component/AiRecommendations';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans overflow-hidden">
      <Sidebar />

      <main className="relative flex-1 xl:mr-80 mt-[73px] h-[calc(100vh-73px)] overflow-hidden flex flex-col">
        <div className="p-4 md:p-6 w-full max-w-5xl mx-auto h-full">
          {children}
        </div>
      </main>

      <AiRecommendations />
    </div>
  );
}
