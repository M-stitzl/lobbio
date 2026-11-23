'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, CalendarRange } from 'lucide-react';
import { fetchBookingsInRange, fetchRoomsAndTypes, useRealtimeRefresh, HK_LABEL, type PmsBooking, type Room, type RoomType } from '@/lib/pms/client';
import { addDays, formatDateDE, nightsBetween, occupiesNight, parseISODate, toISODate } from '@/lib/pms/stay';
import { Button, EmptyState, PageHeader, Panel } from '@/components/pms/ui';
import BookingDrawer, { stayState } from '@/components/pms/BookingDrawer';
import NewBookingDrawer from '@/components/pms/NewBookingDrawer';

const DAY_W = 48; // px pro Tag
const SPAN = 21; // Tage sichtbar

const BAR_TONE: Record<string, string> = {
  emerald: 'bg-emerald-600 text-white hover:bg-emerald-700',
  sky: 'bg-sky-600 text-white hover:bg-sky-700',
  amber: 'bg-amber-400 text-amber-950 hover:bg-amber-500',
  slate: 'bg-slate-400 text-white hover:bg-slate-500',
  red: 'bg-red-200 text-red-900',
};

const HK_DOT: Record<Room['housekeeping_status'], string> = {
  clean: 'bg-emerald-500', inspected: 'bg-sky-500', dirty: 'bg-amber-500', out_of_service: 'bg-slate-400',
};

export default function ZimmerplanPage() {
  const today = useMemo(() => toISODate(new Date()), []);
  const [start, setStart] = useState(() => addDays(today, -2));
  const end = addDays(start, SPAN);
  const days = useMemo(() => Array.from({ length: SPAN }, (_, i) => addDays(start, i)), [start]);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<PmsBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [newPreset, setNewPreset] = useState<{ checkIn?: string; roomId?: string } | null>(null);

  const load = useCallback(() =>
    Promise.all([fetchRoomsAndTypes(), fetchBookingsInRange(start, end)])
      .then(([rt, b]) => { setRooms(rt.rooms); setRoomTypes(rt.roomTypes); setBookings(b); setLoading(false); })
      .catch(() => setLoading(false)), [start, end]);
  useEffect(() => { load(); }, [load]);

  useRealtimeRefresh(['bookings', 'rooms'], load);

  const unassigned = bookings.filter((b) => !b.room_id && !b.checked_out_at && b.check_out > today);
  const totalRooms = rooms.filter((r) => r.housekeeping_status !== 'out_of_service').length;
  const occupancy = days.map((d) => bookings.filter((b) => occupiesNight(b, d)).length);

  const grouped = roomTypes.map((t) => ({ type: t, rooms: rooms.filter((r) => r.room_type_id === t.id) })).filter((g) => g.rooms.length > 0);

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pb-6 pr-1">
      <PageHeader
        title="Zimmerplan"
        description={`${formatDateDE(start)} – ${formatDateDE(addDays(end, -1))}`}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white">
              <button aria-label="Eine Woche zurück" onClick={() => setStart(addDays(start, -7))} className="p-2 text-slate-600 hover:bg-slate-50 rounded-l-lg"><ChevronLeft size={18} /></button>
              <button onClick={() => setStart(addDays(today, -2))} className="px-3 py-2 text-sm font-medium text-slate-700 border-x border-slate-200">Heute</button>
              <button aria-label="Eine Woche vor" onClick={() => setStart(addDays(start, 7))} className="p-2 text-slate-600 hover:bg-slate-50 rounded-r-lg"><ChevronRight size={18} /></button>
            </div>
            <Button variant="primary" onClick={() => setNewPreset({ checkIn: today })}><Plus size={16} /> Neue Buchung</Button>
          </>
        }
      />

      {unassigned.length > 0 && (
        <Panel title={`Ohne Zimmer (${unassigned.length})`} className="shrink-0">
          <ul className="flex flex-wrap gap-2 p-3">
            {unassigned.map((b) => (
              <li key={b.id}>
                <button onClick={() => setDrawerId(b.id)} className="text-left rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 hover:bg-amber-100 transition-colors">
                  <span className="block text-sm font-semibold text-slate-800">{b.guests?.name ?? 'Gast'}</span>
                  <span className="block text-xs text-slate-600">{b.room_type} · {formatDateDE(b.check_in, { day: '2-digit', month: '2-digit' })}–{formatDateDE(b.check_out, { day: '2-digit', month: '2-digit' })}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <Panel className="shrink-0 overflow-hidden">
        {loading ? (
          <div className="h-80 animate-pulse bg-slate-50" />
        ) : rooms.length === 0 ? (
          <EmptyState icon={<CalendarRange size={28} />} title="Noch keine Zimmer angelegt">
            Legen Sie unter <a href="/dashboard/raten" className="underline">Raten &amp; Zimmer</a> Ihre Zimmernummern an.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <div style={{ width: 120 + SPAN * DAY_W }} className="text-sm">
              {/* Kopfzeile */}
              <div className="flex sticky top-0 z-10 bg-white border-b border-slate-200">
                <div className="w-[120px] shrink-0 sticky left-0 bg-white z-20 px-3 py-2 text-xs font-medium text-slate-500 border-r border-slate-200">Zimmer</div>
                {days.map((d) => {
                  const dt = parseISODate(d);
                  const weekend = dt.getDay() === 0 || dt.getDay() === 6;
                  return (
                    <div key={d} style={{ width: DAY_W }} className={`shrink-0 text-center py-1.5 border-r border-slate-100 ${d === today ? 'bg-emerald-50' : weekend ? 'bg-slate-50' : ''}`}>
                      <div className="text-[10px] uppercase text-slate-500">{dt.toLocaleDateString('de-DE', { weekday: 'short' })}</div>
                      <div className={`text-sm tabular-nums ${d === today ? 'font-bold text-emerald-800' : 'text-slate-700'}`}>{dt.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {grouped.map(({ type, rooms: rs }) => (
                <React.Fragment key={type.id}>
                  <div className="flex bg-slate-50 border-b border-slate-200">
                    <div className="sticky left-0 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 whitespace-nowrap">{type.name}</div>
                  </div>
                  {rs.map((room) => {
                    const rb = bookings.filter((b) => b.room_id === room.id);
                    return (
                      <div key={room.id} className="flex border-b border-slate-100 relative h-11">
                        <div className="w-[120px] shrink-0 sticky left-0 z-[5] bg-white px-3 flex items-center gap-2 border-r border-slate-200">
                          <span className={`h-2 w-2 rounded-full ${HK_DOT[room.housekeeping_status]}`} title={HK_LABEL[room.housekeeping_status]} />
                          <span className="font-semibold tabular-nums text-slate-800">{room.number}</span>
                          {room.housekeeping_status === 'out_of_service' && <span className="text-[10px] text-slate-500">gesperrt</span>}
                        </div>
                        {days.map((d) => (
                          <button
                            key={d}
                            aria-label={`Neue Buchung ${room.number} ab ${formatDateDE(d)}`}
                            onClick={() => setNewPreset({ checkIn: d, roomId: room.id })}
                            style={{ width: DAY_W }}
                            className={`shrink-0 border-r border-slate-100 hover:bg-emerald-50/60 ${d === today ? 'bg-emerald-50/40' : ''} ${room.housekeeping_status === 'out_of_service' ? 'bg-[repeating-linear-gradient(135deg,#f1f5f9_0_6px,#e2e8f0_6px_7px)]' : ''}`}
                          />
                        ))}
                        {rb.map((b) => {
                          const s = b.check_in < start ? start : b.check_in;
                          const e = b.check_out > end ? end : b.check_out;
                          const left = 120 + nightsBetween(start, s) * DAY_W + (b.check_in < start ? 0 : DAY_W / 2);
                          const right = 120 + nightsBetween(start, e) * DAY_W + (b.check_out > end ? 0 : DAY_W / 2);
                          const st = stayState(b);
                          return (
                            <button
                              key={b.id}
                              onClick={() => setDrawerId(b.id)}
                              style={{ left, width: Math.max(right - left - 2, 18) }}
                              title={`${b.guests?.name} · ${formatDateDE(b.check_in)}–${formatDateDE(b.check_out)} · ${st.label}`}
                              className={`absolute top-1.5 bottom-1.5 rounded-md px-2 text-xs font-medium text-left truncate shadow-sm transition-colors ${BAR_TONE[st.tone]}`}
                            >
                              {b.guests?.name ?? 'Gast'}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Belegung je Nacht */}
              <div className="flex bg-slate-50">
                <div className="w-[120px] shrink-0 sticky left-0 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 border-r border-slate-200">Belegung</div>
                {occupancy.map((n, i) => {
                  const pct = totalRooms ? Math.round((n / totalRooms) * 100) : 0;
                  return (
                    <div key={days[i]} style={{ width: DAY_W }} className="shrink-0 text-center py-2 border-r border-slate-100">
                      <span className={`text-xs tabular-nums font-semibold ${pct >= 90 ? 'text-red-700' : pct >= 60 ? 'text-amber-700' : 'text-slate-600'}`}>{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600 shrink-0">
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-sky-600" /> Erwartet</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-emerald-600" /> Im Haus</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-amber-400" /> Ausstehend</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-5 rounded bg-slate-400" /> Abgereist</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500" /> Zimmer zu reinigen</span>
        <span>Leere Zelle anklicken, um eine Buchung anzulegen.</span>
      </div>

      <BookingDrawer bookingId={drawerId} onClose={() => setDrawerId(null)} onChanged={load} />
      <NewBookingDrawer open={!!newPreset} preset={newPreset ?? undefined} onClose={() => setNewPreset(null)}
        onCreated={(id) => { setNewPreset(null); load(); setDrawerId(id); }} />
    </div>
  );
}
