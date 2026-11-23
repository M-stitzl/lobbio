import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getAuthenticatedHotelId } from '@/lib/api-auth';
import { vatSummary } from '@/lib/pms/stay';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Erstellt aus allen noch nicht abgerechneten Folio-Positionen einer Buchung
// eine Rechnung mit fortlaufender Nummer und schreibt Empfänger, Aussteller,
// Positionen und Summen als unveränderlichen Schnappschuss fest.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const hotelId = await getAuthenticatedHotelId(req);
  if (!hotelId) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });

  const [{ data: booking }, { data: hotel }, { data: items }] = await Promise.all([
    supabaseAdmin.from('bookings').select('id, hotel_id, check_in, check_out, booking_code, room_type, guests(name, street, postal_code, city, country, email)').eq('id', id).eq('hotel_id', hotelId).maybeSingle(),
    supabaseAdmin.from('hotels').select('name, legal_name, street, postal_code, city, phone, email, tax_number, vat_id, bank_details, is_demo').eq('id', hotelId).maybeSingle(),
    supabaseAdmin.from('folio_items').select('*').eq('booking_id', id).eq('hotel_id', hotelId).is('invoice_id', null).order('service_date'),
  ]);

  if (!booking || !hotel) return NextResponse.json({ error: 'Buchung nicht gefunden.' }, { status: 404 });
  if (!items || items.length === 0) return NextResponse.json({ error: 'Es gibt keine offenen Positionen zum Abrechnen.' }, { status: 400 });
  if (!hotel.tax_number && !hotel.vat_id) {
    return NextResponse.json({ error: 'Für Rechnungen fehlt die Steuernummer oder USt-IdNr. (Einstellungen → Hotel & Rechnung).' }, { status: 400 });
  }

  const guest = (Array.isArray(booking.guests) ? booking.guests[0] : booking.guests) as
    | { name: string; street: string | null; postal_code: string | null; city: string | null; country: string | null; email: string | null }
    | null;

  const lines = items.map((i) => ({
    service_date: i.service_date,
    description: i.description,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
    vat_rate: Number(i.vat_rate),
    total: Math.round(Number(i.quantity) * Number(i.unit_price) * 100) / 100,
  }));
  const vat = vatSummary(lines);
  const totalGross = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;

  // § 14 Abs. 4 UStG: Anschrift des Empfängers ist Pflicht; nur
  // Kleinbetragsrechnungen bis 250 € brutto (§ 33 UStDV) dürfen ohne.
  if (totalGross > 250 && (!guest?.street || !guest?.city)) {
    return NextResponse.json(
      { error: 'Für Rechnungen über 250 € ist die Anschrift des Gastes Pflicht. Bitte zuerst den Meldeschein (oder die Gastadresse) ausfüllen.' },
      { status: 400 },
    );
  }

  const { data: paymentsData } = await supabaseAdmin.from('payments').select('amount').eq('booking_id', id).eq('hotel_id', hotelId);
  const paid = Math.round((paymentsData ?? []).reduce((s, p) => s + Number(p.amount), 0) * 100) / 100;

  const { data: number, error: numError } = await supabaseAdmin.rpc('next_invoice_number', { p_hotel_id: hotelId });
  if (numError || !number) {
    console.error('invoice: Nummernvergabe fehlgeschlagen', numError);
    return NextResponse.json({ error: 'Rechnungsnummer konnte nicht vergeben werden.' }, { status: 500 });
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .insert({
      hotel_id: hotelId,
      booking_id: id,
      number,
      recipient: {
        name: guest?.name ?? 'Gast',
        street: guest?.street ?? null,
        postal_code: guest?.postal_code ?? null,
        city: guest?.city ?? null,
        country: guest?.country ?? null,
      },
      issuer: hotel,
      lines,
      totals: {
        gross: totalGross,
        vat,
        paid,
        open: Math.round((totalGross - paid) * 100) / 100,
        stay: { check_in: booking.check_in, check_out: booking.check_out, booking_code: booking.booking_code, room_type: booking.room_type },
      },
      total_gross: totalGross,
    })
    .select('id, number')
    .single();

  if (error || !invoice) {
    console.error('invoice: Anlegen fehlgeschlagen', error);
    return NextResponse.json({ error: 'Rechnung konnte nicht angelegt werden.' }, { status: 500 });
  }

  const { error: linkError } = await supabaseAdmin
    .from('folio_items')
    .update({ invoice_id: invoice.id })
    .in('id', items.map((i) => i.id));
  if (linkError) console.error('invoice: Positionen konnten nicht verknüpft werden', linkError);

  return NextResponse.json({ id: invoice.id, number: invoice.number });
}
