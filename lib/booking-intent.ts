import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { availabilityFor, type BookingLite } from '@/lib/pms/stay';

const anthropic = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

export type BookingIntent = {
  checkIn: string | null; // ISO-Datum (YYYY-MM-DD), falls aus der Nachricht ableitbar
  checkOut: string | null;
  roomTypeHint: string | null;
  guestCount: number | null;
  otherNotes: string | null;
  /** Name des Verfassers aus der Grußformel (z.B. "Viele Grüße, Julia Weber"),
   * nur relevant wenn kein guests-Treffer über die E-Mail-Adresse gefunden
   * wurde – siehe Prompt "Absendername aus Signatur extrahieren". In
   * denselben Aufruf integriert statt eines zweiten API-Calls. */
  senderName: string | null;
};

const EMPTY_INTENT: BookingIntent = {
  checkIn: null,
  checkOut: null,
  roomTypeHint: null,
  guestCount: null,
  otherNotes: null,
  senderName: null,
};

const INTENT_SCHEMA = {
  type: 'object',
  properties: {
    check_in: { type: ['string', 'null'], description: 'Gewünschter Anreisetermin als ISO-Datum YYYY-MM-DD, sonst null.' },
    check_out: { type: ['string', 'null'], description: 'Gewünschter Abreisetermin als ISO-Datum YYYY-MM-DD, sonst null.' },
    room_type_hint: { type: ['string', 'null'] },
    guest_count: { type: ['number', 'null'] },
    other_notes: { type: ['string', 'null'], description: 'Kurzstichwort zu Haustieren/Ernährung/Anlass, sonst null.' },
    sender_name: {
      type: ['string', 'null'],
      description:
        'Vor- und Nachname des Verfassers, NUR falls er wörtlich in der Nachricht steht (typischerweise in der Grußformel am Ende, z.B. "Viele Grüße, Julia Weber"). Niemals raten oder aus der E-Mail-Adresse ableiten – sonst null.',
    },
  },
  required: ['check_in', 'check_out', 'room_type_hint', 'guest_count', 'other_notes', 'sender_name'],
  additionalProperties: false,
} as const;

/**
 * Leichtgewichtiger, günstiger Vorverarbeitungsschritt: extrahiert
 * strukturierte Buchungsanfrage-Daten aus dem Nachrichtentext, BEVOR der
 * eigentliche (teurere, kreative) Antwortentwurf erstellt wird. Bewusst
 * kurzer Prompt/kleines max_tokens-Budget, da hier nur JSON-Felder
 * gewonnen werden, keine Textgenerierung nötig ist.
 *
 * Schlägt die Extraktion fehl oder liefert kein valides JSON: gibt ein
 * Intent-Objekt mit ausschließlich null-Feldern zurück, wirft NICHT – ein
 * einzelner fehlgeschlagener Schritt darf die gesamte Antwortgenerierung
 * nicht abbrechen.
 */
export async function extractBookingIntent(messageText: string): Promise<BookingIntent> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      system: `Extrahiere aus einer Gästenachricht an ein Hotel strukturierte Buchungsdaten. Heutiges Datum: ${today} (löse relative Angaben wie "morgen" oder "nächstes Wochenende" relativ dazu in ein konkretes Datum auf). Extrahiere, falls vorhanden: gewünschter Anreisetermin (check_in), gewünschter Abreisetermin (check_out), gewünschter Zimmertyp oder Hinweise darauf (room_type_hint), Anzahl Personen (guest_count), sonstige relevante Wünsche wie Haustiere/Ernährung/Anlass (other_notes), Name des Verfassers aus der Grußformel (sender_name). Antworte ausschließlich als JSON gemäß Schema. Falls eine Information nicht in der Nachricht enthalten ist, setze den Wert auf null. Erfinde keine Angaben – insbesondere sender_name nur, wenn der Name wörtlich in der Nachricht steht.`,
      messages: [{ role: 'user', content: messageText }],
      output_config: {
        format: { type: 'json_schema', schema: INTENT_SCHEMA },
      },
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return EMPTY_INTENT;

    const parsed = JSON.parse(textBlock.text) as {
      check_in: string | null;
      check_out: string | null;
      room_type_hint: string | null;
      guest_count: number | null;
      other_notes: string | null;
      sender_name: string | null;
    };

    return {
      checkIn: parsed.check_in ?? null,
      checkOut: parsed.check_out ?? null,
      roomTypeHint: parsed.room_type_hint ?? null,
      guestCount: parsed.guest_count ?? null,
      otherNotes: parsed.other_notes ?? null,
      senderName: parsed.sender_name ?? null,
    };
  } catch (error) {
    console.error('extractBookingIntent: Claude-Aufruf fehlgeschlagen, arbeite mit leerem Intent weiter', error);
    return EMPTY_INTENT;
  }
}

export type AvailabilityResult =
  | { available: true; remainingRooms: number; roomTypeName: string }
  | { available: false; remainingRooms: 0; roomTypeName: string }
  | { available: null };

const NOT_AVAILABLE_CHECKED: AvailabilityResult = { available: null };

// Einfache Textähnlichkeit reicht für den Anfang (siehe Prompt) – case-
// insensitiver Substring-Abgleich in beide Richtungen. Bei mehreren
// Treffern gilt der Zimmertyp als nicht eindeutig zuordenbar.
function matchRoomType(hint: string, roomTypes: { name: string }[]): string | null {
  const normalizedHint = hint.trim().toLowerCase();
  const matches = roomTypes.filter((rt) => {
    const normalizedName = rt.name.toLowerCase();
    return normalizedName.includes(normalizedHint) || normalizedHint.includes(normalizedName);
  });
  return matches.length === 1 ? matches[0].name : null;
}

/**
 * Prüft anhand vorhandener Zimmerkontingente (room_types) und bestätigter
 * Buchungen (bookings), ob für den angefragten Zeitraum noch Zimmer eines
 * Typs frei sind. Liefert `{ available: null }`, wenn keine ausreichende
 * Datengrundlage für eine Aussage besteht (fehlender Zeitraum, nicht
 * eindeutig zuordenbarer Zimmertyp, Datenbankfehler) – niemals eine
 * erfundene Verfügbarkeit.
 */
export async function checkAvailability(
  supabaseAdmin: SupabaseClient,
  hotelId: string,
  checkIn: string | null,
  checkOut: string | null,
  roomTypeHint: string | null
): Promise<AvailabilityResult> {
  if (!checkIn || !checkOut) return NOT_AVAILABLE_CHECKED;
  if (Number.isNaN(new Date(checkIn).getTime()) || Number.isNaN(new Date(checkOut).getTime())) {
    return NOT_AVAILABLE_CHECKED;
  }

  try {
    const { data: roomTypes, error: roomTypesError } = await supabaseAdmin
      .from('room_types')
      .select('id, name, total_count')
      .eq('hotel_id', hotelId);

    if (roomTypesError || !roomTypes || roomTypes.length === 0) return NOT_AVAILABLE_CHECKED;

    let matchedName: string | null = null;
    if (roomTypeHint) {
      matchedName = matchRoomType(roomTypeHint, roomTypes);
    } else if (roomTypes.length === 1) {
      // Kein Hinweis auf einen Zimmertyp, aber das Hotel hat ohnehin nur
      // einen Typ – dann ist die Zuordnung trotzdem eindeutig.
      matchedName = roomTypes[0].name;
    }
    if (!matchedName) return NOT_AVAILABLE_CHECKED;

    const roomType = roomTypes.find((rt) => rt.name === matchedName);
    if (!roomType) return NOT_AVAILABLE_CHECKED;

    // Gleiche Regel wie Portal und PMS (lib/pms/stay.ts): höchste Belegung
    // über alle Nächte des Zeitraums, Abreisetag zählt nicht, Stornos zählen
    // nicht, ausstehende Buchungen schon (konservativ).
    const { data: overlappingRows, error: overlapError } = await supabaseAdmin
      .from('bookings')
      .select('check_in, check_out, status, room_type_id, room_type')
      .eq('hotel_id', hotelId)
      .neq('status', 'cancelled')
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);

    if (overlapError) return NOT_AVAILABLE_CHECKED;

    const { minFree: remainingRooms } = availabilityFor(
      { id: roomType.id, name: roomType.name, total_count: roomType.total_count, max_guests: null, base_price: null },
      (overlappingRows ?? []) as BookingLite[],
      checkIn,
      checkOut
    );
    if (remainingRooms > 0) {
      return { available: true, remainingRooms, roomTypeName: matchedName };
    }
    return { available: false, remainingRooms: 0, roomTypeName: matchedName };
  } catch (error) {
    console.error('checkAvailability: Fehler bei der Verfügbarkeitsprüfung, gebe "keine Daten" zurück', error);
    return NOT_AVAILABLE_CHECKED;
  }
}

/**
 * Baut die kurze, für den Hotelchef lesbare Transparenz-Notiz (die
 * Freigabe-Ansicht zeigt, welche Zusatzdaten in den Entwurf eingeflossen
 * sind) sowie den Text-Baustein für den System-Prompt der eigentlichen
 * Antwortgenerierung.
 */
export function describeAvailability(availability: AvailabilityResult): string {
  if (availability.available === true) {
    return `${availability.remainingRooms} ${availability.roomTypeName} frei im angefragten Zeitraum`;
  }
  if (availability.available === false) {
    return `Kein ${availability.roomTypeName} mehr frei im angefragten Zeitraum`;
  }
  return 'keine Verfügbarkeitsdaten ermittelbar';
}
