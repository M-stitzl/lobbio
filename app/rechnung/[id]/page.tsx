'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Printer, ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { eur, formatDateDE } from '@/lib/pms/stay';

type Invoice = {
  id: string;
  number: string;
  issued_at: string;
  recipient: { name: string; street: string | null; postal_code: string | null; city: string | null; country: string | null };
  issuer: { name: string; legal_name: string | null; street: string | null; postal_code: string | null; city: string | null; phone: string | null; email: string | null; tax_number: string | null; vat_id: string | null; bank_details: string | null; is_demo?: boolean };
  lines: { service_date: string; description: string; quantity: number; unit_price: number; vat_rate: number; total: number }[];
  totals: { gross: number; vat: { rate: number; gross: number; net: number; vat: number }[]; paid: number; open: number; stay: { check_in: string; check_out: string; booking_code: string | null; room_type: string } };
};

export default function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [inv, setInv] = useState<Invoice | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    supabase.from('invoices').select('*').eq('id', id).maybeSingle().then(({ data }) => {
      if (data) setInv(data as Invoice); else setError(true);
    });
  }, [id]);

  if (error) return <p className="p-8 text-slate-600">Rechnung nicht gefunden.</p>;
  if (!inv) return <p className="p-8 text-slate-500" aria-busy="true">Rechnung wird geladen …</p>;

  const iss = inv.issuer;
  const rec = inv.recipient;
  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-8 print:py-0">
      <div className="mx-auto max-w-[210mm] mb-4 flex justify-between px-4 print:hidden">
        <Link href="/dashboard/rezeption" className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"><ArrowLeft size={16} /> Zur Rezeption</Link>
        <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-800">
          <Printer size={16} /> Drucken / als PDF speichern
        </button>
      </div>
      <article className="relative overflow-hidden mx-auto max-w-[210mm] min-h-[297mm] bg-white shadow-sm print:shadow-none px-[18mm] py-[16mm] text-[10.5pt] text-slate-900 leading-snug">
        {iss.is_demo && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="-rotate-[30deg] text-[120pt] font-black tracking-[0.1em] text-slate-900/[0.06]">MUSTER</span>
          </div>
        )}
        <header className="flex justify-between gap-8">
          <div>
            <p className="text-xl font-bold">{iss.name}</p>
            <p className="text-slate-600">{[iss.street, [iss.postal_code, iss.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="text-right text-slate-600 text-[9.5pt]">
            {iss.phone && <p>Tel. {iss.phone}</p>}
            {iss.email && <p>{iss.email}</p>}
          </div>
        </header>

        <section className="mt-14 grid grid-cols-2 gap-8">
          <address className="not-italic">
            <p className="text-[8pt] text-slate-500 underline mb-1">{[iss.legal_name ?? iss.name, iss.street, [iss.postal_code, iss.city].filter(Boolean).join(' ')].filter(Boolean).join(' · ')}</p>
            <p className="font-medium">{rec.name}</p>
            {rec.street && <p>{rec.street}</p>}
            <p>{[rec.postal_code, rec.city].filter(Boolean).join(' ')}</p>
            {rec.country && rec.country !== 'DE' && <p>{rec.country}</p>}
          </address>
          <dl className="justify-self-end grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-[9.5pt] tabular-nums">
            <dt className="text-slate-500">Rechnungsnummer</dt><dd className="font-semibold">{inv.number}</dd>
            <dt className="text-slate-500">Rechnungsdatum</dt><dd>{formatDateDE(inv.issued_at)}</dd>
            <dt className="text-slate-500">Leistungszeitraum</dt><dd>{formatDateDE(inv.totals.stay.check_in)} – {formatDateDE(inv.totals.stay.check_out)}</dd>
            {inv.totals.stay.booking_code && <><dt className="text-slate-500">Buchung</dt><dd>{inv.totals.stay.booking_code}</dd></>}
          </dl>
        </section>

        <h1 className="mt-12 text-lg font-bold">{iss.is_demo ? 'Musterrechnung (Vorführbetrieb, nicht gültig)' : 'Rechnung'}</h1>
        <p className="mt-1 text-slate-600">Vielen Dank für Ihren Aufenthalt ({inv.totals.stay.room_type}).</p>

        <table className="mt-6 w-full tabular-nums">
          <thead className="border-b-2 border-slate-800 text-[9pt] text-slate-600">
            <tr><th className="text-left font-medium py-1.5">Datum</th><th className="text-left font-medium py-1.5">Leistung</th><th className="text-right font-medium py-1.5">Menge</th><th className="text-right font-medium py-1.5">Einzelpreis</th><th className="text-right font-medium py-1.5">MwSt.</th><th className="text-right font-medium py-1.5">Betrag</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {inv.lines.map((l, i) => (
              <tr key={i}>
                <td className="py-1.5 pr-2 whitespace-nowrap">{formatDateDE(l.service_date, { day: '2-digit', month: '2-digit' })}</td>
                <td className="py-1.5 pr-2">{l.description}</td>
                <td className="py-1.5 text-right">{Number(l.quantity).toLocaleString('de-DE')}</td>
                <td className="py-1.5 text-right">{eur(l.unit_price)}</td>
                <td className="py-1.5 text-right">{l.vat_rate} %</td>
                <td className="py-1.5 text-right">{eur(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-[80mm] tabular-nums text-[10pt]">
          {inv.totals.vat.map((v) => (
            <div key={v.rate} className="flex justify-between text-slate-600">
              {v.rate > 0
                ? <><span>Netto {v.rate} %: {eur(v.net)} · MwSt.</span><span>{eur(v.vat)}</span></>
                : <><span>Nicht steuerbar (Kurtaxe)</span><span>{eur(v.gross)}</span></>}
            </div>
          ))}
          <div className="flex justify-between border-t-2 border-slate-800 mt-2 pt-1.5 font-bold text-[11pt]"><span>Gesamtbetrag</span><span>{eur(inv.totals.gross)}</span></div>
          {inv.totals.paid !== 0 && <div className="flex justify-between text-slate-600"><span>Bereits bezahlt</span><span>{eur(inv.totals.paid)}</span></div>}
          <div className="flex justify-between font-semibold"><span>{inv.totals.open > 0.004 ? 'Offener Betrag' : 'Status'}</span><span>{inv.totals.open > 0.004 ? eur(inv.totals.open) : 'Bezahlt'}</span></div>
        </div>

        <footer className="mt-16 pt-4 border-t border-slate-300 grid grid-cols-3 gap-4 text-[8pt] text-slate-600">
          <div><p className="font-medium text-slate-800">{iss.legal_name ?? iss.name}</p><p>{iss.street}</p><p>{[iss.postal_code, iss.city].filter(Boolean).join(' ')}</p></div>
          <div>{iss.tax_number && <p>Steuernr.: {iss.tax_number}</p>}{iss.vat_id && <p>USt-IdNr.: {iss.vat_id}</p>}</div>
          <div className="whitespace-pre-line">{iss.bank_details}</div>
        </footer>
      </article>
    </div>
  );
}
