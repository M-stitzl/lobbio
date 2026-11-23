'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  BOOKING_SELECT, HK_LABEL, SOURCE_LABEL, authHeader, fetchBookingsInRange, fetchHotelSettings, fetchRateCatalog, fetchRoomsAndTypes, personsLabel,
  type HotelSettings, type PmsBooking, type Room, type RoomType,
} from '@/lib/pms/client';
import { eur, formatDateDE, nightsBetween, quoteStay, toISODate, vatSummary } from '@/lib/pms/stay';
import { Button, Chip, Drawer, Field, Notice, inputClass } from './ui';
import { FileText, LogIn, LogOut, Trash2 } from 'lucide-react';

type Tab = 'stay' | 'meldeschein' | 'folio';

type FolioItem = { id: string; service_date: string; category: string; description: string; quantity: number; unit_price: number; vat_rate: number; invoice_id: string | null };
type Payment = { id: string; amount: number; method: 'cash' | 'card' | 'transfer' | 'other'; note: string | null; paid_at: string };
type Invoice = { id: string; number: string; issued_at: string; total_gross: number };
type Registration = {
  id?: string; first_name: string; last_name: string; birth_date: string; nationality: string; street: string; postal_code: string;
  city: string; country: string; id_document_number: string | null; co_traveller_count: number; co_travellers: { name: string; birth_date: string; nationality: string }[];
  signed_name: string;
};

const PAYMENT_LABEL: Record<Payment['method'], string> = { cash: 'Bar', card: 'Karte', transfer: 'Überweisung', other: 'Sonstiges' };
const CATEGORY_OPTIONS = [
  { value: 'food_beverage', label: 'Speisen & Getränke' },
  { value: 'extra', label: 'Sonstige Leistung' },
  { value: 'breakfast', label: 'Frühstück' },
  { value: 'lodging', label: 'Übernachtung' },
  { value: 'tourist_tax', label: 'Kurtaxe' },
];

async function loadBookingBundle(bookingId: string) {
  const { data, error } = await supabase.from('bookings').select(BOOKING_SELECT).eq('id', bookingId).single();
  if (error || !data) return null;
  const b = data as unknown as PmsBooking;
  const [rt, overlapping, h, f, p, inv, reg] = await Promise.all([
    fetchRoomsAndTypes(),
    fetchBookingsInRange(b.check_in, b.check_out),
    fetchHotelSettings(),
    supabase.from('folio_items').select('*').eq('booking_id', bookingId).order('service_date'),
    supabase.from('payments').select('*').eq('booking_id', bookingId).order('paid_at'),
    supabase.from('invoices').select('id, number, issued_at, total_gross').eq('booking_id', bookingId).order('created_at'),
    supabase.from('registration_forms').select('*').eq('booking_id', bookingId).maybeSingle(),
  ]);
  return { b, rt, overlapping, h, f, p, inv, reg };
}

export function stayState(b: Pick<PmsBooking, 'checked_in_at' | 'checked_out_at' | 'status'>): { label: string; tone: 'slate' | 'emerald' | 'amber' | 'red' | 'sky' } {
  if (b.status === 'cancelled') return { label: 'Storniert', tone: 'red' };
  if (b.checked_out_at) return { label: 'Abgereist', tone: 'slate' };
  if (b.checked_in_at) return { label: 'Im Haus', tone: 'emerald' };
  if (b.status === 'pending') return { label: 'Ausstehend', tone: 'amber' };
  return { label: 'Erwartet', tone: 'sky' };
}

export default function BookingDrawer({ bookingId, initialTab = 'stay', onClose, onChanged }: {
  bookingId: string | null; initialTab?: Tab; onClose: () => void; onChanged?: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [booking, setBooking] = useState<PmsBooking | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [busyRoomIds, setBusyRoomIds] = useState<Set<string>>(new Set());
  const [hotel, setHotel] = useState<HotelSettings | null>(null);
  const [folio, setFolio] = useState<FolioItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Beim Wechsel der Buchung bzw. des Start-Tabs zurücksetzen (während des
  // Renderns statt per Effekt, siehe React-Doku "Adjusting state on prop change").
  const resetKey = `${bookingId}|${initialTab}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setTab(initialTab);
    if (prevKey.split('|')[0] !== bookingId) { setBooking(null); setInfo(null); setError(null); }
  }

  const load = useCallback(() => {
    if (!bookingId) return Promise.resolve();
    return loadBookingBundle(bookingId).then((res) => {
      if (!res) { setError('Buchung konnte nicht geladen werden.'); return; }
      const { b, rt, overlapping, h, f, p, inv, reg } = res;
      setBooking(b);
      setRooms(rt.rooms);
      setRoomTypes(rt.roomTypes);
      setBusyRoomIds(new Set(overlapping.filter((o) => o.id !== b.id && o.room_id && o.check_in < b.check_out && o.check_out > b.check_in).map((o) => o.room_id!)));
      setHotel(h);
      setFolio(((f.data ?? []) as FolioItem[]).map((i) => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), vat_rate: Number(i.vat_rate) })));
      setPayments(((p.data ?? []) as Payment[]).map((x) => ({ ...x, amount: Number(x.amount) })));
      setInvoices(((inv.data ?? []) as Invoice[]).map((x) => ({ ...x, total_gross: Number(x.total_gross) })));
      setRegistration((reg.data as Registration | null) ?? null);
    }).catch(() => setError('Buchung konnte nicht geladen werden.'));
  }, [bookingId]);

  useEffect(() => { load(); }, [load]);

  const changed = useCallback(async (msg?: string) => {
    await load();
    onChanged?.();
    if (msg) setInfo(msg);
  }, [load, onChanged]);

  const totals = useMemo(() => {
    const charged = Math.round(folio.reduce((s, i) => s + i.quantity * i.unit_price, 0) * 100) / 100;
    const paid = Math.round(payments.reduce((s, p) => s + p.amount, 0) * 100) / 100;
    return { charged, paid, open: Math.round((charged - paid) * 100) / 100 };
  }, [folio, payments]);

  if (!bookingId) return null;
  const today = toISODate(new Date());
  const state = booking ? stayState(booking) : null;

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setError(null); setInfo(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Aktion fehlgeschlagen.'); } finally { setBusy(null); }
  }

  const checkIn = () => run('checkin', async () => {
    if (!booking) return;
    const { error: e } = await supabase.from('bookings').update({ checked_in_at: new Date().toISOString(), status: 'confirmed' }).eq('id', booking.id);
    if (e) throw new Error('Check-in konnte nicht gespeichert werden.');
    await changed(`${booking.guests?.name ?? 'Gast'} ist eingecheckt.`);
  });

  const checkOut = () => run('checkout', async () => {
    if (!booking) return;
    const { error: e } = await supabase.from('bookings').update({ checked_out_at: new Date().toISOString() }).eq('id', booking.id);
    if (e) throw new Error('Check-out konnte nicht gespeichert werden.');
    if (booking.room_id) {
      await supabase.from('rooms').update({ housekeeping_status: 'dirty', housekeeping_updated_at: new Date().toISOString() }).eq('id', booking.room_id);
    }
    await changed('Ausgecheckt. Das Zimmer steht jetzt auf „Zu reinigen“.');
  });

  const footer = booking && state && (
    <>
      {!booking.checked_in_at && booking.status !== 'cancelled' && (
        <Button
          variant="primary"
          loading={busy === 'checkin'}
          disabled={!booking.room_id || !registration || booking.check_in > today}
          onClick={checkIn}
          title={!booking.room_id ? 'Zuerst ein Zimmer zuweisen' : !registration ? 'Zuerst den Meldeschein erfassen' : booking.check_in > today ? 'Anreise liegt in der Zukunft' : undefined}
        >
          <LogIn size={16} /> Einchecken
        </Button>
      )}
      {booking.checked_in_at && !booking.checked_out_at && (
        <Button variant="primary" loading={busy === 'checkout'} onClick={checkOut}>
          <LogOut size={16} /> Auschecken{totals.open > 0.004 ? ` (offen: ${eur(totals.open)})` : ''}
        </Button>
      )}
    </>
  );

  const checkInBlockers = booking && !booking.checked_in_at && booking.status !== 'cancelled'
    ? [!booking.room_id && 'Zimmer zuweisen', !registration && 'Meldeschein erfassen'].filter(Boolean) as string[]
    : [];

  return (
    <Drawer
      open={!!bookingId}
      onClose={onClose}
      footer={footer}
      title={booking ? (
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate">{booking.guests?.name ?? 'Gast'}</span>
            {state && <Chip tone={state.tone}>{state.label}</Chip>}
          </div>
          <p className="text-sm font-normal text-slate-500 mt-0.5">
            {formatDateDE(booking.check_in)} – {formatDateDE(booking.check_out)} · {nightsBetween(booking.check_in, booking.check_out)} N. · {personsLabel(booking)}
            {booking.booking_code && <> · <span className="tabular-nums">{booking.booking_code}</span></>}
          </p>
        </div>
      ) : 'Buchung'}
    >
      {!booking ? (
        error ? <Notice tone="error">{error}</Notice> : <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 rounded bg-slate-100 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-4">
          <div role="tablist" className="flex gap-1 border-b border-slate-200 -mx-5 px-5">
            {([['stay', 'Aufenthalt'], ['meldeschein', registration ? 'Meldeschein · erfasst' : 'Meldeschein'], ['folio', 'Folio & Rechnung']] as [Tab, string][]).map(([t, l]) => (
              <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-emerald-700 text-emerald-800' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {l}
              </button>
            ))}
          </div>
          {error && <Notice tone="error">{error}</Notice>}
          {info && <Notice tone="success">{info}</Notice>}
          {checkInBlockers.length > 0 && booking.check_in <= today && (
            <Notice tone="info">Vor dem Check-in noch: {checkInBlockers.join(' und ')}.</Notice>
          )}

          {tab === 'stay' && (
            <StayTab key={`${booking.room_id}|${booking.status}|${booking.notes}`} booking={booking} rooms={rooms} roomTypes={roomTypes} busyRoomIds={busyRoomIds} onSaved={changed} setError={setError} />
          )}
          {tab === 'meldeschein' && (
            <RegistrationTab booking={booking} existing={registration} onSaved={() => changed('Meldeschein gespeichert.')} setError={setError} />
          )}
          {tab === 'folio' && hotel && (
            <FolioTab booking={booking} hotel={hotel} folio={folio} payments={payments} invoices={invoices} totals={totals} onChanged={changed} setError={setError} />
          )}
        </div>
      )}
    </Drawer>
  );
}

// ---------------------------------------------------------------------
function StayTab({ booking, rooms, roomTypes, busyRoomIds, onSaved, setError }: {
  booking: PmsBooking; rooms: Room[]; roomTypes: RoomType[]; busyRoomIds: Set<string>;
  onSaved: (msg?: string) => Promise<void>; setError: (e: string | null) => void;
}) {
  const [roomId, setRoomId] = useState(booking.room_id ?? '');
  const [notes, setNotes] = useState(booking.notes ?? '');
  const [status, setStatus] = useState(booking.status);
  const [saving, setSaving] = useState(false);

  const typeId = booking.room_type_id ?? roomTypes.find((t) => t.name === booking.room_type)?.id ?? null;
  const sorted = [...rooms].sort((a, b) => Number(b.room_type_id === typeId) - Number(a.room_type_id === typeId) || a.sort_order - b.sort_order);
  const dirty = roomId !== (booking.room_id ?? '') || notes !== (booking.notes ?? '') || status !== booking.status;

  async function save() {
    setSaving(true); setError(null);
    const room = rooms.find((r) => r.id === roomId);
    const patch: Record<string, unknown> = { room_id: roomId || null, notes: notes || null, status };
    if (room && room.room_type_id !== booking.room_type_id) {
      const t = roomTypes.find((x) => x.id === room.room_type_id);
      patch.room_type_id = room.room_type_id;
      if (t) patch.room_type = t.name;
    }
    const { error } = await supabase.from('bookings').update(patch).eq('id', booking.id);
    setSaving(false);
    if (error) setError('Änderungen konnten nicht gespeichert werden.');
    else await onSaved('Gespeichert.');
  }

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div><dt className="text-slate-500">Zimmertyp</dt><dd className="font-medium text-slate-800">{booking.room_type}</dd></div>
        <div><dt className="text-slate-500">Quelle</dt><dd className="font-medium text-slate-800">{SOURCE_LABEL[booking.source]}</dd></div>
        <div><dt className="text-slate-500">E-Mail</dt><dd className="font-medium text-slate-800 break-all">{booking.guests?.email ?? '–'}</dd></div>
        <div><dt className="text-slate-500">Telefon</dt><dd className="font-medium text-slate-800">{booking.guests?.phone ?? '–'}</dd></div>
        {booking.total_price != null && <div><dt className="text-slate-500">Buchungswert</dt><dd className="font-medium text-slate-800 tabular-nums">{eur(Number(booking.total_price))}</dd></div>}
        {booking.guests?.vip_notes && <div className="col-span-2"><dt className="text-slate-500">Gästenotiz</dt><dd className="text-slate-800">{booking.guests.vip_notes}</dd></div>}
        {booking.guest_message && <div className="col-span-2"><dt className="text-slate-500">Nachricht bei Buchung</dt><dd className="text-slate-800 whitespace-pre-line">{booking.guest_message}</dd></div>}
      </dl>

      <Field label="Zimmer" hint={booking.checked_in_at ? 'Zimmerwechsel während des Aufenthalts: hier umbuchen.' : 'Belegte Zimmer im Zeitraum sind nicht wählbar.'}>
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
          <option value="">Noch nicht zugewiesen</option>
          {sorted.map((r) => {
            const t = roomTypes.find((x) => x.id === r.room_type_id);
            const taken = busyRoomIds.has(r.id);
            return (
              <option key={r.id} value={r.id} disabled={taken || r.housekeeping_status === 'out_of_service'}>
                {r.number} · {t?.name ?? ''}{r.room_type_id !== typeId ? ' (anderer Typ)' : ''}{taken ? ' – belegt' : ''} · {HK_LABEL[r.housekeeping_status]}
              </option>
            );
          })}
        </select>
      </Field>

      <Field label="Status">
        <select value={status} onChange={(e) => setStatus(e.target.value as PmsBooking['status'])} className={inputClass} disabled={!!booking.checked_in_at}>
          <option value="confirmed">Bestätigt</option>
          <option value="pending">Ausstehend</option>
          <option value="cancelled">Storniert</option>
        </select>
      </Field>

      <Field label="Interne Notizen" hint="Nur für Ihr Team sichtbar.">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
      </Field>

      <div className="flex justify-end">
        <Button variant="primary" disabled={!dirty} loading={saving} onClick={save}>Speichern</Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Meldeschein nach §§ 29, 30 BMG
// ---------------------------------------------------------------------
function RegistrationTab({ booking, existing, onSaved, setError }: {
  booking: PmsBooking; existing: Registration | null; onSaved: () => void; setError: (e: string | null) => void;
}) {
  const [first, ...rest] = (booking.guests?.name ?? '').split(' ');
  const initial: Registration = existing ?? {
    first_name: first ?? '', last_name: rest.join(' '), birth_date: '', nationality: 'deutsch',
    street: booking.guests?.street ?? '', postal_code: booking.guests?.postal_code ?? '', city: booking.guests?.city ?? '',
    country: booking.guests?.country === 'DE' || !booking.guests?.country ? 'Deutschland' : booking.guests.country,
    id_document_number: '', co_traveller_count: Math.max(0, booking.adults + booking.children - 1), co_travellers: [], signed_name: '',
  };
  const [r, setR] = useState<Registration>(initial);
  const [saving, setSaving] = useState(false);
  const foreign = r.nationality.trim().toLowerCase() !== 'deutsch' && r.nationality.trim() !== '';
  const set = <K extends keyof Registration>(k: K, v: Registration[K]) => setR({ ...r, [k]: v });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!r.first_name || !r.last_name || !r.birth_date || !r.street || !r.postal_code || !r.city || !r.country || !r.nationality) {
      setError('Bitte alle Pflichtfelder des Meldescheins ausfüllen.'); return;
    }
    if (foreign && !r.id_document_number) { setError('Bei ausländischen Gästen ist die Ausweis- bzw. Passnummer Pflicht.'); return; }
    if (!r.signed_name.trim()) { setError('Bitte den Namen des Gastes als Unterschrift eintragen.'); return; }
    setSaving(true); setError(null);
    const payload = {
      ...r,
      id_document_number: r.id_document_number || null,
      co_travellers: foreign ? r.co_travellers.filter((c) => c.name) : [],
      hotel_id: (await supabase.auth.getUser()).data.user?.id,
      booking_id: booking.id,
      arrival: booking.check_in,
      departure: booking.check_out,
    };
    const { error } = await supabase.from('registration_forms').upsert(payload, { onConflict: 'booking_id' });
    // Adresse auch am Gast für Rechnungen hinterlegen.
    await supabase.from('guests').update({ street: r.street, postal_code: r.postal_code, city: r.city }).eq('id', booking.guest_id);
    setSaving(false);
    if (error) setError('Meldeschein konnte nicht gespeichert werden.');
    else onSaved();
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-slate-600">Pflicht für jeden Gast ab Anreise (§ 29 BMG). Aufbewahrung 1 Jahr nach Abreise, danach wird der Schein gelöscht.</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vorname *"><input className={inputClass} value={r.first_name} onChange={(e) => set('first_name', e.target.value)} /></Field>
        <Field label="Familienname *"><input className={inputClass} value={r.last_name} onChange={(e) => set('last_name', e.target.value)} /></Field>
        <Field label="Geburtsdatum *"><input type="date" className={inputClass} value={r.birth_date} onChange={(e) => set('birth_date', e.target.value)} /></Field>
        <Field label="Staatsangehörigkeit *"><input className={inputClass} value={r.nationality} onChange={(e) => set('nationality', e.target.value)} list="nationalities" /></Field>
        <Field label="Straße, Hausnummer *" className="col-span-2"><input className={inputClass} value={r.street} onChange={(e) => set('street', e.target.value)} /></Field>
        <Field label="PLZ *"><input className={inputClass} value={r.postal_code} onChange={(e) => set('postal_code', e.target.value)} /></Field>
        <Field label="Ort *"><input className={inputClass} value={r.city} onChange={(e) => set('city', e.target.value)} /></Field>
        <Field label="Land *"><input className={inputClass} value={r.country} onChange={(e) => set('country', e.target.value)} /></Field>
        <Field label="Mitreisende (Anzahl)"><input type="number" min={0} className={inputClass} value={r.co_traveller_count} onChange={(e) => set('co_traveller_count', Number(e.target.value))} /></Field>
        {foreign && (
          <Field label="Ausweis-/Passnummer *" className="col-span-2" hint="Pflicht bei ausländischen Gästen (§ 30 Abs. 2 BMG).">
            <input className={inputClass} value={r.id_document_number ?? ''} onChange={(e) => set('id_document_number', e.target.value)} />
          </Field>
        )}
      </div>
      <datalist id="nationalities">
        {['deutsch', 'österreichisch', 'schweizerisch', 'italienisch', 'niederländisch', 'französisch', 'britisch', 'US-amerikanisch', 'polnisch', 'tschechisch', 'schwedisch', 'dänisch'].map((n) => <option key={n} value={n} />)}
      </datalist>

      {foreign && r.co_traveller_count > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Ausländische Mitreisende (je Name, Geburtsdatum, Staatsangehörigkeit)</p>
          {Array.from({ length: r.co_traveller_count }).map((_, i) => {
            const c = r.co_travellers[i] ?? { name: '', birth_date: '', nationality: r.nationality };
            const upd = (patch: Partial<typeof c>) => {
              const next = [...r.co_travellers];
              next[i] = { ...c, ...patch };
              set('co_travellers', next);
            };
            return (
              <div key={i} className="grid grid-cols-3 gap-2">
                <input aria-label={`Mitreisende ${i + 1} Name`} placeholder="Name" className={inputClass} value={c.name} onChange={(e) => upd({ name: e.target.value })} />
                <input aria-label={`Mitreisende ${i + 1} Geburtsdatum`} type="date" className={inputClass} value={c.birth_date} onChange={(e) => upd({ birth_date: e.target.value })} />
                <input aria-label={`Mitreisende ${i + 1} Staatsangehörigkeit`} className={inputClass} value={c.nationality} onChange={(e) => upd({ nationality: e.target.value })} />
              </div>
            );
          })}
        </div>
      )}

      <Field label="Unterschrift (Name des Gastes) *" hint="Der Gast bestätigt die Angaben, z. B. am Tablet an der Rezeption.">
        <input className={`${inputClass} italic`} value={r.signed_name} onChange={(e) => set('signed_name', e.target.value)} />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="primary" loading={saving}>{existing ? 'Meldeschein aktualisieren' : 'Meldeschein speichern'}</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Folio, Zahlungen, Rechnung
// ---------------------------------------------------------------------
function FolioTab({ booking, hotel, folio, payments, invoices, totals, onChanged, setError }: {
  booking: PmsBooking; hotel: HotelSettings; folio: FolioItem[]; payments: Payment[]; invoices: Invoice[];
  totals: { charged: number; paid: number; open: number }; onChanged: (msg?: string) => Promise<void>; setError: (e: string | null) => void;
}) {
  const today = toISODate(new Date());
  const [item, setItem] = useState({ description: '', quantity: '1', unit_price: '', category: 'food_beverage', service_date: today });
  const [pay, setPay] = useState({ amount: '', method: 'card' as Payment['method'] });
  const [busy, setBusy] = useState<string | null>(null);
  const open = folio.filter((i) => !i.invoice_id);
  const vat = vatSummary(folio);

  const vatFor = (cat: string) => (cat === 'lodging' ? hotel.vat_lodging : cat === 'tourist_tax' ? 0 : hotel.vat_standard);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(item.unit_price.replace(',', '.'));
    const qty = Number(item.quantity.replace(',', '.'));
    if (!item.description.trim() || !Number.isFinite(price) || !Number.isFinite(qty) || qty === 0) { setError('Bitte Bezeichnung, Menge und Preis angeben.'); return; }
    setBusy('item'); setError(null);
    const { error } = await supabase.from('folio_items').insert({
      hotel_id: hotel.id, booking_id: booking.id, service_date: item.service_date, category: item.category,
      description: item.description.trim(), quantity: qty, unit_price: price, vat_rate: vatFor(item.category),
    });
    setBusy(null);
    if (error) setError('Position konnte nicht gebucht werden.');
    else { setItem({ ...item, description: '', unit_price: '', quantity: '1' }); await onChanged(); }
  }

  async function removeItem(id: string) {
    setBusy(id);
    const { error } = await supabase.from('folio_items').delete().eq('id', id);
    setBusy(null);
    if (error) setError('Position konnte nicht entfernt werden.'); else await onChanged();
  }

  // Für Buchungen ohne Folio (z. B. aus der Zeit vor dem PMS): Übernachtung,
  // Frühstück und Kurtaxe nach aktuellen Raten nachbuchen.
  async function addStayCharges() {
    setBusy('stay'); setError(null);
    try {
      const [{ roomTypes }, { ratePlans, seasons }] = await Promise.all([fetchRoomsAndTypes(), fetchRateCatalog()]);
      const rt = roomTypes.find((t) => t.id === booking.room_type_id) ?? roomTypes.find((t) => t.name === booking.room_type);
      const rp = ratePlans.find((p) => p.id === booking.rate_plan_id) ?? null;
      if (!rt) throw new Error('Zimmertyp der Buchung nicht gefunden.');
      const quote = quoteStay({
        roomType: rt, ratePlan: rp, seasons, checkIn: booking.check_in, checkOut: booking.check_out,
        adults: booking.adults, childrenAges: booking.children_ages ?? [], tax: hotel,
      });
      if (!quote) throw new Error(`Für ${rt.name} ist kein Preis hinterlegt (Raten & Zimmer).`);
      const { error } = await supabase.from('folio_items').insert(quote.lines.map((l) => ({
        hotel_id: hotel.id, booking_id: booking.id, service_date: l.service_date ?? booking.check_in, category: l.category,
        description: l.description, quantity: l.quantity, unit_price: l.unit_price, vat_rate: l.vat_rate,
      })));
      if (error) throw new Error('Positionen konnten nicht gebucht werden.');
      await onChanged(`Aufenthalt nach Raten gebucht${rp ? '' : ' (ohne Verpflegung, keine Rate hinterlegt)'}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Positionen konnten nicht gebucht werden.');
    } finally {
      setBusy(null);
    }
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(pay.amount.replace(',', '.'));
    if (!Number.isFinite(amount) || amount === 0) { setError('Bitte einen Betrag angeben.'); return; }
    setBusy('pay'); setError(null);
    const { error } = await supabase.from('payments').insert({ hotel_id: hotel.id, booking_id: booking.id, amount, method: pay.method });
    setBusy(null);
    if (error) setError('Zahlung konnte nicht gebucht werden.'); else { setPay({ ...pay, amount: '' }); await onChanged('Zahlung gebucht.'); }
  }

  async function createInvoice() {
    setBusy('invoice'); setError(null);
    try {
      const res = await fetch(`/api/pms/bookings/${booking.id}/invoice`, { method: 'POST', headers: await authHeader() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await onChanged(`Rechnung ${data.number} erstellt.`);
      window.open(`/rechnung/${data.id}`, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rechnung konnte nicht erstellt werden.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm tabular-nums">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr><th className="text-left font-medium px-3 py-2">Datum</th><th className="text-left font-medium px-3 py-2">Leistung</th><th className="text-right font-medium px-3 py-2">Menge</th><th className="text-right font-medium px-3 py-2">Betrag</th><th className="w-8" /></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {folio.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-slate-500">Noch keine Leistungen gebucht.</td></tr>}
            {folio.map((i) => (
              <tr key={i.id} className={i.invoice_id ? 'text-slate-400' : ''}>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateDE(i.service_date, { day: '2-digit', month: '2-digit' })}</td>
                <td className="px-3 py-2">{i.description} <span className="text-xs text-slate-400">{i.vat_rate} %</span></td>
                <td className="px-3 py-2 text-right">{i.quantity.toLocaleString('de-DE')}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">{eur(i.quantity * i.unit_price)}</td>
                <td className="pr-2">
                  {!i.invoice_id && (
                    <button onClick={() => removeItem(i.id)} disabled={busy === i.id} aria-label={`${i.description} entfernen`} className="p-1 rounded text-slate-400 hover:text-red-700 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 text-sm">
            {vat.map((v) => (
              <tr key={v.rate} className="text-slate-500 text-xs"><td colSpan={3} className="px-3 py-1 text-right">{v.rate > 0 ? `enth. MwSt. ${v.rate} % auf ${eur(v.net)}` : 'ohne MwSt. (Kurtaxe)'}</td><td className="px-3 py-1 text-right">{v.rate > 0 ? eur(v.vat) : eur(v.gross)}</td><td /></tr>
            ))}
            <tr className="font-semibold text-slate-800"><td colSpan={3} className="px-3 py-2 text-right">Summe</td><td className="px-3 py-2 text-right">{eur(totals.charged)}</td><td /></tr>
            <tr className="text-slate-600"><td colSpan={3} className="px-3 py-1 text-right">Bezahlt</td><td className="px-3 py-1 text-right">{eur(totals.paid)}</td><td /></tr>
            <tr className={`font-semibold ${totals.open > 0.004 ? 'text-amber-800' : 'text-emerald-800'}`}><td colSpan={3} className="px-3 py-2 text-right">Offen</td><td className="px-3 py-2 text-right">{eur(totals.open)}</td><td /></tr>
          </tfoot>
        </table>
      </div>

      {!folio.some((i) => i.category === 'lodging') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm text-slate-600">
          <span>Übernachtungen sind noch nicht im Folio.</span>
          <Button size="sm" variant="primary" loading={busy === 'stay'} onClick={addStayCharges}>Aufenthalt nach Raten buchen</Button>
        </div>
      )}

      <form onSubmit={addItem} className="grid grid-cols-6 gap-2 items-end">
        <Field label="Leistung buchen" className="col-span-6 sm:col-span-3"><input placeholder="z. B. Abendessen, Minibar, E-Bike" className={inputClass} value={item.description} onChange={(e) => setItem({ ...item, description: e.target.value })} /></Field>
        <Field label="Art" className="col-span-3 sm:col-span-3">
          <select className={inputClass} value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value })}>
            {CATEGORY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label} ({vatFor(c.value)} %)</option>)}
          </select>
        </Field>
        <Field label="Datum" className="col-span-3 sm:col-span-2"><input type="date" className={inputClass} value={item.service_date} onChange={(e) => setItem({ ...item, service_date: e.target.value })} /></Field>
        <Field label="Menge" className="col-span-2 sm:col-span-1"><input inputMode="decimal" className={inputClass} value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} /></Field>
        <Field label="Preis (brutto)" className="col-span-2 sm:col-span-2"><input inputMode="decimal" placeholder="0,00" className={inputClass} value={item.unit_price} onChange={(e) => setItem({ ...item, unit_price: e.target.value })} /></Field>
        <Button type="submit" loading={busy === 'item'} className="col-span-2 sm:col-span-1">Buchen</Button>
      </form>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Zahlungen</h3>
        {payments.length > 0 && (
          <ul className="text-sm divide-y divide-slate-100">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between py-1.5 tabular-nums">
                <span>{new Date(p.paid_at).toLocaleDateString('de-DE')} · {PAYMENT_LABEL[p.method]}</span><span>{eur(p.amount)}</span>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addPayment} className="flex flex-wrap gap-2 items-end">
          <Field label="Betrag" className="w-32"><input inputMode="decimal" className={inputClass} value={pay.amount} placeholder={totals.open > 0 ? totals.open.toFixed(2).replace('.', ',') : '0,00'} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /></Field>
          <Field label="Zahlart" className="w-40">
            <select className={inputClass} value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value as Payment['method'] })}>
              {Object.entries(PAYMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          {totals.open > 0.004 && <Button type="button" variant="ghost" onClick={() => setPay({ ...pay, amount: totals.open.toFixed(2).replace('.', ',') })}>Offenen Betrag</Button>}
          <Button type="submit" loading={busy === 'pay'}>Zahlung buchen</Button>
        </form>
      </div>

      <div className="border-t border-slate-200 pt-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-800">Rechnungen</h3>
          <Button variant="primary" size="sm" disabled={open.length === 0} loading={busy === 'invoice'} onClick={createInvoice}>
            <FileText size={14} /> Rechnung erstellen
          </Button>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">Noch keine Rechnung. Abgerechnete Positionen werden festgeschrieben und können danach nicht mehr geändert werden.</p>
        ) : (
          <ul className="text-sm divide-y divide-slate-100">
            {invoices.map((inv) => (
              <li key={inv.id} className="flex justify-between py-1.5 tabular-nums">
                <Link href={`/rechnung/${inv.id}`} target="_blank" className="text-emerald-800 font-medium underline-offset-4 hover:underline">{inv.number}</Link>
                <span>{new Date(inv.issued_at).toLocaleDateString('de-DE')} · {eur(inv.total_gross)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
