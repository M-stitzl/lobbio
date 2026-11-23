import 'server-only';
import { supabaseAdmin } from '@/lib/supabase-admin';
import type { BookingLite, RatePlanRow, RoomTypeRow, SeasonRow, TaxSettings, ISODate } from './stay';

// Öffentliche Daten eines Hotels für das Buchungsportal. Läuft serverseitig
// mit Service-Role-Key, daher wird hier strikt nur freigegebener Inhalt
// selektiert (keine Gästedaten, keine internen Notizen).

export type PortalHotel = TaxSettings & {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  public_description: string | null;
  street: string | null;
  postal_code: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website_url: string | null;
  accent_color: string;
  hero_image_url: string | null;
  check_in_from: string;
  check_out_until: string;
  cancellation_policy: string | null;
  is_demo: boolean;
};

export type PortalRoomType = RoomTypeRow & {
  description: string | null;
  size_sqm: number | null;
  amenities: string[];
  image_url: string | null;
};

export type PortalRatePlan = RatePlanRow & { description: string | null; cancellation_policy: string | null };

const HOTEL_COLS =
  'id, name, slug, tagline, public_description, street, postal_code, city, phone, email, website_url, accent_color, hero_image_url, check_in_from, check_out_until, cancellation_policy, is_demo, vat_lodging, vat_standard, tourist_tax_label, tourist_tax_per_night, tourist_tax_min_age';

export async function getPortalHotel(slug: string): Promise<PortalHotel | null> {
  if (!/^[a-z0-9-]{1,64}$/.test(slug)) return null;
  const { data } = await supabaseAdmin
    .from('hotels')
    .select(HOTEL_COLS)
    .eq('slug', slug)
    .eq('booking_enabled', true)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    vat_lodging: Number(data.vat_lodging),
    vat_standard: Number(data.vat_standard),
    tourist_tax_per_night: Number(data.tourist_tax_per_night),
  } as PortalHotel;
}

export async function getPortalCatalog(hotelId: string) {
  const [{ data: roomTypes }, { data: ratePlans }, { data: seasons }] = await Promise.all([
    supabaseAdmin
      .from('room_types')
      .select('id, name, total_count, max_guests, base_price, description, size_sqm, amenities, image_url, sort_order')
      .eq('hotel_id', hotelId)
      .eq('bookable_online', true)
      .order('sort_order'),
    supabaseAdmin
      .from('rate_plans')
      .select('id, name, description, breakfast_per_person, price_adjustment_pct, cancellation_policy, sort_order')
      .eq('hotel_id', hotelId)
      .eq('public', true)
      .eq('active', true)
      .order('sort_order'),
    supabaseAdmin
      .from('rate_seasons')
      .select('id, name, start_date, end_date, min_stay, rate_season_prices(room_type_id, price_per_night)')
      .eq('hotel_id', hotelId),
  ]);

  return {
    roomTypes: (roomTypes ?? []).map((r) => ({ ...r, base_price: r.base_price == null ? null : Number(r.base_price) })) as PortalRoomType[],
    ratePlans: (ratePlans ?? []).map((r) => ({
      ...r,
      breakfast_per_person: Number(r.breakfast_per_person),
      price_adjustment_pct: Number(r.price_adjustment_pct),
    })) as PortalRatePlan[],
    seasons: (seasons ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      start_date: s.start_date,
      end_date: s.end_date,
      min_stay: s.min_stay,
      prices: (s.rate_season_prices ?? []).map((p: { room_type_id: string; price_per_night: number }) => ({
        room_type_id: p.room_type_id,
        price_per_night: Number(p.price_per_night),
      })),
    })) as SeasonRow[],
  };
}

/** Nur Zeitraum + Zimmertyp + Status – keine personenbezogenen Daten. */
export async function getOverlappingBookings(hotelId: string, checkIn: ISODate, checkOut: ISODate): Promise<BookingLite[]> {
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('check_in, check_out, status, room_type_id, room_type')
    .eq('hotel_id', hotelId)
    .neq('status', 'cancelled')
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);
  return (data ?? []) as BookingLite[];
}
