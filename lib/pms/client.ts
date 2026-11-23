'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { ISODate } from './stay';

// Browser-seitiger Datenzugriff für PMS-Seiten. RLS (hotel_id = auth.uid())
// begrenzt automatisch auf das eingeloggte Hotel; bei INSERTs wird hotel_id
// explizit gesetzt.

export type HousekeepingStatus = 'clean' | 'dirty' | 'inspected' | 'out_of_service';

export type Room = {
  id: string;
  room_type_id: string;
  number: string;
  floor: string | null;
  housekeeping_status: HousekeepingStatus;
  housekeeping_note: string | null;
  housekeeping_updated_at: string;
  sort_order: number;
};

export type RoomType = {
  id: string;
  name: string;
  total_count: number;
  max_guests: number | null;
  base_price: number | null;
  description: string | null;
  size_sqm: number | null;
  amenities: string[];
  image_url: string | null;
  sort_order: number;
  bookable_online: boolean;
};

export type PmsBooking = {
  id: string;
  guest_id: string;
  check_in: ISODate;
  check_out: ISODate;
  room_type: string;
  room_type_id: string | null;
  room_id: string | null;
  rate_plan_id: string | null;
  status: 'confirmed' | 'pending' | 'cancelled';
  adults: number;
  children: number;
  children_ages: number[];
  total_price: number | null;
  source: 'portal' | 'email' | 'phone' | 'walk_in' | 'ota' | 'manual';
  booking_code: string | null;
  notes: string | null;
  guest_message: string | null;
  checked_in_at: string | null;
  checked_out_at: string | null;
  guests: { id: string; name: string; email: string | null; phone: string | null; vip_notes: string | null; street: string | null; postal_code: string | null; city: string | null; country: string | null } | null;
};

export const BOOKING_SELECT =
  'id, guest_id, check_in, check_out, room_type, room_type_id, room_id, rate_plan_id, status, adults, children, children_ages, total_price, source, booking_code, notes, guest_message, checked_in_at, checked_out_at, guests(id, name, email, phone, vip_notes, street, postal_code, city, country)';

export async function getHotelId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function fetchRoomsAndTypes() {
  const [{ data: rooms, error: e1 }, { data: types, error: e2 }] = await Promise.all([
    supabase.from('rooms').select('*').order('sort_order'),
    supabase.from('room_types').select('*').order('sort_order'),
  ]);
  if (e1 || e2) throw e1 ?? e2;
  return {
    rooms: (rooms ?? []) as Room[],
    roomTypes: ((types ?? []) as RoomType[]).map((t) => ({ ...t, base_price: t.base_price == null ? null : Number(t.base_price) })),
  };
}

/** Buchungen, die den Zeitraum [from, to) berühren (ohne Stornos). */
export async function fetchBookingsInRange(from: ISODate, to: ISODate) {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .neq('status', 'cancelled')
    .lt('check_in', to)
    .gte('check_out', from)
    .order('check_in');
  if (error) throw error;
  return (data ?? []) as unknown as PmsBooking[];
}

export const HK_LABEL: Record<HousekeepingStatus, string> = {
  clean: 'Sauber',
  dirty: 'Zu reinigen',
  inspected: 'Kontrolliert',
  out_of_service: 'Gesperrt',
};

export const SOURCE_LABEL: Record<PmsBooking['source'], string> = {
  portal: 'Online-Portal',
  email: 'E-Mail',
  phone: 'Telefon',
  walk_in: 'Walk-in',
  ota: 'Buchungsportal (OTA)',
  manual: 'Manuell',
};

export function personsLabel(b: Pick<PmsBooking, 'adults' | 'children'>) {
  const parts = [`${b.adults} Erw.`];
  if (b.children > 0) parts.push(`${b.children} Ki.`);
  return parts.join(', ');
}

export type HotelSettings = {
  id: string;
  name: string;
  slug: string | null;
  booking_enabled: boolean;
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
  tourist_tax_label: string;
  tourist_tax_per_night: number;
  tourist_tax_min_age: number;
  vat_lodging: number;
  vat_standard: number;
  legal_name: string | null;
  tax_number: string | null;
  vat_id: string | null;
  bank_details: string | null;
  invoice_prefix: string;
};

export async function fetchHotelSettings(): Promise<HotelSettings | null> {
  const id = await getHotelId();
  if (!id) return null;
  const { data } = await supabase.from('hotels').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return {
    ...data,
    tourist_tax_per_night: Number(data.tourist_tax_per_night),
    vat_lodging: Number(data.vat_lodging),
    vat_standard: Number(data.vat_standard),
  } as HotelSettings;
}

export type RatePlan = {
  id: string;
  name: string;
  description: string | null;
  breakfast_per_person: number;
  price_adjustment_pct: number;
  cancellation_policy: string | null;
  public: boolean;
  active: boolean;
  sort_order: number;
};

export async function fetchRateCatalog() {
  const [{ data: plans }, { data: seasons }] = await Promise.all([
    supabase.from('rate_plans').select('*').order('sort_order'),
    supabase.from('rate_seasons').select('*, rate_season_prices(room_type_id, price_per_night)').order('start_date'),
  ]);
  return {
    ratePlans: ((plans ?? []) as RatePlan[]).map((p) => ({
      ...p,
      breakfast_per_person: Number(p.breakfast_per_person),
      price_adjustment_pct: Number(p.price_adjustment_pct),
    })),
    seasons: (seasons ?? []).map((s) => ({
      id: s.id as string,
      name: s.name as string,
      start_date: s.start_date as string,
      end_date: s.end_date as string,
      min_stay: s.min_stay as number,
      prices: ((s.rate_season_prices ?? []) as { room_type_id: string; price_per_night: number }[]).map((p) => ({
        room_type_id: p.room_type_id,
        price_per_night: Number(p.price_per_night),
      })),
    })),
  };
}

export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return data.session ? { Authorization: `Bearer ${data.session.access_token}` } : {};
}

/**
 * Lädt die Seite neu, sobald sich eine der Tabellen des eigenen Hotels ändert.
 * Eindeutiger Kanalname + Abbruch-Flag, damit doppelte Effekt-Läufe (React
 * Strict Mode) keinen bereits abonnierten Kanal wiederverwenden.
 */
export function useRealtimeRefresh(tables: string[], onChange: () => void) {
  const key = tables.join(',');
  const cb = useRef(onChange);
  useEffect(() => { cb.current = onChange; }, [onChange]);
  useEffect(() => {
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    getHotelId().then((hotelId) => {
      if (!active || !hotelId) return;
      let ch = supabase.channel(`pms-${key}-${Math.random().toString(36).slice(2)}`);
      for (const table of key.split(',')) {
        ch = ch.on('postgres_changes', { event: '*', schema: 'public', table, filter: `hotel_id=eq.${hotelId}` }, () => cb.current());
      }
      channel = ch.subscribe();
    });
    return () => {
      active = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [key]);
}
