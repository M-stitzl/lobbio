import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Barlow_Condensed } from 'next/font/google';
import { getPortalHotel } from '@/lib/pms/portal-data';
import BookingPortal, { type PublicHotel } from './portal';

// Ortsname-Lettering der Ansichtskarte; wird von next/font selbst gehostet.
const lettering = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700'], variable: '--font-lettering', display: 'swap' });

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getPortalHotel(slug);
  if (!hotel) return { title: 'Buchung nicht verfügbar' };
  return {
    title: `Direkt buchen – ${hotel.name}`,
    description: hotel.tagline ?? `Zimmer im ${hotel.name}${hotel.city ? ` in ${hotel.city}` : ''} direkt beim Gastgeber buchen.`,
  };
}

export default async function Page({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const hotel = await getPortalHotel(slug);
  if (!hotel) notFound();

  const pub: PublicHotel = {
    slug: hotel.slug,
    name: hotel.name,
    tagline: hotel.tagline,
    description: hotel.public_description,
    street: hotel.street,
    postalCode: hotel.postal_code,
    city: hotel.city,
    phone: hotel.phone,
    email: hotel.email,
    website: hotel.website_url,
    accent: hotel.accent_color,
    heroImage: hotel.hero_image_url,
    checkInFrom: hotel.check_in_from.slice(0, 5),
    checkOutUntil: hotel.check_out_until.slice(0, 5),
    touristTaxLabel: hotel.tourist_tax_label,
    touristTaxPerNight: hotel.tourist_tax_per_night,
    touristTaxMinAge: hotel.tourist_tax_min_age,
    isDemo: hotel.is_demo,
  };

  const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined);
  return (
    <div className={lettering.variable}>
      <BookingPortal
        hotel={pub}
        initial={{ checkIn: str(sp.anreise), checkOut: str(sp.abreise), adults: str(sp.erwachsene) }}
      />
    </div>
  );
}
