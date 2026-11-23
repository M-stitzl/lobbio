import { NextRequest, NextResponse } from 'next/server';
import { getPortalHotel } from '@/lib/pms/portal-data';
import { buildOffers, validateStay } from '@/lib/pms/offers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Öffentlich: liefert Zimmerangebote mit Live-Verfügbarkeit und Preisen.
// Gibt nur die Anzahl freier Zimmer heraus, nie Buchungs- oder Gästedaten.
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const hotel = await getPortalHotel(slug);
  if (!hotel) return NextResponse.json({ error: 'Dieses Hotel ist nicht online buchbar.' }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const stay = validateStay({
    checkIn: sp.get('checkIn'),
    checkOut: sp.get('checkOut'),
    adults: sp.get('adults') ?? '2',
    childrenAges: (sp.get('children') ?? '').split(',').filter(Boolean),
  });
  if (typeof stay === 'string') return NextResponse.json({ error: stay }, { status: 400 });

  const result = await buildOffers(hotel, stay);
  return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
}
