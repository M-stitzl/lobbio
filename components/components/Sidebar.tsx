"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, Users, MessageSquare, Calendar, Star, 
  CheckSquare, BarChart, LogOut 
} from 'lucide-react';

export default function Sidebar() {
  // Liest die aktuelle URL aus (z.B. '/guests')
  const pathname = usePathname();

  // Array mit allen Navigationspunkten für sauberes Rendering
  const navItems = [
    { label: 'Übersicht', href: '/', icon: <Home size={20} /> },
    { label: 'Gäste', href: '/guests', icon: <Users size={20} /> },
    { label: 'Nachrichten', href: '/messages', icon: <MessageSquare size={20} />, badge: '3' },
    { label: 'Buchungen', href: '/bookings', icon: <Calendar size={20} /> },
    { label: 'Bewertungen', href: '/reviews', icon: <Star size={20} />, badge: '1' },
    { label: 'Aufgaben', href: '/tasks', icon: <CheckSquare size={20} />, badge: '5' },
    { label: 'Analytics', href: '/analytics', icon: <BarChart size={20} /> },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 h-full fixed left-0 top-0 z-40">
      <div className="p-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-emerald-800">Alpenblick Hotel</h1>
        <p className="text-xs text-slate-500 mt-1">Management Dashboard</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-800 font-medium' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold">
            H
          </div>
          <div className="text-sm font-medium">Hotelteam</div>
        </div>
        <button className="flex items-center gap-2 text-slate-600 hover:text-red-600 w-full px-2 py-2 text-sm transition-colors">
          <LogOut size={18} />
          Abmelden
        </button>
      </div>
    </aside>
  );
}