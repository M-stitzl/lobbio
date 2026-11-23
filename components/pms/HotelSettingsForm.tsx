'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { fetchHotelSettings, type HotelSettings } from '@/lib/pms/client';
import { Button, Field, Notice, Panel, inputClass } from './ui';

export default function HotelSettingsForm() {
  const [h, setH] = useState<HotelSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchHotelSettings().then(setH); }, []);
  if (!h) return <div className="h-40 rounded-xl bg-white border border-slate-200 animate-pulse max-w-3xl" />;

  const set = <K extends keyof HotelSettings>(k: K, v: HotelSettings[K]) => setH({ ...h, [k]: v });
  const text = (k: keyof HotelSettings) => ({
    value: (h[k] as string | null) ?? '',
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, (e.target.value || null) as never),
    className: inputClass,
  });

  const portalUrl = h.slug && typeof window !== 'undefined' ? `${window.location.origin}/buchen/${h.slug}` : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!h) return;
    if (h.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(h.slug)) { setMsg({ tone: 'error', text: 'Die Portal-Adresse darf nur Kleinbuchstaben, Ziffern und Bindestriche enthalten.' }); return; }
    if (!/^#[0-9a-fA-F]{6}$/.test(h.accent_color)) { setMsg({ tone: 'error', text: 'Bitte eine gültige Farbe wählen.' }); return; }
    setSaving(true); setMsg(null);
    const { id, ...patch } = h;
    const { error } = await supabase.from('hotels').update(patch).eq('id', id);
    setSaving(false);
    setMsg(error
      ? { tone: 'error', text: error.code === '23505' ? 'Diese Portal-Adresse ist bereits vergeben.' : 'Speichern fehlgeschlagen.' }
      : { tone: 'success', text: 'Einstellungen gespeichert.' });
  }

  return (
    <form onSubmit={save} className="space-y-5 max-w-3xl">
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}

      <Panel title="Buchungsportal" bodyClassName="p-5 space-y-4">
        <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
          <input type="checkbox" className="h-5 w-5 accent-emerald-700" checked={h.booking_enabled} onChange={(e) => set('booking_enabled', e.target.checked)} />
          Online-Buchung für Gäste freischalten
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Portal-Adresse" hint="Teil des Links, z. B. alpenblick">
            <input className={inputClass} value={h.slug ?? ''} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') || null)} />
          </Field>
          <Field label="Akzentfarbe des Hauses" hint="Für Kopfzeile und Buttons im Portal.">
            <div className="flex gap-2">
              <input type="color" aria-label="Farbe wählen" value={h.accent_color} onChange={(e) => set('accent_color', e.target.value)} className="h-10 w-12 rounded border border-slate-300" />
              <input className={`${inputClass} flex-1`} value={h.accent_color} onChange={(e) => set('accent_color', e.target.value)} />
            </div>
          </Field>
          <Field label="Hotelfoto (URL)" className="sm:col-span-2" hint="Großes Titelbild. Ohne Foto zeigt das Portal eine Berglinie in Ihrer Farbe."><input {...text('hero_image_url')} /></Field>
          <Field label="Kurzer Satz unter dem Ortsnamen" className="sm:col-span-2"><input {...text('tagline')} placeholder="z. B. Familiengeführt seit 1962, mitten im Chiemgau" /></Field>
          <Field label="Über unser Haus" className="sm:col-span-2"><textarea rows={3} {...text('public_description')} /></Field>
          <Field label="Standard-Stornobedingung" className="sm:col-span-2"><textarea rows={2} {...text('cancellation_policy')} /></Field>
        </div>
        {portalUrl && (
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-sm flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-slate-700">{portalUrl}</code>
            <Button size="sm" type="button" onClick={() => { navigator.clipboard.writeText(portalUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}><Copy size={14} /> {copied ? 'Kopiert' : 'Link kopieren'}</Button>
            <a href={portalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-800 font-medium px-2"><ExternalLink size={14} /> Ansehen</a>
            <p className="w-full text-xs text-slate-500">Diesen Link als „Jetzt buchen“-Button auf Ihrer Website einbauen. Mit ?anreise=2027-07-01&amp;abreise=2027-07-05 springen Gäste direkt in die Suche.</p>
          </div>
        )}
      </Panel>

      <Panel title="Hotel & Kontakt" bodyClassName="p-5 grid sm:grid-cols-2 gap-4">
        <Field label="Straße, Hausnummer" className="sm:col-span-2"><input {...text('street')} /></Field>
        <Field label="PLZ"><input {...text('postal_code')} /></Field>
        <Field label="Ort"><input {...text('city')} /></Field>
        <Field label="Telefon"><input {...text('phone')} /></Field>
        <Field label="E-Mail"><input {...text('email')} /></Field>
        <Field label="Website" className="sm:col-span-2"><input {...text('website_url')} /></Field>
        <Field label="Check-in ab"><input type="time" className={inputClass} value={h.check_in_from.slice(0, 5)} onChange={(e) => set('check_in_from', e.target.value)} /></Field>
        <Field label="Check-out bis"><input type="time" className={inputClass} value={h.check_out_until.slice(0, 5)} onChange={(e) => set('check_out_until', e.target.value)} /></Field>
      </Panel>

      <Panel title="Steuern, Kurtaxe & Rechnung" bodyClassName="p-5 grid sm:grid-cols-2 gap-4">
        <Field label="MwSt. Übernachtung (%)" hint="Ermäßigt, i. d. R. 7 %"><input type="number" step="0.01" className={inputClass} value={h.vat_lodging} onChange={(e) => set('vat_lodging', Number(e.target.value))} /></Field>
        <Field label="MwSt. Frühstück & Extras (%)" hint="Regelsatz, i. d. R. 19 %"><input type="number" step="0.01" className={inputClass} value={h.vat_standard} onChange={(e) => set('vat_standard', Number(e.target.value))} /></Field>
        <Field label="Bezeichnung Kurtaxe" hint="z. B. Gästebeitrag, Kurbeitrag"><input className={inputClass} value={h.tourist_tax_label} onChange={(e) => set('tourist_tax_label', e.target.value)} /></Field>
        <Field label="Kurtaxe pro Person und Nacht (€)" hint="Satz Ihrer Gemeinde; 0 = keine"><input type="number" step="0.01" min={0} className={inputClass} value={h.tourist_tax_per_night} onChange={(e) => set('tourist_tax_per_night', Number(e.target.value))} /></Field>
        <Field label="Kurtaxe ab Alter"><input type="number" min={0} className={inputClass} value={h.tourist_tax_min_age} onChange={(e) => set('tourist_tax_min_age', Number(e.target.value))} /></Field>
        <Field label="Rechnungs-Präfix" hint="Nummern: PRÄFIX-JAHR-0001"><input className={inputClass} value={h.invoice_prefix} onChange={(e) => set('invoice_prefix', e.target.value)} /></Field>
        <Field label="Firmierung (Rechnungsaussteller)" className="sm:col-span-2"><input {...text('legal_name')} placeholder="z. B. Hotel Alpenblick GmbH & Co. KG" /></Field>
        <Field label="Steuernummer"><input {...text('tax_number')} /></Field>
        <Field label="USt-IdNr."><input {...text('vat_id')} /></Field>
        <Field label="Bankverbindung (Rechnungsfuß)" className="sm:col-span-2"><textarea rows={2} {...text('bank_details')} placeholder={'IBAN DE…\nBIC …'} /></Field>
      </Panel>

      <div className="flex justify-end"><Button type="submit" variant="primary" loading={saving}>Einstellungen speichern</Button></div>
    </form>
  );
}
