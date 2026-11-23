"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { BADGES_CHANGED_EVENT } from '@/lib/events';
import {
  Home, Users, MessageSquare, Calendar, Star, CheckSquare, BarChart2, Menu, X, Settings,
  ChevronUp, Globe, LogOut, BookOpen, ConciergeBell, CalendarRange, Sparkles, Tags,
} from 'lucide-react';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  // Name des eingeloggten Hotels für die Header-Anzeige. hotels.id
  // entspricht hotel_id/auth.uid() (dasselbe Muster wie bei allen anderen
  // Dashboard-Abfragen), daher genügt ein einzelner Lookup nach dem Login.
  const [hotelName, setHotelName] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
      if (data.user) {
        supabase
          .from('hotels')
          .select('name')
          .eq('id', data.user.id)
          .maybeSingle()
          .then(({ data: hotel }) => setHotelName(hotel?.name ?? null));
      }
    });
  }, []);

  async function handleLogout() {
    setUserMenuOpen(false);
    setIsOpen(false);
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  }

  // RLS (hotel_id = auth.uid()) sorgt automatisch dafür, dass hier nur Zeilen
  // des eingeloggten Hotels gezählt werden – keine explizite hotel_id nötig.
  const [badgeCounts, setBadgeCounts] = useState({ messages: 0, reviews: 0, tasks: 0 });

  useEffect(() => {
    async function fetchBadgeCounts() {
      const [{ count: messagesCount }, { count: reviewsCount }, { count: tasksCount }] = await Promise.all([
        supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .in('status', ['new', 'pending_review']),
        supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'new'),
        supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      ]);

      setBadgeCounts({
        messages: messagesCount ?? 0,
        reviews: reviewsCount ?? 0,
        tasks: tasksCount ?? 0,
      });
    }

    fetchBadgeCounts();

    // Andere Client-Components (Tasks-/Messages-Seite) melden sich hierüber,
    // wenn sich badge-relevante Daten geändert haben (kein gemeinsamer State,
    // kein Next.js-Caching – daher kein router.refresh()).
    window.addEventListener(BADGES_CHANGED_EVENT, fetchBadgeCounts);
    return () => window.removeEventListener(BADGES_CHANGED_EVENT, fetchBadgeCounts);
  }, []);

  const navItems: { name: string; href: string; icon: typeof Home; badge?: number; group?: string }[] = [
    { name: 'Übersicht', href: '/dashboard', icon: Home },
    { name: 'Rezeption', href: '/dashboard/rezeption', icon: ConciergeBell, group: 'Hotelbetrieb' },
    { name: 'Zimmerplan', href: '/dashboard/zimmerplan', icon: CalendarRange },
    { name: 'Housekeeping', href: '/dashboard/housekeeping', icon: Sparkles },
    { name: 'Raten & Zimmer', href: '/dashboard/raten', icon: Tags },
    { name: 'Gäste', href: '/dashboard/guests', icon: Users, group: 'Gäste & Kommunikation' },
    { name: 'Nachrichten', href: '/dashboard/messages', icon: MessageSquare, badge: badgeCounts.messages },
    { name: 'Buchungen', href: '/dashboard/bookings', icon: Calendar },
    { name: 'Bewertungen', href: '/dashboard/reviews', icon: Star, badge: badgeCounts.reviews },
    { name: 'Aufgaben', href: '/dashboard/tasks', icon: CheckSquare, badge: badgeCounts.tasks },
    { name: 'Analysen', href: '/dashboard/analytics', icon: BarChart2, group: 'Auswertung & Wissen' },
    { name: 'Wissen', href: '/dashboard/wissen', icon: BookOpen },
    // NEU: Der Menüpunkt für die Einstellungen
    { name: 'Einstellungen', href: '/dashboard/settings', icon: Settings },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-white border-b border-slate-200 h-[73px] flex items-center pl-4 pr-10 z-40 shadow-sm">
        <button 
          onClick={() => setIsOpen(true)} 
          className="p-2 mr-4 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
          aria-label="Menü öffnen"
        >
          <Menu size={24} />
        </button>
        <Link href="/dashboard">
          <h1 className="text-xl font-bold text-emerald-800 leading-tight">Lobbio</h1>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Hotel Dashboard</p>
        </Link>
        {/* Name des eingeloggten Hotels, dezent/sekundär rechts im
            Header. Auf kleinen Bildschirmen ausgeblendet, damit die Leiste
            neben Menü-Button und Logo nicht überläuft. */}
        {hotelName && (
          <span className="ml-auto hidden sm:inline text-sm text-slate-500 truncate max-w-[240px]">
            {hotelName}
          </span>
        )}
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-50 backdrop-blur-sm transition-opacity"
          onClick={() => { setIsOpen(false); setUserMenuOpen(false); }}
        />
      )}

      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 
        transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-[73px] flex items-center justify-between px-4 border-b border-slate-100 shrink-0">
          <span className="font-bold text-emerald-800 text-lg">Menü</span>
          <button 
            onClick={() => setIsOpen(false)} 
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <React.Fragment key={item.name}>
              {item.group && (
                <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.group}</p>
              )}
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)} 
                className={`
                  flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-emerald-50 text-emerald-700 font-medium' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon size={20} className={isActive ? 'text-emerald-600' : 'text-slate-400'} />
                  {item.name}
                </div>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
              </React.Fragment>
            );
          })}
        </nav>

        {/* User-Profil-Menü: Logout + Link zurück zur öffentlichen Website */}
        <div className="relative shrink-0 border-t border-slate-100 p-3">
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
              <Link
                href="/"
                onClick={() => { setUserMenuOpen(false); setIsOpen(false); }}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <Globe size={16} /> Zur öffentlichen Website
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-100"
              >
                <LogOut size={16} /> Abmelden
              </button>
            </div>
          )}

          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center justify-center shrink-0 text-sm uppercase">
              {userEmail ? userEmail.charAt(0) : '?'}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium text-slate-700 truncate">{userEmail ?? 'Angemeldet'}</p>
            </div>
            <ChevronUp size={16} className={`text-slate-400 transition-transform shrink-0 ${userMenuOpen ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </aside>
    </>
  );
}