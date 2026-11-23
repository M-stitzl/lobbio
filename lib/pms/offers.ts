import 'server-only';
import { getOverlappingBookings, getPortalCatalog, type PortalHotel } from './portal-data';
import { availabilityFor, isValidISODate, minStayFor, nightsBetween, quoteStay, toISODate, type Quote } from './stay';

export type StayRequest = {
  checkIn: string;
  checkOut: string;
  adults: number;
  childrenAges: number[];
};

export type Offer = {
  roomTypeId: string;
  name: string;
  description: string | null;
  sizeSqm: number | null;
  maxGuests: number | null;
  amenities: string[];
  imageUrl: string | null;
  freeRooms: number;
  status: 'available' | 'few_left' | 'sold_out' | 'too_small' | 'min_stay' | 'no_price';
  rates: { ratePlanId: string; name: string; description: string | null; cancellation: string | null; quote: Quote }[];
};

export const MAX_STAY_NIGHTS = 30;

export function validateStay(raw: Partial<Record<keyof StayRequest, unknown>>): StayRequest | string {
  const { checkIn, checkOut } = raw;
  if (!isValidISODate(checkIn) || !isValidISODate(checkOut)) return 'Bitte gültige An- und Abreisedaten wählen.';
  if (checkIn < toISODate(new Date())) return 'Die Anreise darf nicht in der Vergangenheit liegen.';
  const n = nightsBetween(checkIn, checkOut);
  if (n < 1) return 'Die Abreise muss nach der Anreise liegen.';
  if (n > MAX_STAY_NIGHTS) return `Online buchbar sind bis zu ${MAX_STAY_NIGHTS} Nächte. Für längere Aufenthalte schreiben Sie uns gern.`;
  const adults = Number(raw.adults);
  if (!Number.isInteger(adults) || adults < 1 || adults > 10) return 'Bitte die Anzahl Erwachsener prüfen.';
  const ages = Array.isArray(raw.childrenAges) ? raw.childrenAges.map(Number) : [];
  if (ages.length > 8 || ages.some((a) => !Number.isInteger(a) || a < 0 || a > 17)) return 'Bitte das Alter der Kinder prüfen.';
  return { checkIn, checkOut, adults, childrenAges: ages };
}

export async function buildOffers(hotel: PortalHotel, stay: StayRequest): Promise<{ offers: Offer[]; minStay: number }> {
  const [{ roomTypes, ratePlans, seasons }, bookings] = await Promise.all([
    getPortalCatalog(hotel.id),
    getOverlappingBookings(hotel.id, stay.checkIn, stay.checkOut),
  ]);
  const nights = nightsBetween(stay.checkIn, stay.checkOut);
  const minStay = minStayFor(seasons, stay.checkIn);
  const persons = stay.adults + stay.childrenAges.length;

  const offers: Offer[] = roomTypes.map((rt) => {
    const { minFree } = availabilityFor(rt, bookings, stay.checkIn, stay.checkOut);
    const rates = ratePlans
      .map((rp) => {
        const quote = quoteStay({
          roomType: rt,
          ratePlan: rp,
          seasons,
          checkIn: stay.checkIn,
          checkOut: stay.checkOut,
          adults: stay.adults,
          childrenAges: stay.childrenAges,
          tax: hotel,
        });
        return quote
          ? { ratePlanId: rp.id, name: rp.name, description: rp.description, cancellation: rp.cancellation_policy ?? hotel.cancellation_policy, quote }
          : null;
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    let status: Offer['status'] = 'available';
    if (rt.max_guests != null && persons > rt.max_guests) status = 'too_small';
    else if (nights < minStay) status = 'min_stay';
    else if (minFree <= 0) status = 'sold_out';
    else if (rates.length === 0) status = 'no_price';
    else if (minFree <= 2) status = 'few_left';

    return {
      roomTypeId: rt.id,
      name: rt.name,
      description: rt.description,
      sizeSqm: rt.size_sqm,
      maxGuests: rt.max_guests,
      amenities: rt.amenities ?? [],
      imageUrl: rt.image_url,
      freeRooms: minFree,
      status,
      rates,
    };
  });

  return { offers, minStay };
}
