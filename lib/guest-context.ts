import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type GuestContext = {
  vipNotes: string | null;
  preferences: string[];
  purchaseHistory: string[];
  totalStays: number;
};

/**
 * Lädt den bereits vorhandenen Gästeprofil-Kontext (siehe Gäste-Seite) für
 * die Antwortgenerierung: VIP-Notizen, Präferenzen, bisherige Zusatzbuchungen
 * sowie die Anzahl abgeschlossener Aufenthalte – dieselbe Definition wie auf
 * /dashboard/guests (bestätigte Buchung, deren Abreisedatum in der
 * Vergangenheit liegt).
 *
 * Gibt `null` zurück, wenn kein Gast zugeordnet ist oder der Abruf
 * fehlschlägt – der Aufrufer arbeitet dann einfach ohne Gästekontext weiter,
 * statt die gesamte Antwortgenerierung abzubrechen.
 */
export async function getGuestContext(
  supabaseAdmin: SupabaseClient,
  hotelId: string,
  guestId: string | null
): Promise<GuestContext | null> {
  if (!guestId) return null;

  try {
    const today = new Date().toISOString().split('T')[0];

    const [{ data: guest, error: guestError }, { count: totalStays, error: staysError }] = await Promise.all([
      supabaseAdmin.from('guests').select('vip_notes, preferences, purchase_history').eq('id', guestId).maybeSingle(),
      supabaseAdmin
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('hotel_id', hotelId)
        .eq('guest_id', guestId)
        .eq('status', 'confirmed')
        .lt('check_out', today),
    ]);

    if (guestError || !guest) return null;
    if (staysError) {
      console.error('getGuestContext: Aufenthalte konnten nicht gezählt werden, arbeite mit 0 weiter', staysError);
    }

    return {
      vipNotes: guest.vip_notes ?? null,
      preferences: guest.preferences ?? [],
      purchaseHistory: guest.purchase_history ?? [],
      totalStays: totalStays ?? 0,
    };
  } catch (error) {
    console.error('getGuestContext: Abruf fehlgeschlagen, arbeite ohne Gästekontext weiter', error);
    return null;
  }
}

/** Für System-Prompt und Transparenz-Notiz. */
export function describeGuestContext(context: GuestContext | null): string {
  if (!context) return 'Nein, neuer Gast';

  const details: string[] = [];
  if (context.totalStays > 0) details.push(`${context.totalStays} frühere ${context.totalStays === 1 ? 'Aufenthalt' : 'Aufenthalte'}`);
  if (context.preferences.length > 0) details.push(`Präferenzen: ${context.preferences.join(', ')}`);
  if (context.purchaseHistory.length > 0) details.push(`bisher gebucht: ${context.purchaseHistory.join(', ')}`);
  if (context.vipNotes) details.push(context.vipNotes);

  return details.length > 0 ? `Ja, ${details.join('; ')}` : 'Ja, bekannter Gast (keine weiteren Hinweise hinterlegt)';
}
