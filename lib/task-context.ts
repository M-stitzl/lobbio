import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Liefert die ursprüngliche Gästeanfrage zu einer gästebezogenen Aufgabe, als
 * Kontext für Follow-up-Anzeige und -Generierung.
 * Bevorzugt `tasks.source_message_id` (präzise, seit diesem Prompt gesetzt);
 * fällt für ältere Aufgaben ohne diese Referenz auf die bisherige Heuristik
 * zurück (jüngste eingehende E-Mail dieses Gasts).
 */
export async function resolveOriginalMessage(
  supabaseAdmin: SupabaseClient,
  hotelId: string,
  task: { guest_id: string | null; source_message_id: string | null }
) {
  if (task.source_message_id) {
    const { data } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', task.source_message_id)
      .eq('hotel_id', hotelId)
      .maybeSingle();
    if (data) return data;
  }

  if (!task.guest_id) return null;

  const { data } = await supabaseAdmin
    .from('messages')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('guest_id', task.guest_id)
    .eq('channel', 'email')
    .eq('direction', 'inbound')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ?? null;
}
