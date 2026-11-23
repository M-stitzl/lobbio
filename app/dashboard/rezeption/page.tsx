'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, DoorOpen, LogIn, LogOut, Plus, BedDouble, Star } from 'lucide-react';
import { fetchBookingsInRange, fetchRoomsAndTypes, useRealtimeRefresh, personsLabel, type PmsBooking, type Room } from '@/lib/pms/client';
import { addDays, formatDateDE, nightsBetween, toISODate } from '@/lib/pms/stay';
import { Button, Chip, EmptyState, PageHeader, Panel, SkeletonRows } from '@/components/pms/ui';
import BookingDrawer from '@/components/pms/BookingDrawer';
import NewBookingDrawer from '@/components/pms/NewBookingDrawer';

type DrawerState = { id: string; tab: 'stay' | 'meldeschein' | 'folio' } | null;

export default function RezeptionPage() {
  const realToday = useMemo(() => toISODate(new Date()), []);
  const [day, setDay] = useState(realToday);
  const [bookings, setBookings] = useState<PmsBooking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [newOpen, setNewOpen] = useState(false);

  const load = useCallback(() =>
    Promise.all([fetchBookingsInRange(addDays(day, -30), addDays(day, 1)), fetchRoomsAndTypes()])
      .then(([b, r]) => { setBookings(b); setRooms(r.rooms); setLoading(false); })
      .catch(() => setLoading(false)), [day]);

  useEffect(() => { load(); }, [load]);

  useRealtimeRefresh(['bookings'], load);

  const roomNo = (id: string | null) => rooms.find((r) => r.id === id)?.number ?? null;
  const roomOf = (id: string | null) => rooms.find((r) => r.id === id) ?? null;

  const arrivals = bookings.filter((b) => b.check_in === day && !b.checked_in_at);
  const departures = bookings.filter((b) => b.check_out === day && b.checked_in_at && !b.checked_out_at);
  const inHouse = bookings.filter((b) => b.checked_in_at && !b.checked_out_at && b.check_out !== day);
  const doneToday = bookings.filter((b) => (b.check_in === day && b.checked_in_at) || (b.check_out === day && b.checked_out_at)).length;
  const overdue = day === realToday ? bookings.filter((b) => b.checked_in_at && !b.checked_out_at && b.check_out < day) : [];

  const isToday = day === realToday;

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto pb-6 pr-1">
      <PageHeader
        title="Rezeption"
        description={`${formatDateDE(day, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}${isToday ? ' · heute' : ''}`}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white">
              <button aria-label="Vorheriger Tag" onClick={() => setDay(addDays(day, -1))} className="p-2 text-slate-600 hover:bg-slate-50 rounded-l-lg"><ChevronLeft size={18} /></button>
              <button onClick={() => setDay(realToday)} disabled={isToday} className="px-3 py-2 text-sm font-medium text-slate-700 disabled:text-slate-400 border-x border-slate-200">Heute</button>
              <button aria-label="Nächster Tag" onClick={() => setDay(addDays(day, 1))} className="p-2 text-slate-600 hover:bg-slate-50 rounded-r-lg"><ChevronRight size={18} /></button>
            </div>
            <Button variant="primary" onClick={() => setNewOpen(true)}><Plus size={16} /> Neue Buchung</Button>
          </>
        }
      />

      <p className="text-sm text-slate-600 shrink-0">
        <strong className="text-slate-800">{arrivals.length}</strong> Anreisen offen · <strong className="text-slate-800">{departures.length}</strong> Abreisen offen · <strong className="text-slate-800">{inHouse.length + departures.length}</strong> Zimmer belegt · {doneToday} heute erledigt
      </p>

      {overdue.length > 0 && (
        <div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shrink-0">
          <strong>{overdue.length} {overdue.length === 1 ? 'Gast ist' : 'Gäste sind'} noch eingecheckt, obwohl die Abreise vorbei ist:</strong>{' '}
          {overdue.map((b, i) => (
            <React.Fragment key={b.id}>{i > 0 && ', '}<button className="underline underline-offset-2 font-medium" onClick={() => setDrawer({ id: b.id, tab: 'folio' })}>{b.guests?.name}</button></React.Fragment>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2 shrink-0">
        <Panel title={<span className="inline-flex items-center gap-2"><LogIn size={18} className="text-emerald-700" /> Anreisen</span>} actions={<span className="text-sm text-slate-500 tabular-nums">{arrivals.length}</span>}>
          {loading ? <SkeletonRows rows={3} /> : arrivals.length === 0 ? (
            <EmptyState icon={<DoorOpen size={28} />} title={isToday ? 'Alle Gäste sind angekommen' : 'Keine Anreisen an diesem Tag'} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {arrivals.map((b) => (
                <GuestRow key={b.id} b={b} room={roomNo(b.room_id)} onOpen={(tab) => setDrawer({ id: b.id, tab })}
                  action={!b.room_id
                    ? <Button size="sm" onClick={() => setDrawer({ id: b.id, tab: 'stay' })}>Zimmer zuweisen</Button>
                    : <Button size="sm" variant="primary" onClick={() => setDrawer({ id: b.id, tab: 'meldeschein' })}>Check-in</Button>}
                  hint={roomOf(b.room_id) && roomOf(b.room_id)!.housekeeping_status === 'dirty' ? <Chip tone="amber">Zimmer noch nicht gereinigt</Chip> : null}
                />
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={<span className="inline-flex items-center gap-2"><LogOut size={18} className="text-sky-700" /> Abreisen</span>} actions={<span className="text-sm text-slate-500 tabular-nums">{departures.length}</span>}>
          {loading ? <SkeletonRows rows={3} /> : departures.length === 0 ? (
            <EmptyState icon={<DoorOpen size={28} />} title={isToday ? 'Keine offenen Abreisen' : 'Keine Abreisen an diesem Tag'} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {departures.map((b) => (
                <GuestRow key={b.id} b={b} room={roomNo(b.room_id)} onOpen={(tab) => setDrawer({ id: b.id, tab })}
                  action={<Button size="sm" variant="primary" onClick={() => setDrawer({ id: b.id, tab: 'folio' })}>Abrechnen</Button>} />
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title={<span className="inline-flex items-center gap-2"><BedDouble size={18} className="text-slate-500" /> Im Haus</span>} actions={<span className="text-sm text-slate-500 tabular-nums">{inHouse.length}</span>} className="shrink-0">
        {loading ? <SkeletonRows rows={2} /> : inHouse.length === 0 ? (
          <EmptyState icon={<BedDouble size={28} />} title="Gerade keine Gäste im Haus" />
        ) : (
          <ul className="divide-y divide-slate-100">
            {inHouse.map((b) => (
              <GuestRow key={b.id} b={b} room={roomNo(b.room_id)} onOpen={(tab) => setDrawer({ id: b.id, tab })}
                hint={<span className="text-xs text-slate-500">Abreise {formatDateDE(b.check_out, { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>}
                action={<Button size="sm" onClick={() => setDrawer({ id: b.id, tab: 'folio' })}>Leistung buchen</Button>} />
            ))}
          </ul>
        )}
      </Panel>

      <BookingDrawer bookingId={drawer?.id ?? null} initialTab={drawer?.tab} onClose={() => setDrawer(null)} onChanged={load} />
      <NewBookingDrawer open={newOpen} onClose={() => setNewOpen(false)} preset={{ checkIn: day }}
        onCreated={(id) => { setNewOpen(false); load(); setDrawer({ id, tab: 'stay' }); }} />
    </div>
  );
}

function GuestRow({ b, room, action, hint, onOpen }: {
  b: PmsBooking; room: string | null; action?: React.ReactNode; hint?: React.ReactNode; onOpen: (tab: 'stay' | 'meldeschein' | 'folio') => void;
}) {
  return (
    <li className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
      <div className={`w-14 shrink-0 rounded-md text-center py-1.5 text-sm font-bold tabular-nums ${room ? 'bg-slate-100 text-slate-800' : 'border border-dashed border-slate-300 text-slate-400 font-medium text-xs'}`}>
        {room ?? 'offen'}
      </div>
      <button onClick={() => onOpen('stay')} className="min-w-0 flex-1 text-left">
        <p className="text-sm font-semibold text-slate-800 truncate flex items-center gap-1.5">
          {b.guests?.name ?? 'Gast'}
          {b.guests?.vip_notes && <Star size={13} className="text-amber-500 shrink-0" aria-label="Stammgast/VIP" />}
        </p>
        <p className="text-xs text-slate-500 truncate">
          {b.room_type} · {nightsBetween(b.check_in, b.check_out)} N. · {personsLabel(b)}{b.source === 'portal' ? ' · Online' : ''}
        </p>
        {hint && <div className="mt-1">{hint}</div>}
      </button>
      {action}
    </li>
  );
}
