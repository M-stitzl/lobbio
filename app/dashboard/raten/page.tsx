'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchRateCatalog, fetchRoomsAndTypes, getHotelId, type RatePlan, type Room, type RoomType } from '@/lib/pms/client';
import { eur, formatDateDE, type SeasonRow } from '@/lib/pms/stay';
import { Button, Chip, Field, Notice, PageHeader, Panel, inputClass } from '@/components/pms/ui';

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function RatenPage() {
  const [types, setTypes] = useState<RoomType[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [plans, setPlans] = useState<RatePlan[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[]>([]);
  const [hotelId, setHotelId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() =>
    Promise.all([fetchRoomsAndTypes(), fetchRateCatalog(), getHotelId()])
      .then(([rt, cat, id]) => { setTypes(rt.roomTypes); setRooms(rt.rooms); setPlans(cat.ratePlans); setSeasons(cat.seasons); setHotelId(id); setLoading(false); })
      .catch(() => { setMsg({ tone: 'error', text: 'Daten konnten nicht geladen werden.' }); setLoading(false); }), []);
  useEffect(() => { load(); }, [load]);

  const report = (error: unknown, ok: string) => {
    setMsg(error ? { tone: 'error', text: 'Speichern fehlgeschlagen. Bitte Eingaben prüfen.' } : { tone: 'success', text: ok });
    if (!error) load();
  };

  return (
    <div className="flex flex-col h-full gap-5 overflow-y-auto pb-8 pr-1">
      <PageHeader title="Raten & Zimmer" description="Grundpreise je Zimmertyp, Saisonpreise und Ratenpläne. Alle Preise brutto pro Zimmer und Nacht." />
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {loading ? <div className="h-64 rounded-xl bg-white animate-pulse" /> : (
        <>
          <RoomTypesPanel types={types} rooms={rooms} hotelId={hotelId} report={report} />
          <RatePlansPanel plans={plans} hotelId={hotelId} report={report} />
          <SeasonsPanel seasons={seasons} types={types} hotelId={hotelId} report={report} />
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function RoomTypesPanel({ types, rooms, hotelId, report }: { types: RoomType[]; rooms: Room[]; hotelId: string | null; report: (e: unknown, ok: string) => void }) {
  const [newType, setNewType] = useState({ name: '', base_price: '', max_guests: '2' });

  async function saveType(t: RoomType, patch: Partial<RoomType>) {
    const { error } = await supabase.from('room_types').update(patch).eq('id', t.id);
    report(error, `${t.name} gespeichert.`);
  }
  async function addType(e: React.FormEvent) {
    e.preventDefault();
    if (!newType.name.trim() || !hotelId) return;
    const { error } = await supabase.from('room_types').insert({
      hotel_id: hotelId, name: newType.name.trim(), total_count: 1, base_price: num(newType.base_price), max_guests: num(newType.max_guests), sort_order: types.length + 1,
    });
    if (!error) setNewType({ name: '', base_price: '', max_guests: '2' });
    report(error, 'Zimmertyp angelegt.');
  }
  // Zimmeranzahl des Typs folgt den angelegten Zimmern (Grundlage der Verfügbarkeit).
  async function syncCount(typeId: string, delta: number) {
    const count = rooms.filter((r) => r.room_type_id === typeId).length + delta;
    if (count > 0) await supabase.from('room_types').update({ total_count: count }).eq('id', typeId);
  }
  async function addRoom(t: RoomType, number: string) {
    if (!number.trim() || !hotelId) return;
    const { error } = await supabase.from('rooms').insert({ hotel_id: hotelId, room_type_id: t.id, number: number.trim(), sort_order: rooms.length + 1 });
    if (!error) await syncCount(t.id, 1);
    report(error, `Zimmer ${number} angelegt.`);
  }
  async function removeRoom(r: Room) {
    const { error } = await supabase.from('rooms').delete().eq('id', r.id);
    if (!error) await syncCount(r.room_type_id, -1);
    report(error, `Zimmer ${r.number} entfernt.`);
  }

  return (
    <Panel title="Zimmertypen und Zimmer" className="shrink-0">
      <div className="divide-y divide-slate-100">
        {types.map((t) => <RoomTypeRow key={t.id} t={t} rooms={rooms.filter((r) => r.room_type_id === t.id)} onSave={saveType} onAddRoom={addRoom} onRemoveRoom={removeRoom} />)}
      </div>
      <form onSubmit={addType} className="border-t border-slate-200 p-4 flex flex-wrap items-end gap-3 bg-slate-50 rounded-b-xl">
        <Field label="Neuer Zimmertyp" className="flex-1 min-w-[180px]"><input className={inputClass} value={newType.name} onChange={(e) => setNewType({ ...newType, name: e.target.value })} placeholder="z. B. Juniorsuite" /></Field>
        <Field label="Grundpreis" className="w-28"><input inputMode="decimal" className={inputClass} value={newType.base_price} onChange={(e) => setNewType({ ...newType, base_price: e.target.value })} /></Field>
        <Field label="Max. Personen" className="w-28"><input type="number" min={1} className={inputClass} value={newType.max_guests} onChange={(e) => setNewType({ ...newType, max_guests: e.target.value })} /></Field>
        <Button type="submit"><Plus size={16} /> Anlegen</Button>
      </form>
    </Panel>
  );
}

function RoomTypeRow({ t, rooms, onSave, onAddRoom, onRemoveRoom }: {
  t: RoomType; rooms: Room[]; onSave: (t: RoomType, p: Partial<RoomType>) => void; onAddRoom: (t: RoomType, n: string) => void; onRemoveRoom: (r: Room) => void;
}) {
  const [f, setF] = useState({
    base_price: t.base_price?.toString().replace('.', ',') ?? '', max_guests: t.max_guests?.toString() ?? '', size_sqm: t.size_sqm?.toString() ?? '',
    description: t.description ?? '', amenities: t.amenities.join(', '), image_url: t.image_url ?? '', bookable_online: t.bookable_online,
  });
  const [newRoom, setNewRoom] = useState('');
  const [openDetails, setOpenDetails] = useState(false);

  const save = () => onSave(t, {
    base_price: num(f.base_price), max_guests: num(f.max_guests), size_sqm: num(f.size_sqm), description: f.description.trim() || null,
    amenities: f.amenities.split(',').map((s) => s.trim()).filter(Boolean), image_url: f.image_url.trim() || null, bookable_online: f.bookable_online,
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[160px]">
          <p className="font-semibold text-slate-800">{t.name}</p>
          <p className="text-xs text-slate-500">{rooms.length || t.total_count} Zimmer{t.base_price != null ? ` · ab ${eur(t.base_price)}` : ' · noch kein Preis'}</p>
        </div>
        <Field label="Grundpreis / Nacht" className="w-36"><input inputMode="decimal" className={inputClass} value={f.base_price} onChange={(e) => setF({ ...f, base_price: e.target.value })} /></Field>
        <Field label="Max. Personen" className="w-28"><input type="number" min={1} className={inputClass} value={f.max_guests} onChange={(e) => setF({ ...f, max_guests: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm text-slate-700 h-10">
          <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={f.bookable_online} onChange={(e) => setF({ ...f, bookable_online: e.target.checked })} /> Online buchbar
        </label>
        <Button variant="ghost" onClick={() => setOpenDetails((v) => !v)} aria-expanded={openDetails}>{openDetails ? 'Weniger' : 'Portal-Texte'}</Button>
        <Button variant="primary" onClick={save}>Speichern</Button>
      </div>
      {openDetails && (
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Beschreibung im Portal" className="sm:col-span-2"><textarea rows={2} className={inputClass} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
          <Field label="Ausstattung" hint="Kommagetrennt, z. B. Balkon, Bergblick"><input className={inputClass} value={f.amenities} onChange={(e) => setF({ ...f, amenities: e.target.value })} /></Field>
          <Field label="Größe (m²)"><input type="number" className={inputClass} value={f.size_sqm} onChange={(e) => setF({ ...f, size_sqm: e.target.value })} /></Field>
          <Field label="Foto-URL" className="sm:col-span-2" hint="Link zu einem Zimmerfoto (z. B. von Ihrer Website)."><input className={inputClass} value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {rooms.map((r) => (
          <span key={r.id} className="inline-flex items-center gap-1 rounded-md bg-slate-100 pl-2 pr-1 py-1 text-sm font-semibold tabular-nums text-slate-800">
            {r.number}
            <button onClick={() => onRemoveRoom(r)} aria-label={`Zimmer ${r.number} entfernen`} className="p-0.5 rounded text-slate-400 hover:text-red-700 hover:bg-red-50"><Trash2 size={13} /></button>
          </span>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); onAddRoom(t, newRoom); setNewRoom(''); }} className="inline-flex items-center gap-1">
          <input aria-label={`Neue Zimmernummer für ${t.name}`} placeholder="Nr." value={newRoom} onChange={(e) => setNewRoom(e.target.value)} className={`${inputClass} w-20 py-1`} />
          <Button size="sm" type="submit"><Plus size={14} /> Zimmer</Button>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
function RatePlansPanel({ plans, hotelId, report }: { plans: RatePlan[]; hotelId: string | null; report: (e: unknown, ok: string) => void }) {
  async function add() {
    if (!hotelId) return;
    const { error } = await supabase.from('rate_plans').insert({ hotel_id: hotelId, name: 'Neue Rate', sort_order: plans.length + 1 });
    report(error, 'Rate angelegt.');
  }
  return (
    <Panel title="Ratenpläne" actions={<Button size="sm" onClick={add}><Plus size={14} /> Rate</Button>} className="shrink-0">
      <div className="divide-y divide-slate-100">
        {plans.length === 0 && <p className="p-4 text-sm text-slate-500">Noch keine Rate. Ohne Rate zeigt das Portal keine Preise an.</p>}
        {plans.map((p) => <RatePlanRow key={p.id} p={p} report={report} />)}
      </div>
    </Panel>
  );
}

function RatePlanRow({ p, report }: { p: RatePlan; report: (e: unknown, ok: string) => void }) {
  const [f, setF] = useState({
    name: p.name, description: p.description ?? '', breakfast: p.breakfast_per_person.toString().replace('.', ','),
    adj: p.price_adjustment_pct.toString().replace('.', ','), cancellation: p.cancellation_policy ?? '', public: p.public, active: p.active,
  });
  async function save() {
    const { error } = await supabase.from('rate_plans').update({
      name: f.name.trim(), description: f.description.trim() || null, breakfast_per_person: num(f.breakfast) ?? 0,
      price_adjustment_pct: num(f.adj) ?? 0, cancellation_policy: f.cancellation.trim() || null, public: f.public, active: f.active,
    }).eq('id', p.id);
    report(error, `${f.name} gespeichert.`);
  }
  return (
    <div className="p-4 grid gap-3 sm:grid-cols-6 items-end">
      <Field label="Name" className="sm:col-span-2"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Frühstück p. P./Nacht" hint="19 % MwSt."><input inputMode="decimal" className={inputClass} value={f.breakfast} onChange={(e) => setF({ ...f, breakfast: e.target.value })} /></Field>
      <Field label="Auf-/Abschlag %" hint="z. B. -10"><input inputMode="decimal" className={inputClass} value={f.adj} onChange={(e) => setF({ ...f, adj: e.target.value })} /></Field>
      <div className="flex flex-col gap-1 text-sm text-slate-700 sm:col-span-1">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={f.public} onChange={(e) => setF({ ...f, public: e.target.checked })} /> Im Portal</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Aktiv</label>
      </div>
      <Button variant="primary" onClick={save}>Speichern</Button>
      <Field label="Beschreibung" className="sm:col-span-3"><input className={inputClass} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="Stornobedingung (leer = Hotel-Standard)" className="sm:col-span-3"><input className={inputClass} value={f.cancellation} onChange={(e) => setF({ ...f, cancellation: e.target.value })} /></Field>
    </div>
  );
}

// ---------------------------------------------------------------------
function SeasonsPanel({ seasons, types, hotelId, report }: { seasons: SeasonRow[]; types: RoomType[]; hotelId: string | null; report: (e: unknown, ok: string) => void }) {
  const [n, setN] = useState({ name: '', start: '', end: '', min_stay: '1' });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!hotelId || !n.name.trim() || !n.start || !n.end || n.end < n.start) { report(true, ''); return; }
    const { error } = await supabase.from('rate_seasons').insert({ hotel_id: hotelId, name: n.name.trim(), start_date: n.start, end_date: n.end, min_stay: Number(n.min_stay) || 1 });
    if (!error) setN({ name: '', start: '', end: '', min_stay: '1' });
    report(error, 'Saison angelegt. Jetzt Preise je Zimmertyp eintragen.');
  }
  async function remove(s: SeasonRow) {
    const { error } = await supabase.from('rate_seasons').delete().eq('id', s.id);
    report(error, `${s.name} gelöscht.`);
  }
  async function setPrice(s: SeasonRow, typeId: string, value: string) {
    const price = num(value);
    const { error } = price == null
      ? await supabase.from('rate_season_prices').delete().eq('season_id', s.id).eq('room_type_id', typeId)
      : await supabase.from('rate_season_prices').upsert({ season_id: s.id, room_type_id: typeId, hotel_id: hotelId, price_per_night: price });
    report(error, 'Saisonpreis gespeichert.');
  }

  return (
    <Panel title="Saisonpreise" className="shrink-0">
      <p className="px-4 pt-3 text-sm text-slate-600">Innerhalb einer Saison gilt der Saisonpreis statt des Grundpreises. Leeres Feld = Grundpreis.</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm tabular-nums mt-2">
          <thead className="text-xs text-slate-500 bg-slate-50">
            <tr>
              <th className="text-left font-medium px-4 py-2">Saison</th>
              <th className="text-left font-medium px-2 py-2">Mind.</th>
              {types.map((t) => <th key={t.id} className="text-right font-medium px-2 py-2 whitespace-nowrap">{t.name}</th>)}
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {seasons.length === 0 && <tr><td colSpan={types.length + 3} className="px-4 py-4 text-slate-500">Noch keine Saison angelegt.</td></tr>}
            {seasons.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2 whitespace-nowrap"><p className="font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-500">{formatDateDE(s.start_date)} – {formatDateDE(s.end_date)}</p></td>
                <td className="px-2 py-2"><Chip>{s.min_stay} N.</Chip></td>
                {types.map((t) => {
                  const p = s.prices.find((x) => x.room_type_id === t.id)?.price_per_night;
                  return (
                    <td key={t.id} className="px-2 py-2 text-right">
                      <input aria-label={`${s.name} ${t.name}`} inputMode="decimal" defaultValue={p?.toString().replace('.', ',') ?? ''} placeholder={t.base_price?.toString() ?? '–'}
                        onBlur={(e) => { if (e.target.value !== (p?.toString().replace('.', ',') ?? '')) setPrice(s, t.id, e.target.value); }}
                        className={`${inputClass} w-24 text-right py-1`} />
                    </td>
                  );
                })}
                <td className="pr-3"><button onClick={() => remove(s)} aria-label={`${s.name} löschen`} className="p-1.5 rounded text-slate-400 hover:text-red-700 hover:bg-red-50"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="border-t border-slate-200 p-4 flex flex-wrap items-end gap-3 bg-slate-50 rounded-b-xl">
        <Field label="Neue Saison" className="flex-1 min-w-[160px]"><input className={inputClass} placeholder="z. B. Weihnachten" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} /></Field>
        <Field label="Von"><input type="date" className={inputClass} value={n.start} onChange={(e) => setN({ ...n, start: e.target.value })} /></Field>
        <Field label="Bis (letzte Nacht)"><input type="date" className={inputClass} value={n.end} onChange={(e) => setN({ ...n, end: e.target.value })} /></Field>
        <Field label="Mindestaufenthalt" className="w-32"><input type="number" min={1} className={inputClass} value={n.min_stay} onChange={(e) => setN({ ...n, min_stay: e.target.value })} /></Field>
        <Button type="submit"><Plus size={16} /> Anlegen</Button>
      </form>
    </Panel>
  );
}
