import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getPortalHotel, type PortalHotel } from '@/lib/pms/portal-data';
import { buildOffers, validateStay } from '@/lib/pms/offers';
import { eur, formatDateDE, type Quote } from '@/lib/pms/stay';
import { getGmailClient, sendGmailMessage, type PlatformConnectionRow } from '@/lib/google-gmail';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const clean = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const ERRORS: Record<string, [string, number]> = {
  NOT_AVAILABLE: ['Dieses Zimmer wurde gerade vergeben. Bitte wählen Sie ein anderes.', 409],
  TOO_MANY_GUESTS: ['Für diese Personenzahl ist das Zimmer zu klein.', 400],
  ROOM_TYPE_NOT_FOUND: ['Dieses Zimmer ist nicht online buchbar.', 400],
  INVALID_DATES: ['Bitte die Reisedaten prüfen.', 400],
};

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hotel = await getPortalHotel(slug);
  if (!hotel) return NextResponse.json({ error: 'Dieses Hotel ist nicht online buchbar.' }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });
  }

  // Honeypot gegen einfache Bots: echtes Formular lässt das Feld leer.
  if (clean(body.website)) return NextResponse.json({ error: 'Ungültige Anfrage.' }, { status: 400 });

  const stay = validateStay({
    checkIn: body.checkIn,
    checkOut: body.checkOut,
    adults: body.adults,
    childrenAges: body.childrenAges,
  });
  if (typeof stay === 'string') return NextResponse.json({ error: stay }, { status: 400 });

  const g = (body.guest ?? {}) as Record<string, unknown>;
  const guest = {
    firstName: clean(g.firstName, 80),
    lastName: clean(g.lastName, 80),
    email: clean(g.email, 160),
    phone: clean(g.phone, 40),
    street: clean(g.street, 120),
    postalCode: clean(g.postalCode, 12),
    city: clean(g.city, 80),
    country: clean(g.country, 2).toUpperCase() || 'DE',
    message: clean(g.message, 1000),
  };
  if (!guest.firstName || !guest.lastName) return NextResponse.json({ error: 'Bitte Vor- und Nachnamen angeben.' }, { status: 400 });
  if (!EMAIL_RE.test(guest.email)) return NextResponse.json({ error: 'Bitte eine gültige E-Mail-Adresse angeben.' }, { status: 400 });
  if (body.acceptTerms !== true) return NextResponse.json({ error: 'Bitte bestätigen Sie die Buchungsbedingungen.' }, { status: 400 });

  // Preis IMMER serverseitig neu berechnen – nie dem Browser vertrauen.
  const { offers } = await buildOffers(hotel, stay);
  const offer = offers.find((o) => o.roomTypeId === body.roomTypeId);
  const rate = offer?.rates.find((r) => r.ratePlanId === body.ratePlanId);
  if (!offer || !rate) return NextResponse.json({ error: 'Dieses Angebot ist nicht mehr verfügbar.' }, { status: 409 });
  if (offer.status !== 'available' && offer.status !== 'few_left') {
    return NextResponse.json({ error: 'Dieses Zimmer ist für Ihren Zeitraum leider nicht mehr frei.' }, { status: 409 });
  }

  const { data, error } = await supabaseAdmin.rpc('portal_create_booking', {
    p_hotel_id: hotel.id,
    p_room_type_id: offer.roomTypeId,
    p_rate_plan_id: rate.ratePlanId,
    p_check_in: stay.checkIn,
    p_check_out: stay.checkOut,
    p_adults: stay.adults,
    p_children: stay.childrenAges.length,
    p_children_ages: stay.childrenAges,
    p_total_price: rate.quote.grandTotal,
    p_guest_name: `${guest.firstName} ${guest.lastName}`,
    p_guest_email: guest.email,
    p_guest_phone: guest.phone || null,
    p_guest_street: guest.street || null,
    p_guest_postal_code: guest.postalCode || null,
    p_guest_city: guest.city || null,
    p_guest_country: guest.country,
    p_guest_message: guest.message || null,
  });

  if (error) {
    const known = Object.keys(ERRORS).find((k) => error.message?.includes(k));
    if (known) return NextResponse.json({ error: ERRORS[known][0] }, { status: ERRORS[known][1] });
    console.error('portal/book: Buchung fehlgeschlagen', error);
    return NextResponse.json({ error: 'Die Buchung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut oder rufen Sie uns an.' }, { status: 500 });
  }

  const row = Array.isArray(data) ? data[0] : data;
  const bookingId: string = row.booking_id;
  const bookingCode: string = row.booking_code;

  // Folio direkt aus dem Angebot befüllen (Zimmer 7 %, Frühstück 19 %, Kurtaxe 0 %).
  const { error: folioError } = await supabaseAdmin.from('folio_items').insert(
    rate.quote.lines.map((l) => ({
      hotel_id: hotel.id,
      booking_id: bookingId,
      service_date: l.service_date ?? stay.checkIn,
      category: l.category,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unit_price,
      vat_rate: l.vat_rate,
    })),
  );
  if (folioError) console.error('portal/book: Folio konnte nicht angelegt werden', folioError);

  // Aufgabe fürs Hotel, damit die neue Direktbuchung nicht untergeht.
  await supabaseAdmin.from('tasks').insert({
    hotel_id: hotel.id,
    title: `Neue Online-Buchung ${bookingCode}: ${guest.firstName} ${guest.lastName}`,
    description: `${offer.name}, ${formatDateDE(stay.checkIn)} – ${formatDateDE(stay.checkOut)}, ${rate.name}. Zimmer zuweisen.${guest.message ? `\nNachricht des Gastes: ${guest.message}` : ''}`,
    source: 'manual',
    status: 'open',
  });

  // Demo-Betrieb: nie echte Mails verschicken (Vorführende tippen beliebige Adressen ein).
  const emailSent = hotel.is_demo ? false : await sendConfirmation(hotel, {
    to: guest.email,
    name: `${guest.firstName} ${guest.lastName}`,
    code: bookingCode,
    roomName: offer.name,
    rateName: rate.name,
    checkIn: stay.checkIn,
    checkOut: stay.checkOut,
    persons: stay.adults + stay.childrenAges.length,
    quote: rate.quote,
    cancellation: rate.cancellation,
  });

  return NextResponse.json({ bookingCode, emailSent, demo: hotel.is_demo, total: rate.quote.grandTotal });
}

async function sendConfirmation(
  hotel: PortalHotel,
  b: { to: string; name: string; code: string; roomName: string; rateName: string; checkIn: string; checkOut: string; persons: number; quote: Quote; cancellation: string | null },
): Promise<boolean> {
  const { data: account } = await supabaseAdmin
    .from('platform_connections')
    .select('*')
    .eq('hotel_id', hotel.id)
    .eq('platform', 'gmail')
    .maybeSingle();
  const acc = account as PlatformConnectionRow | null;
  if (!acc?.email_address) return false;

  const lines = b.quote.lines.map((l) => `  ${l.description.padEnd(44)} ${eur(l.total)}`).join('\n');
  const text = `Guten Tag ${b.name},

vielen Dank für Ihre Buchung. Wir freuen uns auf Ihren Besuch!

Buchungsnummer: ${b.code}
Zimmer:         ${b.roomName} (${b.rateName})
Anreise:        ${formatDateDE(b.checkIn)}, ab ${hotel.check_in_from.slice(0, 5)} Uhr
Abreise:        ${formatDateDE(b.checkOut)}, bis ${hotel.check_out_until.slice(0, 5)} Uhr
Personen:       ${b.persons}

${lines}
  ${'Gesamt (Zahlung vor Ort)'.padEnd(44)} ${eur(b.quote.grandTotal)}

${b.cancellation ? `Stornobedingungen: ${b.cancellation}\n\n` : ''}Bei Fragen antworten Sie einfach auf diese E-Mail.

Herzliche Grüße
${hotel.name}
${[hotel.street, [hotel.postal_code, hotel.city].filter(Boolean).join(' '), hotel.phone].filter(Boolean).join(' · ')}`;

  try {
    const gmail = await getGmailClient(acc);
    await sendGmailMessage(gmail, {
      fromEmailAddress: acc.email_address,
      fromName: hotel.name,
      toEmailAddress: b.to,
      subject: `Buchungsbestätigung ${b.code} – ${hotel.name}`,
      bodyText: text,
    });
    return true;
  } catch (e) {
    console.error('portal/book: Bestätigungsmail fehlgeschlagen', e);
    return false;
  }
}
