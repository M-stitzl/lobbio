'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchBookingsInRange, fetchHotelSettings, fetchRateCatalog, fetchRoomsAndTypes,
  type HotelSettings, type PmsBooking, type RatePlan, type Room, type RoomType,
} from '@/lib/pms/client';
import { addDays, availabilityFor, eur, isValidISODate, nightsBetween, quoteStay, toISODate, type SeasonRow } from '@/lib/pms/stay';
import { Button, Drawer, Field, Notice, inputClass } from './ui';

type Source = 'phone' | 'walk_in' | 'email' | 'ota' | 'manual';

export default function NewBookingDrawer({ open, onClose, onCreated, preset }: {
  open: boolean;
  onClose: () => void;
  onCreated: (bookingId: string) => void;
  preset?: { checkIn?: string; roomId?: string };
}) {
  const today = toISODate(new Date());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [hotel, setHotel] = useState<HotelSettings | null>(null);
  const [bookings, setBookings] = useState<PmsBooking[]>([]);

  const [f, setF] = useState({
    name: '', email: '', phone: '', checkIn: today, checkOut: addDays(today, 1), adults: 2, childrenAges: '' as string,
    roomTypeId: '', roomId: '', ratePlanId: '', source: 'phone' as Source, notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [rt, cat, h] = await Promise.all([fetchRoomsAndTypes(), fetchRateCatalog(), fetchHotelSettings()]);
      setRooms(rt.rooms); setRoomTypes(rt.roomTypes); setRatePlans(cat.ratePlans.filter((p) => p.active)); setSeasons(cat.seasons); setHotel(h);
      const presetRoom = rt.rooms.find((r) => r.id === preset?.roomId);
      const checkIn = preset?.checkIn && preset.checkIn >= today ? preset.checkIn : today;
      setF((prev) => ({
        ...prev,
        checkIn,
        checkOut: addDays(checkIn, 1),
        roomTypeId: presetRoom?.room_type_id ?? rt.roomTypes[0]?.id ?? '',
        roomId: presetRoom?.id ?? '',
        ratePlanId: cat.ratePlans[0]?.id ?? '',
      }));
      setError(null);
    })();
  }, [open, preset?.checkIn, preset?.roomId, today]);

  const datesOk = isValidISODate(f.checkIn) && isValidISODate(f.checkOut) && f.checkOut > f.checkIn;
  useEffect(() => {
    if (!open || !datesOk) return;
    fetchBookingsInRange(f.checkIn, f.checkOut).then(setBookings);
  }, [open, datesOk, f.checkIn, f.checkOut]);

  const agesKey = f.childrenAges;
  const ages = useMemo(() => agesKey.split(',').map((s) => s.trim()).filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < 18), [agesKey]);
  const roomType = roomTypes.find((t) => t.id === f.roomTypeId) ?? null;
  const ratePlan = ratePlans.find((p) => p.id === f.ratePlanId) ?? null;

  const free = roomType && datesOk ? availabilityFor(roomType, bookings, f.checkIn, f.checkOut).minFree : null;
  const quote = useMemo(() => (roomType && hotel && datesOk
    ? quoteStay({ roomType, ratePlan, seasons, checkIn: f.checkIn, checkOut: f.checkOut, adults: f.adults, childrenAges: ages, tax: hotel })
    : null), [roomType, ratePlan, seasons, f.checkIn, f.checkOut, f.adults, ages, hotel, datesOk]);

  const busyRooms = new Set(bookings.filter((b) => b.room_id && b.check_in < f.checkOut && b.check_out > f.checkIn).map((b) => b.room_id!));
  const roomsOfType = rooms.filter((r) => r.room_type_id === f.roomTypeId);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { setError('Bitte den Namen des Gastes angeben.'); return; }
    if (!datesOk) { setError('Die Abreise muss nach der Anreise liegen.'); return; }
    if (!roomType) { setError('Bitte einen Zimmertyp wählen.'); return; }
    if (roomType.max_guests != null && f.adults + ages.length > roomType.max_guests) { setError(`${roomType.name} ist für höchstens ${roomType.max_guests} Personen.`); return; }
    setSaving(true); setError(null);
    try {
      const hotelId = (await supabase.auth.getUser()).data.user?.id;
      if (!hotelId) throw new Error('Nicht angemeldet.');

      let guestId: string | null = null;
      if (f.email.trim()) {
        const { data } = await supabase.from('guests').select('id').ilike('email', f.email.trim()).limit(1).maybeSingle();
        guestId = data?.id ?? null;
      }
      if (!guestId) {
        const { data, error: gErr } = await supabase.from('guests')
          .insert({ hotel_id: hotelId, name: f.name.trim(), email: f.email.trim() || null, phone: f.phone.trim() || null })
          .select('id').single();
        if (gErr || !data) throw new Error('Gast konnte nicht angelegt werden.');
        guestId = data.id;
      }

      const { data: booking, error: bErr } = await supabase.from('bookings').insert({
        hotel_id: hotelId, guest_id: guestId, check_in: f.checkIn, check_out: f.checkOut,
        room_type: roomType.name, room_type_id: roomType.id, room_id: f.roomId || null, rate_plan_id: ratePlan?.id ?? null,
        adults: f.adults, children: ages.length, children_ages: ages, total_price: quote?.grandTotal ?? null,
        status: 'confirmed', source: f.source, notes: f.notes.trim() || null,
      }).select('id').single();
      if (bErr || !booking) throw new Error('Buchung konnte nicht gespeichert werden.');

      if (quote) {
        await supabase.from('folio_items').insert(quote.lines.map((l) => ({
          hotel_id: hotelId, booking_id: booking.id, service_date: l.service_date ?? f.checkIn, category: l.category,
          description: l.description, quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.vat_rate,
        })));
      }
      onCreated(booking.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Buchung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title="Neue Buchung"
      footer={<><Button onClick={onClose}>Abbrechen</Button><Button variant="primary" loading={saving} onClick={save}>Buchung anlegen{quote ? ` · ${eur(quote.grandTotal)}` : ''}</Button></>}>
      <form onSubmit={save} className="space-y-4">
        {error && <Notice tone="error">{error}</Notice>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name des Gastes *" className="col-span-2"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
          <Field label="E-Mail" hint="Bestehende Gäste werden darüber erkannt."><input type="email" className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Telefon"><input type="tel" className={inputClass} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="Anreise"><input type="date" className={inputClass} value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value, checkOut: e.target.value >= f.checkOut ? addDays(e.target.value, 1) : f.checkOut })} /></Field>
          <Field label={datesOk ? `Abreise · ${nightsBetween(f.checkIn, f.checkOut)} Nächte` : 'Abreise'}><input type="date" min={addDays(f.checkIn, 1)} className={inputClass} value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
          <Field label="Erwachsene"><input type="number" min={1} max={10} className={inputClass} value={f.adults} onChange={(e) => setF({ ...f, adults: Math.max(1, Number(e.target.value)) })} /></Field>
          <Field label="Alter der Kinder" hint="Kommagetrennt, z. B. 6, 12"><input className={inputClass} value={f.childrenAges} onChange={(e) => setF({ ...f, childrenAges: e.target.value })} /></Field>
          <Field label="Zimmertyp" error={free === 0 ? 'Im Zeitraum ausgebucht – nur mit Überbuchung möglich.' : null}
            hint={free != null && free > 0 ? `${free} von ${roomType?.total_count} frei` : undefined}>
            <select className={inputClass} value={f.roomTypeId} onChange={(e) => setF({ ...f, roomTypeId: e.target.value, roomId: '' })}>
              {roomTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Zimmer">
            <select className={inputClass} value={f.roomId} onChange={(e) => setF({ ...f, roomId: e.target.value })}>
              <option value="">Später zuweisen</option>
              {roomsOfType.map((r) => <option key={r.id} value={r.id} disabled={busyRooms.has(r.id) || r.housekeeping_status === 'out_of_service'}>{r.number}{busyRooms.has(r.id) ? ' – belegt' : ''}</option>)}
            </select>
          </Field>
          <Field label="Rate">
            <select className={inputClass} value={f.ratePlanId} onChange={(e) => setF({ ...f, ratePlanId: e.target.value })}>
              <option value="">Ohne Rate (nur Zimmer)</option>
              {ratePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Buchungsweg">
            <select className={inputClass} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as Source })}>
              <option value="phone">Telefon</option><option value="walk_in">Walk-in</option><option value="email">E-Mail</option><option value="ota">Buchungsportal (OTA)</option><option value="manual">Sonstiges</option>
            </select>
          </Field>
          <Field label="Interne Notiz" className="col-span-2"><textarea rows={2} className={inputClass} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
        </div>

        {quote ? (
          <div className="rounded-lg border border-slate-200 text-sm">
            <table className="w-full tabular-nums">
              <tbody className="divide-y divide-slate-100">
                {quote.lines.map((l, i) => (
                  <tr key={i}><td className="px-3 py-1.5 text-slate-600">{l.description}{l.category === 'lodging' ? ` (${l.quantity} × ${eur(l.unit_price)})` : ''}</td><td className="px-3 py-1.5 text-right">{eur(l.total)}</td></tr>
                ))}
                <tr className="font-semibold"><td className="px-3 py-2">Gesamt</td><td className="px-3 py-2 text-right">{eur(quote.grandTotal)}</td></tr>
              </tbody>
            </table>
          </div>
        ) : roomType && roomType.base_price == null ? (
          <Notice tone="info">Für {roomType.name} ist noch kein Preis hinterlegt (Raten & Preise). Die Buchung wird ohne Preis angelegt.</Notice>
        ) : null}
      </form>
    </Drawer>
  );
}
