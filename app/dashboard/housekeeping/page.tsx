'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchBookingsInRange, fetchRoomsAndTypes, useRealtimeRefresh, HK_LABEL, type HousekeepingStatus, type PmsBooking, type Room, type RoomType } from '@/lib/pms/client';
import { addDays, toISODate } from '@/lib/pms/stay';
import { Chip, EmptyState, Notice, PageHeader, Panel } from '@/components/pms/ui';

type Filter = 'todo' | 'all';
const NEXT: { status: HousekeepingStatus; label: string; cls: string }[] = [
  { status: 'dirty', label: 'Zu reinigen', cls: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white data-[on=true]:border-amber-500' },
  { status: 'clean', label: 'Sauber', cls: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white data-[on=true]:border-emerald-600' },
  { status: 'inspected', label: 'Kontrolliert', cls: 'data-[on=true]:bg-sky-600 data-[on=true]:text-white data-[on=true]:border-sky-600' },
  { status: 'out_of_service', label: 'Gesperrt', cls: 'data-[on=true]:bg-slate-600 data-[on=true]:text-white data-[on=true]:border-slate-600' },
];

export default function HousekeepingPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [types, setTypes] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<PmsBooking[]>([]);
  const [filter, setFilter] = useState<Filter>('todo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() =>
    Promise.all([fetchRoomsAndTypes(), fetchBookingsInRange(today, addDays(today, 1))])
      .then(([rt, b]) => { setRooms(rt.rooms); setTypes(rt.roomTypes); setBookings(b); setLoading(false); })
      .catch(() => { setError('Daten konnten nicht geladen werden.'); setLoading(false); }), [today]);
  useEffect(() => { load(); }, [load]);

  useRealtimeRefresh(['rooms', 'bookings'], load);

  async function setStatus(room: Room, status: HousekeepingStatus) {
    setError(null);
    setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, housekeeping_status: status } : r)));
    const { error: e } = await supabase.from('rooms').update({ housekeeping_status: status, housekeeping_updated_at: new Date().toISOString() }).eq('id', room.id);
    if (e) { setError(`Status für Zimmer ${room.number} konnte nicht gespeichert werden.`); load(); }
  }

  // Kontext je Zimmer: heutige Anreise hat Vorrang für die Reihenfolge.
  const ctx = (room: Room) => {
    const arrival = bookings.find((b) => b.room_id === room.id && b.check_in === today && !b.checked_in_at);
    const departure = bookings.find((b) => b.room_id === room.id && b.check_out === today);
    const stay = bookings.find((b) => b.room_id === room.id && b.checked_in_at && !b.checked_out_at && b.check_out > today);
    return { arrival, departure, stay };
  };

  const list = rooms
    .filter((r) => filter === 'all' || r.housekeeping_status === 'dirty')
    .map((r) => ({ room: r, ...ctx(r) }))
    .sort((a, b) => Number(!!b.arrival) - Number(!!a.arrival) || a.room.sort_order - b.room.sort_order);

  const dirtyCount = rooms.filter((r) => r.housekeeping_status === 'dirty').length;

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pb-6 pr-1">
      <PageHeader title="Housekeeping" description={`${dirtyCount} ${dirtyCount === 1 ? 'Zimmer' : 'Zimmer'} zu reinigen · Zimmer mit heutiger Anreise zuerst`}
        actions={
          <div role="tablist" className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(['todo', 'all'] as Filter[]).map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${filter === f ? 'bg-emerald-700 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
                {f === 'todo' ? 'Zu reinigen' : 'Alle Zimmer'}
              </button>
            ))}
          </div>
        } />
      {error && <Notice tone="error">{error}</Notice>}
      <Panel className="shrink-0">
        {loading ? <div className="h-60 animate-pulse bg-slate-50" /> : list.length === 0 ? (
          <EmptyState icon={<Sparkles size={28} />} title="Alles sauber">Sobald ein Gast auscheckt, erscheint sein Zimmer hier automatisch.</EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {list.map(({ room, arrival, departure, stay }) => (
              <li key={room.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <div className="w-28 shrink-0">
                  <p className="text-xl font-bold tabular-nums text-slate-800 leading-none">{room.number}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{types.find((t) => t.id === room.room_type_id)?.name}</p>
                </div>
                <div className="flex-1 min-w-[160px] flex flex-wrap gap-1.5">
                  {arrival && <Chip tone="red">Anreise heute{arrival.guests?.name ? `: ${arrival.guests.name}` : ''}</Chip>}
                  {departure && <Chip tone="sky">{departure.checked_out_at ? 'Abgereist' : 'Abreise heute'}</Chip>}
                  {stay && !departure && <Chip tone="slate">Bleibeservice</Chip>}
                  {!arrival && !departure && !stay && <span className="text-xs text-slate-500">Frei</span>}
                </div>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={`Status Zimmer ${room.number}`}>
                  {NEXT.map((n) => (
                    <button key={n.status} data-on={room.housekeeping_status === n.status} aria-pressed={room.housekeeping_status === n.status}
                      onClick={() => setStatus(room, n.status)}
                      className={`h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors ${n.cls}`}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <p className="text-xs text-slate-500 shrink-0">Status: {Object.values(HK_LABEL).join(' · ')}. Änderungen sind sofort an der Rezeption sichtbar.</p>
    </div>
  );
}
