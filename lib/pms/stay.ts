// Gemeinsame, reine PMS-Logik (Client + Server): Datumsrechnung, Belegung,
// Preise, Kurtaxe, MwSt.-Aufteilung. Keine DB-Zugriffe hier, damit Portal,
// PMS-Oberfläche und KI-Verfügbarkeitsprüfung dieselben Regeln verwenden.
//
// Belegungs-Konvention (Nacht-basiert): belegt in Nacht D, wenn
// check_in <= D < check_out. Am Abreisetag ist das Zimmer frei.

export type ISODate = string; // YYYY-MM-DD

export function toISODate(d: Date): ISODate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export function isValidISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return toISODate(parseISODate(s)) === s;
}

/** Anzahl Nächte zwischen Anreise und Abreise. */
export function nightsBetween(checkIn: ISODate, checkOut: ISODate): number {
  const ms = parseISODate(checkOut).getTime() - parseISODate(checkIn).getTime();
  return Math.round(ms / 86_400_000);
}

/** Alle Nächte eines Aufenthalts (ohne Abreisetag). */
export function nightsOf(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

export function occupiesNight(b: { check_in: ISODate; check_out: ISODate }, night: ISODate): boolean {
  return b.check_in <= night && night < b.check_out;
}

// ---------------------------------------------------------------------
// Datentypen (Teilmengen der DB-Zeilen)
// ---------------------------------------------------------------------
export type RoomTypeRow = {
  id: string;
  name: string;
  total_count: number;
  max_guests: number | null;
  base_price: number | null;
};

export type RatePlanRow = {
  id: string;
  name: string;
  breakfast_per_person: number;
  price_adjustment_pct: number;
};

export type SeasonRow = {
  id: string;
  name: string;
  start_date: ISODate;
  end_date: ISODate; // inklusive
  min_stay: number;
  prices: { room_type_id: string; price_per_night: number }[];
};

export type BookingLite = {
  id?: string;
  check_in: ISODate;
  check_out: ISODate;
  status: 'confirmed' | 'pending' | 'cancelled';
  room_type_id: string | null;
  room_type: string;
};

export type TaxSettings = {
  vat_lodging: number;
  vat_standard: number;
  tourist_tax_label: string;
  tourist_tax_per_night: number;
  tourist_tax_min_age: number;
};

// ---------------------------------------------------------------------
// Verfügbarkeit
// ---------------------------------------------------------------------
function bookingMatchesType(b: BookingLite, rt: RoomTypeRow): boolean {
  return b.room_type_id ? b.room_type_id === rt.id : b.room_type === rt.name;
}

/** Freie Zimmer eines Typs je Nacht im Zeitraum, plus Minimum. */
export function availabilityFor(
  rt: RoomTypeRow,
  bookings: BookingLite[],
  checkIn: ISODate,
  checkOut: ISODate,
): { perNight: { night: ISODate; free: number }[]; minFree: number } {
  const relevant = bookings.filter((b) => b.status !== 'cancelled' && bookingMatchesType(b, rt));
  const perNight = nightsOf(checkIn, checkOut).map((night) => ({
    night,
    free: Math.max(0, rt.total_count - relevant.filter((b) => occupiesNight(b, night)).length),
  }));
  const minFree = perNight.length ? Math.min(...perNight.map((n) => n.free)) : rt.total_count;
  return { perNight, minFree };
}

// ---------------------------------------------------------------------
// Preise
// ---------------------------------------------------------------------
export function seasonForNight(seasons: SeasonRow[], night: ISODate): SeasonRow | null {
  // Bei Überschneidung gewinnt die zuletzt beginnende (spezifischere) Saison.
  const hits = seasons.filter((s) => s.start_date <= night && night <= s.end_date);
  hits.sort((a, b) => b.start_date.localeCompare(a.start_date));
  return hits[0] ?? null;
}

export function minStayFor(seasons: SeasonRow[], checkIn: ISODate): number {
  return seasonForNight(seasons, checkIn)?.min_stay ?? 1;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type PriceLine = {
  category: 'lodging' | 'breakfast' | 'tourist_tax';
  description: string;
  service_date: ISODate | null;
  quantity: number;
  unit_price: number; // brutto
  vat_rate: number;
  total: number;
};

export type Quote = {
  nights: number;
  lines: PriceLine[];
  lodgingTotal: number;
  breakfastTotal: number;
  touristTaxTotal: number;
  /** Zimmer + Verpflegung (das, was der Gast „bucht“). */
  stayTotal: number;
  /** inkl. Kurtaxe – fällig vor Ort. */
  grandTotal: number;
  nightly: { night: ISODate; price: number; season: string | null }[];
};

export function quoteStay(args: {
  roomType: RoomTypeRow;
  ratePlan: RatePlanRow | null;
  seasons: SeasonRow[];
  checkIn: ISODate;
  checkOut: ISODate;
  adults: number;
  childrenAges: number[];
  tax: TaxSettings;
}): Quote | null {
  const { roomType, ratePlan, seasons, checkIn, checkOut, adults, childrenAges, tax } = args;
  const nights = nightsOf(checkIn, checkOut);
  if (nights.length === 0) return null;

  const adj = 1 + (ratePlan?.price_adjustment_pct ?? 0) / 100;
  const nightly = nights.map((night) => {
    const season = seasonForNight(seasons, night);
    const seasonal = season?.prices.find((p) => p.room_type_id === roomType.id)?.price_per_night;
    const base = seasonal ?? roomType.base_price;
    return { night, price: base == null ? NaN : round2(Number(base) * adj), season: season?.name ?? null };
  });
  if (nightly.some((n) => Number.isNaN(n.price))) return null; // kein Preis hinterlegt

  const lines: PriceLine[] = [];
  // Zimmerpreise gruppiert nach identischem Nachtpreis (übersichtlichere Rechnung).
  const groups = new Map<number, ISODate[]>();
  for (const n of nightly) groups.set(n.price, [...(groups.get(n.price) ?? []), n.night]);
  for (const [price, ns] of groups) {
    lines.push({
      category: 'lodging',
      description: `Übernachtung ${roomType.name}`,
      service_date: ns[0],
      quantity: ns.length,
      unit_price: price,
      vat_rate: tax.vat_lodging,
      total: round2(price * ns.length),
    });
  }

  const persons = adults + childrenAges.length;
  const bf = Number(ratePlan?.breakfast_per_person ?? 0);
  if (bf > 0) {
    lines.push({
      category: 'breakfast',
      description: 'Frühstück',
      service_date: nights[0],
      quantity: persons * nights.length,
      unit_price: bf,
      vat_rate: tax.vat_standard,
      total: round2(bf * persons * nights.length),
    });
  }

  const taxable = adults + childrenAges.filter((a) => a >= tax.tourist_tax_min_age).length;
  const tt = Number(tax.tourist_tax_per_night);
  if (tt > 0 && taxable > 0) {
    lines.push({
      category: 'tourist_tax',
      description: `${tax.tourist_tax_label} (${taxable} Pers. × ${nights.length} Nächte)`,
      service_date: nights[0],
      quantity: taxable * nights.length,
      unit_price: tt,
      vat_rate: 0,
      total: round2(tt * taxable * nights.length),
    });
  }

  const sum = (c: PriceLine['category']) => round2(lines.filter((l) => l.category === c).reduce((s, l) => s + l.total, 0));
  const lodgingTotal = sum('lodging');
  const breakfastTotal = sum('breakfast');
  const touristTaxTotal = sum('tourist_tax');
  return {
    nights: nights.length,
    lines,
    lodgingTotal,
    breakfastTotal,
    touristTaxTotal,
    stayTotal: round2(lodgingTotal + breakfastTotal),
    grandTotal: round2(lodgingTotal + breakfastTotal + touristTaxTotal),
    nightly,
  };
}

// ---------------------------------------------------------------------
// MwSt.-Aufteilung für Folio/Rechnung (Bruttopreise)
// ---------------------------------------------------------------------
export type VatSummary = { rate: number; gross: number; net: number; vat: number }[];

export function vatSummary(items: { quantity: number; unit_price: number; vat_rate: number }[]): VatSummary {
  const byRate = new Map<number, number>();
  for (const i of items) {
    const rate = Number(i.vat_rate);
    byRate.set(rate, (byRate.get(rate) ?? 0) + Number(i.quantity) * Number(i.unit_price));
  }
  return [...byRate.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([rate, gross]) => {
      const net = round2(gross / (1 + rate / 100));
      return { rate, gross: round2(gross), net, vat: round2(gross - net) };
    });
}

export const eur = (n: number) =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);

export const formatDateDE = (s: ISODate, opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }) =>
  parseISODate(s).toLocaleDateString('de-DE', opts);
