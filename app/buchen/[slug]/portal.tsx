'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Minus, Phone, Mail, Plus, Users, Loader2, Check, ArrowLeft, Globe } from 'lucide-react';
import { addDays, eur, formatDateDE, nightsBetween, parseISODate, toISODate, isValidISODate, vatSummary, type Quote } from '@/lib/pms/stay';

// ---------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------
export type PublicHotel = {
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  street: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  accent: string;
  heroImage: string | null;
  checkInFrom: string;
  checkOutUntil: string;
  touristTaxLabel: string;
  touristTaxPerNight: number;
  touristTaxMinAge: number;
  isDemo: boolean;
};

type Rate = { ratePlanId: string; name: string; description: string | null; cancellation: string | null; quote: Quote };
type Offer = {
  roomTypeId: string;
  name: string;
  description: string | null;
  sizeSqm: number | null;
  maxGuests: number | null;
  amenities: string[];
  imageUrl: string | null;
  freeRooms: number;
  status: 'available' | 'few_left' | 'sold_out' | 'too_small' | 'min_stay' | 'no_price';
  rates: Rate[];
};

type Step = 'search' | 'details' | 'done';

// ---------------------------------------------------------------------
// Farbe: lesbare Schrift auf der Hotel-Akzentfarbe
// ---------------------------------------------------------------------
function onAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return L > 0.4 ? '#1b1e21' : '#ffffff';
}

const COUNTRIES: [string, string][] = [
  ['DE', 'Deutschland'], ['AT', 'Österreich'], ['CH', 'Schweiz'], ['IT', 'Italien'], ['NL', 'Niederlande'],
  ['BE', 'Belgien'], ['FR', 'Frankreich'], ['DK', 'Dänemark'], ['SE', 'Schweden'], ['PL', 'Polen'], ['CZ', 'Tschechien'],
  ['GB', 'Vereinigtes Königreich'], ['US', 'USA'], ['XX', 'Anderes Land'],
];

const shortDate = (s: string) => formatDateDE(s, { weekday: 'short', day: '2-digit', month: '2-digit' });

// ---------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------
export default function BookingPortal({ hotel, initial }: { hotel: PublicHotel; initial: { checkIn?: string; checkOut?: string; adults?: string } }) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [checkIn, setCheckIn] = useState<string | null>(initial.checkIn && isValidISODate(initial.checkIn) && initial.checkIn >= today ? initial.checkIn : null);
  const [checkOut, setCheckOut] = useState<string | null>(
    initial.checkOut && isValidISODate(initial.checkOut) && checkIn && initial.checkOut > checkIn ? initial.checkOut : null,
  );
  const [adults, setAdults] = useState(() => Math.min(10, Math.max(1, Number(initial.adults) || 2)));
  const [childrenAges, setChildrenAges] = useState<number[]>([]);

  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [minStay, setMinStay] = useState(1);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchedKey, setSearchedKey] = useState<string | null>(null);

  const [selection, setSelection] = useState<{ offer: Offer; rate: Rate } | null>(null);
  const [step, setStep] = useState<Step>('search');
  const [result, setResult] = useState<{ code: string; emailSent: boolean; guestName: string; email: string } | null>(null);

  const resultsRef = useRef<HTMLDivElement>(null);
  const stayKey = `${checkIn}|${checkOut}|${adults}|${childrenAges.join(',')}`;
  const stale = searchedKey !== null && searchedKey !== stayKey;

  const search = useCallback(async () => {
    if (!checkIn || !checkOut) {
      setSearchError('Bitte wählen Sie Anreise und Abreise.');
      return;
    }
    setSearching(true);
    setSearchError(null);
    setSelection(null);
    try {
      const qs = new URLSearchParams({ checkIn, checkOut, adults: String(adults), children: childrenAges.join(',') });
      const res = await fetch(`/api/portal/${hotel.slug}/offers?${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Die Verfügbarkeit konnte nicht geprüft werden.');
      setOffers(data.offers);
      setMinStay(data.minStay);
      setSearchedKey(`${checkIn}|${checkOut}|${adults}|${childrenAges.join(',')}`);
      requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Die Verfügbarkeit konnte nicht geprüft werden.');
    } finally {
      setSearching(false);
    }
  }, [checkIn, checkOut, adults, childrenAges, hotel.slug]);

  // Direktlink mit Daten (?anreise=…&abreise=…) sucht sofort.
  const autoSearched = useRef(false);
  useEffect(() => {
    if (!autoSearched.current && checkIn && checkOut) {
      autoSearched.current = true;
      search();
    }
  }, [checkIn, checkOut, search]);

  const style = {
    '--accent': hotel.accent,
    '--on-accent': onAccent(hotel.accent),
  } as React.CSSProperties;

  const place = hotel.city ?? hotel.name;

  return (
    <div style={style} className="portal min-h-screen bg-[#e9ecea] text-[#22262a] pb-28 lg:pb-0">
      {/* Kopfband in Hotelfarbe */}
      <header className="bg-[var(--accent)] text-[var(--on-accent)]">
        <div className="mx-auto max-w-6xl px-4 h-12 flex items-center justify-between gap-4 text-sm">
          <span className="font-semibold truncate">{hotel.name}</span>
          <div className="flex items-center gap-4 shrink-0">
            {hotel.phone ? (
              <a href={`tel:${hotel.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                <Phone size={15} aria-hidden /> <span className="hidden sm:inline">{hotel.phone}</span><span className="sm:hidden">Anrufen</span>
              </a>
            ) : hotel.email ? (
              // Ohne Telefonnummer bleibt der Kontakt trotzdem im Kopfband.
              <a href={`mailto:${hotel.email}`} className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                <Mail size={15} aria-hidden /> <span className="hidden sm:inline">{hotel.email}</span><span className="sm:hidden">E-Mail</span>
              </a>
            ) : null}
            {hotel.website && (
              <a href={hotel.website} className="hidden sm:inline-flex items-center gap-1.5 underline-offset-4 hover:underline">
                <Globe size={15} aria-hidden /> Website
              </a>
            )}
          </div>
        </div>
      </header>

      {hotel.isDemo && (
        <div role="note" className="bg-[#3d3a6e] text-white">
          <p className="mx-auto max-w-6xl px-4 py-2 text-sm">
            <strong>Vorführversion:</strong> Hotel, Preise und Verfügbarkeit sind Beispieldaten. Buchungen hier sind keine echten Reservierungen, es werden keine E-Mails verschickt.
          </p>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-4">
        {/* Kartenvorderseite */}
        <section aria-label={`${hotel.name}, ${place}`} className="mt-4 md:mt-6 bg-[#fbfaf7] p-2 md:p-3 shadow-[0_10px_30px_-12px_rgba(30,40,40,0.35)] rounded-[3px]">
          <div className="relative h-[42vh] min-h-[260px] max-h-[520px] overflow-hidden rounded-[2px] bg-[var(--accent)]">
            {hotel.heroImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={hotel.heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <Ridge />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute left-4 right-4 bottom-14 md:left-8 md:bottom-16 text-white">
              <h1 className="font-[family-name:var(--font-lettering)] font-bold uppercase leading-[0.9] tracking-[0.01em] text-5xl sm:text-6xl md:text-7xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] text-balance">
                {place}
              </h1>
              <p className="mt-2 text-sm md:text-base font-medium drop-shadow max-w-[52ch]">{hotel.tagline ?? `Herzlich willkommen im ${hotel.name}`}</p>
            </div>
          </div>
        </section>

        {/* Suchleiste überlappt die Kartenkante */}
        <SearchBar
          today={today}
          checkIn={checkIn}
          checkOut={checkOut}
          onDates={(a, b) => { setCheckIn(a); setCheckOut(b); }}
          adults={adults}
          setAdults={setAdults}
          childrenAges={childrenAges}
          setChildrenAges={setChildrenAges}
          onSearch={() => { setStep('search'); search(); }}
          searching={searching}
          error={searchError}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
          <div ref={resultsRef} className="scroll-mt-4 min-w-0">
            {step === 'search' && (
              <Offers
                offers={offers}
                stale={stale}
                minStay={minStay}
                persons={adults + childrenAges.length}
                nights={checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0}
                selection={selection}
                onSelect={(offer, rate) => setSelection({ offer, rate })}
                onContinue={() => { setStep('details'); requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' })); }}
                hotel={hotel}
                searching={searching}
              />
            )}
            {step === 'details' && selection && checkIn && checkOut && (
              <GuestForm
                hotel={hotel}
                selection={selection}
                stay={{ checkIn, checkOut, adults, childrenAges }}
                onBack={() => setStep('search')}
                onBooked={(r) => { setResult(r); setStep('done'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                onSoldOut={() => { setStep('search'); search(); }}
              />
            )}
            {step === 'done' && result && (
              <Confirmation hotel={hotel} result={result} />
            )}
          </div>

          <div className="hidden lg:block lg:sticky lg:top-6">
            <PostcardBack hotel={hotel} checkIn={checkIn} checkOut={checkOut} adults={adults} kids={childrenAges.length} selection={selection} cancelled={step === 'done'} />
          </div>
        </div>

        {hotel.description && step !== 'done' && (
          <section className="mt-14 max-w-[68ch]">
            <h2 className="font-[family-name:var(--font-lettering)] uppercase text-3xl font-bold tracking-[0.01em]">Über unser Haus</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-[#3a4045] whitespace-pre-line">{hotel.description}</p>
          </section>
        )}
      </main>

      <footer className="mt-16 border-t border-[#d5dad7] bg-[#e1e5e3]">
        <div className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-2 text-sm text-[#4a5055]">
          <address className="not-italic leading-relaxed">
            <strong className="text-[#22262a]">{hotel.name}</strong><br />
            {hotel.street && <>{hotel.street}<br /></>}
            {(hotel.postalCode || hotel.city) && <>{[hotel.postalCode, hotel.city].filter(Boolean).join(' ')}<br /></>}
            {hotel.phone && <>Tel. {hotel.phone}<br /></>}
            {hotel.email && <a className="underline underline-offset-4" href={`mailto:${hotel.email}`}>{hotel.email}</a>}
          </address>
          <div className="sm:text-right space-y-1">
            <p>Anreise ab {hotel.checkInFrom} Uhr · Abreise bis {hotel.checkOutUntil} Uhr</p>
            <p>Zahlung bequem vor Ort im Hotel.</p>
            <p className="text-xs text-[#4f555a] pt-2">Buchungssystem: Lobbio</p>
          </div>
        </div>
      </footer>

      {/* Mobile: Zusammenfassung als Leiste */}
      {selection && step === 'search' && (
        <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[#fbfaf7] border-t border-[#d5dad7] shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)]">
          <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-[#5a6065] truncate">{selection.offer.name} · {selection.rate.name}</p>
              <p className="text-lg font-semibold tabular-nums">{eur(selection.rate.quote.grandTotal)}</p>
            </div>
            <PrimaryButton onClick={() => { setStep('details'); resultsRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>Weiter zu Ihren Daten</PrimaryButton>
          </div>
        </div>
      )}

      <style>{`
        .portal ::selection { background: var(--accent); color: var(--on-accent); }
        .portal :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        .stamp-edge {
          /* Zähnung: Löcher nur im 7px-Rand, das Motiv deckt die Mitte ab. */
          background: radial-gradient(circle at 5px 5px, #0000 2.6px, #fff 3.1px) -5px -5px / 10px 10px;
          filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.18));
        }
        @keyframes postmark-in { from { opacity: 0; transform: rotate(-24deg) scale(1.25); } to { opacity: 1; transform: rotate(-12deg) scale(1); } }
        .postmark-hit { animation: postmark-in 420ms cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes card-flip { from { transform: perspective(1400px) rotateY(-90deg); } to { transform: perspective(1400px) rotateY(0); } }
        .card-flip { animation: card-flip 560ms cubic-bezier(0.16, 1, 0.3, 1) both; transform-origin: left center; }
        @media (prefers-reduced-motion: reduce) { .postmark-hit, .card-flip { animation: none; } }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------
function PrimaryButton({ children, loading, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-[4px] bg-[var(--accent)] text-[var(--on-accent)] px-5 h-12 text-[15px] font-semibold
        transition-[filter,transform] hover:brightness-110 active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${props.className ?? ''}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/** Platzhalter ohne Hotelfoto: geschichtete Bergsilhouette in der Hotelfarbe. */
function Ridge() {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMax slice" aria-hidden>
      <rect width="1200" height="500" fill="var(--accent)" />
      <path d="M0 330 L140 250 L230 290 L360 170 L470 260 L560 210 L700 300 L820 190 L930 250 L1050 160 L1200 240 L1200 500 L0 500Z" fill="#fff" opacity="0.16" />
      <path d="M0 380 L120 330 L260 370 L380 300 L520 360 L640 320 L780 380 L900 330 L1040 370 L1200 320 L1200 500 L0 500Z" fill="#000" opacity="0.14" />
      <path d="M0 440 L180 410 L360 440 L560 415 L760 445 L980 420 L1200 440 L1200 500 L0 500Z" fill="#000" opacity="0.18" />
    </svg>
  );
}

// ---------------------------------------------------------------------
// Suchleiste mit Datumsbereich und Gästeauswahl
// ---------------------------------------------------------------------
function SearchBar(props: {
  today: string;
  checkIn: string | null;
  checkOut: string | null;
  onDates: (a: string | null, b: string | null) => void;
  adults: number;
  setAdults: (n: number) => void;
  childrenAges: number[];
  setChildrenAges: (a: number[]) => void;
  onSearch: () => void;
  searching: boolean;
  error: string | null;
}) {
  const [open, setOpen] = useState<'dates' | 'guests' | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const nights = props.checkIn && props.checkOut ? nightsBetween(props.checkIn, props.checkOut) : 0;
  const guestsLabel = `${props.adults} ${props.adults === 1 ? 'Erwachsener' : 'Erwachsene'}${props.childrenAges.length ? `, ${props.childrenAges.length} ${props.childrenAges.length === 1 ? 'Kind' : 'Kinder'}` : ''}`;

  return (
    <div ref={wrapRef} className="relative z-30 -mt-10 mx-2 md:mx-8">
      <form
        onSubmit={(e) => { e.preventDefault(); setOpen(null); props.onSearch(); }}
        className="bg-white rounded-[4px] shadow-[0_12px_28px_-14px_rgba(20,30,30,0.45)] border border-[#dfe3e1] p-2 grid gap-2 md:grid-cols-[1fr_1fr_1.1fr_auto]"
      >
        <FieldButton label="Anreise" value={props.checkIn ? shortDate(props.checkIn) : 'Datum wählen'} active={open === 'dates'} onClick={() => setOpen(open === 'dates' ? null : 'dates')} icon={<CalendarDays size={18} />} />
        <FieldButton
          label={nights ? `Abreise · ${nights} ${nights === 1 ? 'Nacht' : 'Nächte'}` : 'Abreise'}
          value={props.checkOut ? shortDate(props.checkOut) : 'Datum wählen'}
          active={open === 'dates'}
          onClick={() => setOpen(open === 'dates' ? null : 'dates')}
          icon={<CalendarDays size={18} />}
        />
        <FieldButton label="Gäste" value={guestsLabel} active={open === 'guests'} onClick={() => setOpen(open === 'guests' ? null : 'guests')} icon={<Users size={18} />} />
        <PrimaryButton type="submit" loading={props.searching} className="md:h-auto md:min-h-14">Verfügbarkeit prüfen</PrimaryButton>
      </form>
      {props.error && <p role="alert" className="mt-2 px-1 text-sm text-[#a33a28] font-medium">{props.error}</p>}

      {open === 'dates' && (
        <div className="absolute left-0 right-0 md:right-auto top-full mt-2 bg-white rounded-[4px] border border-[#dfe3e1] shadow-xl p-4">
          <RangeCalendar
            today={props.today}
            checkIn={props.checkIn}
            checkOut={props.checkOut}
            onChange={(a, b) => { props.onDates(a, b); if (a && b) setOpen(null); }}
          />
        </div>
      )}
      {open === 'guests' && (
        <div className="absolute right-0 left-0 md:left-auto md:w-[360px] md:right-40 top-full mt-2 bg-white rounded-[4px] border border-[#dfe3e1] shadow-xl p-4 space-y-4">
          <Stepper label="Erwachsene" hint="ab 18 Jahren" value={props.adults} min={1} max={10} onChange={props.setAdults} />
          <Stepper
            label="Kinder"
            hint="0–17 Jahre"
            value={props.childrenAges.length}
            min={0}
            max={6}
            onChange={(n) => props.setChildrenAges(n > props.childrenAges.length ? [...props.childrenAges, 8] : props.childrenAges.slice(0, n))}
          />
          {props.childrenAges.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {props.childrenAges.map((age, i) => (
                <label key={i} className="text-xs text-[#4a5055] flex flex-col gap-1">
                  Alter Kind {i + 1}
                  <select
                    value={age}
                    onChange={(e) => props.setChildrenAges(props.childrenAges.map((a, j) => (j === i ? Number(e.target.value) : a)))}
                    className="h-10 rounded-[4px] border border-[#c9cfcc] bg-white px-2 text-sm text-[#22262a]"
                  >
                    {Array.from({ length: 18 }).map((_, a) => <option key={a} value={a}>{a} {a === 1 ? 'Jahr' : 'Jahre'}</option>)}
                  </select>
                </label>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setOpen(null)} className="w-full h-10 rounded-[4px] border border-[#c9cfcc] text-sm font-medium hover:bg-[#f3f5f4]">Fertig</button>
        </div>
      )}
    </div>
  );
}

function FieldButton({ label, value, onClick, active, icon }: { label: string; value: string; onClick: () => void; active: boolean; icon: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={active}
      className={`text-left rounded-[3px] px-3 py-2 min-h-14 flex items-center gap-3 border transition-colors ${active ? 'border-[var(--accent)] bg-[#f6f8f7]' : 'border-transparent hover:bg-[#f3f5f4]'}`}
    >
      <span className="text-[#6b7176]" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-xs text-[#5a6065]">{label}</span>
        <span className="block text-[15px] font-semibold truncate">{value}</span>
      </span>
    </button>
  );
}

function Stepper({ label, hint, value, min, max, onChange }: { label: string; hint: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-[15px] font-medium">{label}</p>
        <p className="text-xs text-[#5a6065]">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" aria-label={`${label} weniger`} disabled={value <= min} onClick={() => onChange(value - 1)}
          className="h-10 w-10 grid place-items-center rounded-full border border-[#c9cfcc] disabled:opacity-40 hover:bg-[#f3f5f4]"><Minus size={16} /></button>
        <span className="w-6 text-center tabular-nums font-semibold" aria-live="polite">{value}</span>
        <button type="button" aria-label={`${label} mehr`} disabled={value >= max} onClick={() => onChange(value + 1)}
          className="h-10 w-10 grid place-items-center rounded-full border border-[#c9cfcc] disabled:opacity-40 hover:bg-[#f3f5f4]"><Plus size={16} /></button>
      </div>
    </div>
  );
}

// Strenges 7-Spalten-Raster, gleich große Zellen (Crouwel-Raise).
function RangeCalendar({ today, checkIn, checkOut, onChange }: { today: string; checkIn: string | null; checkOut: string | null; onChange: (a: string | null, b: string | null) => void }) {
  const [month, setMonth] = useState(() => {
    const base = parseISODate(checkIn ?? today);
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [hover, setHover] = useState<string | null>(null);
  const months = [month, new Date(month.getFullYear(), month.getMonth() + 1, 1)];
  const minMonth = new Date(parseISODate(today).getFullYear(), parseISODate(today).getMonth(), 1);

  function pick(d: string) {
    if (!checkIn || (checkIn && checkOut) || d <= checkIn) onChange(d, null);
    else onChange(checkIn, d);
  }
  const rangeEnd = checkOut ?? (checkIn && hover && hover > checkIn ? hover : null);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button type="button" aria-label="Vorheriger Monat" disabled={month <= minMonth} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-[#f3f5f4] disabled:opacity-30"><ChevronLeft size={18} /></button>
        <p className="text-sm text-[#4a5055]">{!checkIn || checkOut ? 'Anreisetag wählen' : 'Abreisetag wählen'}</p>
        <button type="button" aria-label="Nächster Monat" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="h-9 w-9 grid place-items-center rounded-full hover:bg-[#f3f5f4]"><ChevronRight size={18} /></button>
      </div>
      <div className="flex gap-8">
        {months.map((m, idx) => {
          const first = toISODate(m);
          const offset = (m.getDay() + 6) % 7; // Montag zuerst
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          return (
            <div key={first} className={idx === 1 ? 'hidden md:block' : ''}>
              <p className="font-[family-name:var(--font-lettering)] uppercase font-bold text-xl tracking-[0.04em] mb-2">{m.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</p>
              {/* Sichtbares Raster: 1px-Haarlinien zwischen gleich großen Zellen, immer 6 Wochenzeilen. */}
              <div className="grid grid-cols-7 w-[295px] gap-px bg-[#d5dad7] border border-[#d5dad7] text-center" role="grid">
                {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w, wi) => (
                  <span key={w} className={`h-8 text-xs font-semibold leading-8 ${wi >= 5 ? 'bg-[#eef1ef] text-[#3a4045]' : 'bg-[#f6f7f6] text-[#4a5055]'}`}>{w}</span>
                ))}
                {Array.from({ length: 42 }).map((_, cell) => {
                  const i = cell - offset;
                  const weekend = cell % 7 >= 5;
                  if (i < 0 || i >= days) return <span key={`e${cell}`} className={weekend ? 'bg-[#f4f6f5]' : 'bg-[#fbfcfb]'} />;
                  const d = addDays(first, i);
                  const past = d < today;
                  const isStart = d === checkIn;
                  const isEnd = d === rangeEnd;
                  const inRange = checkIn && rangeEnd && d > checkIn && d < rangeEnd;
                  return (
                    <button
                      key={d}
                      type="button"
                      disabled={past}
                      onClick={() => pick(d)}
                      onMouseEnter={() => setHover(d)}
                      aria-pressed={isStart || isEnd}
                      aria-label={formatDateDE(d, { weekday: 'long', day: 'numeric', month: 'long' })}
                      className={`h-[41px] text-sm tabular-nums transition-colors relative
                        ${past ? 'text-[#8a908d] bg-[#f4f5f4] cursor-not-allowed line-through decoration-[#b8bdba]' : weekend ? 'bg-[#f6f8f7] hover:bg-[color-mix(in_oklab,var(--accent)_12%,white)]' : 'bg-white hover:bg-[color-mix(in_oklab,var(--accent)_12%,white)]'}
                        ${isStart || isEnd ? '!bg-[var(--accent)] text-[var(--on-accent)] font-semibold' : ''}
                        ${inRange ? '!bg-[color-mix(in_oklab,var(--accent)_18%,white)]' : ''}
                        ${d === today && !isStart ? 'font-bold underline underline-offset-4' : ''}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Zimmerangebote
// ---------------------------------------------------------------------
const STATUS_TEXT = (o: Offer, persons: number, minStay: number): { text: string; tone: 'ok' | 'scarce' | 'off' } => {
  switch (o.status) {
    case 'available': return { text: 'Frei', tone: 'ok' };
    case 'few_left': return { text: o.freeRooms === 1 ? 'Nur noch 1 Zimmer frei' : `Nur noch ${o.freeRooms} Zimmer frei`, tone: 'scarce' };
    case 'sold_out': return { text: 'In diesem Zeitraum ausgebucht', tone: 'off' };
    case 'too_small': return { text: `Für ${persons} Personen zu klein (max. ${o.maxGuests})`, tone: 'off' };
    case 'min_stay': return { text: `Mindestaufenthalt ${minStay} Nächte`, tone: 'off' };
    case 'no_price': return { text: 'Preis auf Anfrage', tone: 'off' };
  }
};

function Offers({ offers, stale, minStay, persons, nights, selection, onSelect, onContinue, hotel, searching }: {
  offers: Offer[] | null; stale: boolean; minStay: number; persons: number; nights: number;
  selection: { offer: Offer; rate: Rate } | null; onSelect: (o: Offer, r: Rate) => void; onContinue: () => void; hotel: PublicHotel; searching: boolean;
}) {
  if (!offers) {
    return (
      <div className="rounded-[4px] border border-dashed border-[#c3c9c6] px-6 py-10 text-center text-[#4a5055]">
        <p className="font-semibold text-[#22262a]">Wann möchten Sie kommen?</p>
        <p className="mt-1 text-sm">Wählen Sie oben Ihre Reisedaten. Wir zeigen Ihnen sofort alle freien Zimmer mit Gesamtpreis.</p>
      </div>
    );
  }
  const bookable = offers.filter((o) => o.status === 'available' || o.status === 'few_left');
  const unavailable = offers.filter((o) => !bookable.includes(o));
  const ordered = bookable;
  const priceOf = (o: Offer) => (o.rates.length ? Math.min(...o.rates.map((r) => r.quote.grandTotal)) : 0);
  const featuredId = bookable.length > 1 ? [...bookable].sort((a, b) => priceOf(b) - priceOf(a))[0].roomTypeId : null;

  return (
    <section aria-busy={searching} className={searching ? 'opacity-60 transition-opacity' : ''}>
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <h2 className="font-[family-name:var(--font-lettering)] uppercase text-3xl font-bold tracking-[0.01em]">Unsere Zimmer</h2>
        <p className="text-sm text-[#4a5055]">{bookable.length} von {offers.length} frei · {nights} {nights === 1 ? 'Nacht' : 'Nächte'}</p>
      </div>
      {stale && <p role="status" className="mb-3 text-sm text-[#7a4a12] bg-[#fdf3e3] border border-[#f0d9b5] rounded-[4px] px-3 py-2">Sie haben Ihre Reisedaten geändert. Bitte „Verfügbarkeit prüfen“ drücken, um Preise zu aktualisieren.</p>}
      {bookable.length === 0 && (
        <p className="mb-4 text-[15px] text-[#3a4045]">
          Für diesen Zeitraum ist leider nichts mehr frei. Probieren Sie andere Daten{hotel.phone ? <> oder rufen Sie uns an: <a className="underline underline-offset-4 font-medium" href={`tel:${hotel.phone.replace(/\s/g, '')}`}>{hotel.phone}</a></> : ''}.
        </p>
      )}
      <ul className="space-y-4">
        {ordered.map((o, idx) => {
          const st = STATUS_TEXT(o, persons, minStay);
          const isSel = selection?.offer.roomTypeId === o.roomTypeId;
          const dim = selection && !isSel;
          const canBook = st.tone !== 'off' && !stale;
          const fromNight = o.rates.length ? Math.min(...o.rates.map((r) => r.quote.grandTotal / r.quote.nights)) : null;
          // Das Spitzenzimmer (höchster Preis) bekommt die große Kartenvorderseite statt der Marke.
          const featured = o.roomTypeId === featuredId && !!o.imageUrl;
          return (
            <li key={o.roomTypeId}
              className={`bg-[#fbfaf7] rounded-[3px] border transition-[opacity,filter,box-shadow,border-color,transform] duration-200
                ${isSel ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-[0_18px_40px_-18px_rgba(20,30,30,0.55)] -translate-y-0.5' : 'border-[#dfe3e1]'}
                ${dim ? 'opacity-75 saturate-[0.35] hover:opacity-100 hover:saturate-100 focus-within:opacity-100 focus-within:saturate-100' : ''}`}>
              {featured && (
                <div className="p-2 pb-0">
                  <div className="relative aspect-[16/7] overflow-hidden rounded-[2px] bg-[var(--accent)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={o.imageUrl!} alt={`${o.name}: Zimmeransicht`} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <div className="absolute left-4 right-4 bottom-3 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1 text-white drop-shadow">
                      <p className="font-[family-name:var(--font-lettering)] uppercase font-bold text-2xl sm:text-3xl md:text-4xl leading-none">{o.name}</p>
                    {fromNight != null && (
                      <p className="font-[family-name:var(--font-lettering)] font-bold text-lg sm:text-xl leading-none tabular-nums">ab {Math.round(fromNight)} € / Nacht</p>
                    )}
                    </div>
                  </div>
                </div>
              )}
              <div className={`p-4 grid gap-4 ${featured ? '' : 'sm:grid-cols-[112px_minmax(0,1fr)]'}`}>
                {!featured && <Stamp imageUrl={o.imageUrl} label={o.name} variant={idx} value={fromNight != null ? `ab ${Math.round(fromNight)} €` : undefined} />}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className={featured ? 'sr-only' : 'text-lg font-semibold leading-tight'}>{o.name}</h3>
                    <span className={`text-xs font-semibold rounded-[3px] px-2 py-1 ${st.tone === 'ok' ? 'bg-[#e6efe9] text-[#24563d]' : st.tone === 'scarce' ? 'bg-[#f8e3de] text-[#8e2f1f]' : 'bg-[#eceeed] text-[#4a5055]'}`}>{st.text}</span>
                  </div>
                  <p className="mt-1 text-sm text-[#4a5055]">
                    {[o.sizeSqm && `${o.sizeSqm} m²`, o.maxGuests && `bis ${o.maxGuests} ${o.maxGuests === 1 ? 'Person' : 'Personen'}`].filter(Boolean).join(' · ')}
                  </p>
                  {o.description && <p className="mt-2 text-[15px] leading-relaxed text-[#3a4045] max-w-[62ch]">{o.description}</p>}
                  {o.amenities.length > 0 && <p className="mt-2 text-sm text-[#4a5055]">{o.amenities.join(' · ')}</p>}
                </div>
              </div>
              {canBook && o.rates.length > 0 && (
                <div className="border-t border-[#e4e7e5]">
                  <ul aria-label={`Preise für ${o.name}`}>
                    {o.rates.map((r) => {
                      const chosen = isSel && selection?.rate.ratePlanId === r.ratePlanId;
                      return (
                        <li key={r.ratePlanId} className={`px-4 py-3 grid grid-cols-[minmax(0,1fr)_auto] sm:grid-cols-[minmax(0,1fr)_auto_112px] gap-x-4 gap-y-2 items-start border-b last:border-b-0 border-[#eceeed] ${chosen ? 'bg-[color-mix(in_oklab,var(--accent)_8%,white)]' : ''}`}>
                          <div className="min-w-0 text-sm">
                            <p className="font-medium text-[15px]">{r.name}</p>
                            {r.description && <p className="text-[#5a6065]">{r.description}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold tabular-nums whitespace-nowrap">{eur(r.quote.grandTotal)}</p>
                            <p className="text-xs text-[#5a6065] tabular-nums">{eur(r.quote.grandTotal / r.quote.nights)} / Nacht<span className="hidden sm:inline"> · inkl. {hotel.touristTaxLabel}</span></p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelect(o, r)}
                            aria-pressed={chosen}
                            className={`col-span-2 sm:col-span-1 h-11 sm:h-10 w-full rounded-[4px] text-sm font-semibold border transition-colors whitespace-nowrap
                              ${chosen ? 'bg-[var(--accent)] text-[var(--on-accent)] border-[var(--accent)]' : 'border-[var(--accent)] text-[#22262a] hover:bg-[color-mix(in_oklab,var(--accent)_10%,white)]'}`}
                          >
                            {chosen ? <span className="inline-flex items-center gap-1"><Check size={15} /> Gewählt</span> : 'Wählen'}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {unavailable.length > 0 && (
        <div className="mt-5 rounded-[3px] border border-dashed border-[#c3c9c6] px-4 py-3">
          <p className="text-sm font-semibold text-[#3a4045]">Für Ihre Reise nicht verfügbar</p>
          <ul className="mt-1 divide-y divide-[#e4e7e5] text-sm">
            {unavailable.map((o) => (
              <li key={o.roomTypeId} className="flex flex-wrap justify-between gap-x-4 py-1.5">
                <span className="text-[#22262a]">{o.name}</span>
                <span className="text-[#4a5055]">{STATUS_TEXT(o, persons, minStay).text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {selection && (
        <div className="hidden lg:flex mt-6 justify-end">
          <PrimaryButton onClick={onContinue}>Weiter zu Ihren Daten</PrimaryButton>
        </div>
      )}
    </section>
  );
}

// Je Zimmer eine eigene Markenserie: andere Bergkette, anderer Himmel.
const STAMP_MOTIFS: { sky: string; far: string; near: string }[] = [
  { sky: '0.00', far: 'M0 80 L22 58 L36 70 L58 40 L74 62 L100 46 L100 120 L0 120Z', near: 'M0 96 L30 84 L56 96 L80 86 L100 94 L100 120 L0 120Z' },
  { sky: '0.10', far: 'M0 70 L18 52 L40 66 L50 34 L68 58 L86 48 L100 60 L100 120 L0 120Z', near: 'M0 92 L24 86 L48 98 L76 88 L100 98 L100 120 L0 120Z' },
  { sky: '0.18', far: 'M0 84 L30 44 L44 60 L62 30 L84 64 L100 54 L100 120 L0 120Z', near: 'M0 100 L20 90 L44 94 L70 84 L100 92 L100 120 L0 120Z' },
  { sky: '0.26', far: 'M0 64 L16 74 L34 48 L54 70 L72 38 L100 72 L100 120 L0 120Z', near: 'M0 94 L36 86 L60 100 L84 90 L100 96 L100 120 L0 120Z' },
  { sky: '0.34', far: 'M0 76 L26 62 L42 40 L60 56 L80 42 L100 66 L100 120 L0 120Z', near: 'M0 98 L28 92 L52 86 L78 96 L100 88 L100 120 L0 120Z' },
];

function Stamp({ imageUrl, label, value, small, variant = 0 }: { imageUrl: string | null; label: string; value?: string; small?: boolean; variant?: number }) {
  const m = STAMP_MOTIFS[variant % STAMP_MOTIFS.length];
  return (
    <div className={`stamp-edge p-[7px] ${small ? 'w-[76px] h-[92px]' : 'w-[112px] h-[136px]'} shrink-0`} aria-hidden>
      <div className="relative h-full w-full overflow-hidden bg-[var(--accent)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <svg viewBox="0 0 100 120" className="h-full w-full" preserveAspectRatio="xMidYMax slice">
            <rect width="100" height="120" fill="#000" opacity={m.sky} />
            <path d={m.far} fill="#fff" opacity="0.24" />
            <path d={m.near} fill="#000" opacity="0.2" />
          </svg>
        )}
        <span lang="de" className={`absolute left-1.5 right-1.5 bottom-1 text-white font-[family-name:var(--font-lettering)] uppercase font-bold leading-[0.95] drop-shadow hyphens-auto ${small ? 'text-[9.5px]' : 'text-[13px]'} line-clamp-3`}>{label}</span>
        {value && <span className="absolute top-1 right-1.5 text-white font-[family-name:var(--font-lettering)] font-bold text-[13px] leading-none drop-shadow tabular-nums">{value}</span>}
      </div>
    </div>
  );
}

/** Getrennter MwSt.-Ausweis (Übernachtung ermäßigt, Frühstück regulär, Kurtaxe ohne). */
function VatLines({ quote }: { quote: Quote }) {
  const parts = vatSummary(quote.lines).filter((v) => v.rate > 0);
  if (parts.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-[#5a6065] tabular-nums">
      {parts.map((v) => (
        <span key={v.rate} className="block">
          enth. MwSt. {v.rate.toLocaleString('de-DE')} % ({v.rate < 10 ? 'Übernachtung' : 'Frühstück/Extras'}): {eur(v.vat)}
        </span>
      ))}
    </p>
  );
}

// ---------------------------------------------------------------------
// Kartenrückseite = Buchungszusammenfassung (Signatur: Poststempel)
// ---------------------------------------------------------------------
function Postmark({ hotel, checkIn, checkOut, hit }: { hotel: PublicHotel; checkIn: string | null; checkOut: string | null; hit: boolean }) {
  const top = (hotel.city ?? hotel.name).toUpperCase();
  const fmt = (s: string) => formatDateDE(s, { day: '2-digit', month: '2-digit' });
  return (
    <svg viewBox="0 0 220 120" className={`w-[150px] h-[82px] text-[#3d3a6e] ${hit ? 'postmark-hit' : ''}`} style={{ transform: 'rotate(-12deg)' }} aria-hidden>
      {/* Entwertungswellen über der Marke */}
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M110 ${34 + i * 14} q 14 -8 28 0 t 28 0 t 28 0 t 28 0`} fill="none" stroke="currentColor" strokeWidth="2.2" opacity={hit ? 0.85 : 0.25} />
      ))}
      <defs>
        <path id="pm-top" d="M 22 82 A 43 43 0 1 1 98 82" />
        <path id="pm-bottom" d="M 30 84 A 36 36 0 0 0 90 84" />
      </defs>
      <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="2.4" opacity="0.85" />
      <circle cx="60" cy="60" r="34" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.6" />
      <text fontSize={Math.min(10, 170 / Math.max(top.length, 1))} fontWeight="700" letterSpacing="1" fill="currentColor" opacity="0.9">
        <textPath href="#pm-top" startOffset="50%" textAnchor="middle">{top.slice(0, 26)}</textPath>
      </text>
      <text fontSize="8" letterSpacing="1" fill="currentColor" opacity="0.8">
        <textPath href="#pm-bottom" startOffset="50%" textAnchor="middle">DIREKT GEBUCHT</textPath>
      </text>
      <text x="60" y="57" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" className="tabular-nums">{checkIn ? fmt(checkIn) : '— . —'}</text>
      <text x="60" y="72" textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor" className="tabular-nums">{checkOut ? fmt(checkOut) : '— . —'}</text>
    </svg>
  );
}

function PostcardBack({ hotel, checkIn, checkOut, adults, kids, selection, cancelled }: {
  hotel: PublicHotel; checkIn: string | null; checkOut: string | null; adults: number; kids: number;
  selection: { offer: Offer; rate: Rate } | null; cancelled: boolean;
}) {
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const rows: [string, string | null][] = [
    ['Zimmer', selection?.offer.name ?? null],
    ['Verpflegung', selection?.rate.name ?? null],
    ['Anreise', checkIn ? `${formatDateDE(checkIn, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}, ab ${hotel.checkInFrom} Uhr` : null],
    ['Abreise', checkOut ? `${formatDateDE(checkOut, { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' })}, bis ${hotel.checkOutUntil} Uhr` : null],
    ['Gäste', `${adults} ${adults === 1 ? 'Erwachsener' : 'Erwachsene'}${kids ? `, ${kids} ${kids === 1 ? 'Kind' : 'Kinder'}` : ''}${nights ? ` · ${nights} ${nights === 1 ? 'Nacht' : 'Nächte'}` : ''}`],
  ];
  const q = selection?.rate.quote;
  return (
    <aside aria-label="Ihre Buchung" className="bg-[#fbfaf7] rounded-[3px] border border-[#dfe3e1] shadow-[0_10px_30px_-14px_rgba(30,40,40,0.35)] p-5">
      <div className="flex items-start justify-between">
        <p className="font-[family-name:var(--font-lettering)] uppercase font-bold text-2xl tracking-[0.04em] text-[#3d3a6e]">Postkarte</p>
        <div className="relative">
          <Stamp imageUrl={selection?.offer.imageUrl ?? null} label={selection?.offer.name ?? hotel.name} small />
          <div className="absolute -left-[78px] top-6 pointer-events-none">
            <Postmark key={cancelled ? 'hit' : 'idle'} hotel={hotel} checkIn={checkIn} checkOut={checkOut} hit={cancelled} />
          </div>
        </div>
      </div>
      <dl className="mt-4 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="border-b border-[#cfd5d2] py-2 grid grid-cols-[92px_1fr] gap-2">
            <dt className="text-[#5a6065]">{k}</dt>
            <dd className={v ? 'font-medium' : 'text-[#62686d] italic'}>{v ?? 'noch offen'}</dd>
          </div>
        ))}
      </dl>
      {q ? (
        <div className="mt-4 text-sm">
          <table className="w-full tabular-nums">
            <tbody>
              {q.lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pr-2 text-[#3a4045]">{l.category === 'breakfast' ? `Frühstück (${l.quantity}×)` : l.category === 'lodging' ? `${l.quantity} ${l.quantity === 1 ? 'Nacht' : 'Nächte'} × ${eur(l.unit_price)}` : l.description}</td>
                  <td className="py-1 text-right whitespace-nowrap">{eur(l.total)}</td>
                </tr>
              ))}
              <tr className="border-t border-[#22262a]">
                <td className="pt-2 font-semibold">Gesamt</td>
                <td className="pt-2 text-right font-semibold text-lg">{eur(q.grandTotal)}</td>
              </tr>
            </tbody>
          </table>
          <VatLines quote={q} />
          <p className="mt-1 text-xs text-[#5a6065]">Zahlung vor Ort im Hotel.</p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-[#5a6065]">Ihre Auswahl erscheint hier, sobald Sie ein Zimmer wählen.</p>
      )}
      {/* Schreib- und Adresshälfte wie auf der Rückseite einer Ansichtskarte */}
      <div className="mt-5 pt-4 border-t border-[#cfd5d2] grid grid-cols-[1fr_1.35fr] gap-4">
        <p className="font-[family-name:var(--font-lettering)] uppercase font-semibold text-lg leading-tight text-[#3d3a6e] self-end">
          {cancelled ? 'Wir freuen uns auf Sie!' : 'Viele Grüße aus dem Urlaub'}
        </p>
        <address className="not-italic border-l border-[#cfd5d2] pl-4 text-sm text-[#3a4045]">
          <span className="text-xs text-[#5a6065]">An</span>
          {[hotel.name, hotel.street, [hotel.postalCode, hotel.city].filter(Boolean).join(' ')].filter(Boolean).map((line, i) => (
            <span key={i} className={`block border-b border-[#cfd5d2] py-1 ${i === 0 ? 'font-semibold' : ''}`}>{line}</span>
          ))}
        </address>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------
// Gastdaten
// ---------------------------------------------------------------------
function GuestForm({ hotel, selection, stay, onBack, onBooked, onSoldOut }: {
  hotel: PublicHotel;
  selection: { offer: Offer; rate: Rate };
  stay: { checkIn: string; checkOut: string; adults: number; childrenAges: number[] };
  onBack: () => void;
  onBooked: (r: { code: string; emailSent: boolean; guestName: string; email: string }) => void;
  onSoldOut: () => void;
}) {
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', street: '', postalCode: '', city: '', country: 'DE', message: '', website: '' });
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const missing = {
    firstName: !f.firstName.trim(),
    lastName: !f.lastName.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()),
    accept: !accept,
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.values(missing).some(Boolean)) {
      setError('Bitte füllen Sie die markierten Felder aus.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/${hotel.slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...stay,
          roomTypeId: selection.offer.roomTypeId,
          ratePlanId: selection.rate.ratePlanId,
          acceptTerms: accept,
          website: f.website,
          guest: f,
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(data.error);
        setTimeout(onSoldOut, 2200);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? 'Die Buchung ist fehlgeschlagen.');
      onBooked({ code: data.bookingCode, emailSent: data.emailSent, guestName: f.firstName.trim(), email: f.email.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Die Buchung ist fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setSubmitting(false);
    }
  }

  const input = (bad: boolean) =>
    `h-12 w-full rounded-[4px] border bg-white px-3 text-[15px] text-[#22262a] placeholder:text-[#9aa09d] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30 focus:border-[var(--accent)] ${bad ? 'border-[#b8432f]' : 'border-[#c3c9c6]'}`;

  return (
    <form onSubmit={submit} noValidate className="bg-[#fbfaf7] rounded-[3px] border border-[#dfe3e1] p-5 md:p-6">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-[#4a5055] hover:text-[#22262a] underline-offset-4 hover:underline">
        <ArrowLeft size={16} /> Zurück zur Zimmerauswahl
      </button>
      <h2 className="mt-3 font-[family-name:var(--font-lettering)] uppercase text-3xl font-bold tracking-[0.01em]">Ihre Angaben</h2>
      <p className="mt-1 text-sm text-[#4a5055]">{selection.offer.name} · {selection.rate.name} · {shortDate(stay.checkIn)} – {shortDate(stay.checkOut)}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Labeled label="Vorname" required error={touched && missing.firstName ? 'Bitte Vornamen angeben.' : null}>
          <input autoComplete="given-name" value={f.firstName} onChange={set('firstName')} className={input(touched && missing.firstName)} />
        </Labeled>
        <Labeled label="Nachname" required error={touched && missing.lastName ? 'Bitte Nachnamen angeben.' : null}>
          <input autoComplete="family-name" value={f.lastName} onChange={set('lastName')} className={input(touched && missing.lastName)} />
        </Labeled>
        <Labeled label="E-Mail" required hint="Hierhin senden wir die Bestätigung." error={touched && missing.email ? 'Bitte eine gültige E-Mail-Adresse angeben.' : null}>
          <input type="email" autoComplete="email" inputMode="email" value={f.email} onChange={set('email')} className={input(touched && missing.email)} />
        </Labeled>
        <Labeled label="Telefon" hint="Für Rückfragen am Anreisetag.">
          <input type="tel" autoComplete="tel" value={f.phone} onChange={set('phone')} className={input(false)} />
        </Labeled>
        <Labeled label="Straße und Hausnummer" className="sm:col-span-2">
          <input autoComplete="street-address" value={f.street} onChange={set('street')} className={input(false)} />
        </Labeled>
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <Labeled label="PLZ">
            <input autoComplete="postal-code" value={f.postalCode} onChange={set('postalCode')} className={input(false)} />
          </Labeled>
          <Labeled label="Ort">
            <input autoComplete="address-level2" value={f.city} onChange={set('city')} className={input(false)} />
          </Labeled>
        </div>
        <Labeled label="Land">
          <select autoComplete="country" value={f.country} onChange={set('country')} className={input(false)}>
            {COUNTRIES.map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </Labeled>
        <Labeled label="Nachricht an das Hotel" hint="Z. B. Ankunftszeit, Allergien, Anlass der Reise." className="sm:col-span-2">
          <textarea rows={3} value={f.message} onChange={set('message')} className={`${input(false)} h-auto py-2`} />
        </Labeled>
        {/* Honeypot: für Menschen unsichtbar */}
        <input tabIndex={-1} autoComplete="off" value={f.website} onChange={set('website')} className="hidden" aria-hidden name="website" />
      </div>

      <div className="mt-5 rounded-[4px] bg-[#f0f2f1] p-4 text-sm text-[#3a4045] space-y-2">
        <p><strong>Zahlung vor Ort.</strong> Sie zahlen bequem bei der Abreise im Hotel ({eur(selection.rate.quote.grandTotal)}, davon {hotel.touristTaxLabel} {eur(selection.rate.quote.touristTaxTotal)}).</p>
        {selection.rate.cancellation && <p><strong>Stornierung.</strong> {selection.rate.cancellation}</p>}
        <label className="flex items-start gap-3 pt-1 cursor-pointer">
          <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} className="mt-0.5 h-5 w-5 accent-[var(--accent)]" />
          <span className={touched && missing.accept ? 'text-[#8e2f1f] font-medium' : ''}>
            Ich buche verbindlich und akzeptiere die Stornobedingungen. Meine Daten werden zur Abwicklung der Buchung verarbeitet.
          </span>
        </label>
      </div>

      {error && <p role="alert" className="mt-4 text-sm font-medium text-[#8e2f1f]">{error}</p>}

      <div className="mt-5 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-[#4a5055]">
          <p>Gesamt <span className="text-lg font-semibold text-[#22262a] tabular-nums">{eur(selection.rate.quote.grandTotal)}</span></p>
          <VatLines quote={selection.rate.quote} />
        </div>
        <PrimaryButton type="submit" loading={submitting}>Verbindlich buchen</PrimaryButton>
      </div>
    </form>
  );
}

function Labeled({ label, required, hint, error, children, className = '' }: { label: string; required?: boolean; hint?: string; error?: string | null; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="font-medium text-[#3a4045]">{label}{required && <span className="text-[#8e2f1f]" aria-hidden> *</span>}</span>
      {children}
      {error ? <span className="text-xs text-[#8e2f1f]">{error}</span> : hint ? <span className="text-xs text-[#5a6065]">{hint}</span> : null}
    </label>
  );
}

// ---------------------------------------------------------------------
// Bestätigung: Karte dreht sich, Stempel entwertet die Marke
// ---------------------------------------------------------------------
function Confirmation({ hotel, result }: { hotel: PublicHotel; result: { code: string; emailSent: boolean; guestName: string; email: string } }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <section className="card-flip bg-[#fbfaf7] rounded-[3px] border border-[#dfe3e1] shadow-[0_12px_32px_-16px_rgba(20,30,30,0.5)] p-6 md:p-8">
      <h2 ref={headingRef} tabIndex={-1} className="font-[family-name:var(--font-lettering)] uppercase text-4xl md:text-5xl font-bold tracking-[0.01em] leading-none outline-none">
        Bis bald, {result.guestName}!
      </h2>
      <p className="mt-3 text-[15px] text-[#3a4045] max-w-[58ch]">
        {hotel.isDemo
          ? <>So sieht die Bestätigung für Ihre Gäste aus. Die Demo-Buchung erscheint sofort im PMS des Vorführhotels; an <strong>{result.email}</strong> wird keine E-Mail verschickt.</>
          : <>Ihre Buchung ist bestätigt. {result.emailSent
            ? <>Die Bestätigung ist an <strong>{result.email}</strong> unterwegs.</>
            : <>Das Hotel schickt Ihnen die Bestätigung in Kürze an <strong>{result.email}</strong>.</>}</>}
      </p>
      <div className="mt-6 inline-flex flex-col rounded-[4px] border-2 border-dashed border-[#3d3a6e] px-5 py-3 text-[#3d3a6e]">
        <span className="text-xs font-semibold uppercase tracking-[0.08em]">Buchungsnummer</span>
        <span className="text-3xl font-bold tabular-nums tracking-[0.12em]">{result.code}</span>
      </div>
      <p className="mt-6 text-sm text-[#4a5055]">
        Anreise ab {hotel.checkInFrom} Uhr. Fragen? {hotel.phone ? <>Rufen Sie uns an: <a className="underline underline-offset-4" href={`tel:${hotel.phone.replace(/\s/g, '')}`}>{hotel.phone}</a></> : hotel.email ? <>Schreiben Sie an <a className="underline underline-offset-4" href={`mailto:${hotel.email}`}>{hotel.email}</a></> : 'Antworten Sie einfach auf die Bestätigung.'}
      </p>
    </section>
  );
}
