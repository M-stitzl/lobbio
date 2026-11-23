import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

export type KnowledgeBaseEntry = {
  topic: string;
  content: string;
};

/**
 * Gegenmaßnahme zu einem echten Vorfall: Die Antwortgenerierung hat einmal
 * einen frei erfundenen Bauzustand ("wir arbeiten mit Hochdruck an der
 * Fertigstellung") als Tatsache formuliert, obwohl dazu keine echte
 * Information vorlag. Dieser Textbaustein wird in BEIDEN System-Prompts
 * (E-Mail- und Bewertungs-Antwortgenerierung) verwendet, damit die Regel an
 * keiner der beiden Stellen unterschiedlich formuliert/vergessen wird.
 */
export const ANTI_HALLUCINATION_RULE = `WICHTIGE REGEL: Erfinde niemals konkrete Fakten über das Hotel, die dir nicht explizit als Information übergeben wurden. Das betrifft insbesondere: Bauzustand oder Fertigstellungstermine von Baumaßnahmen, genaue Ausstattungsdetails, Öffnungszeiten, Preise, Verfügbarkeit von Angeboten oder Einrichtungen.

Falls ein Gast nach etwas fragt, zu dem dir keine Information vorliegt: Formuliere ehrlich, dass du das noch in Erfahrung bringen bzw. das Team das noch bestätigen muss. Erfinde unter keinen Umständen einen plausibel klingenden Status oder Termin. Ein ehrliches "das prüfen wir noch" ist immer besser als eine erfundene, aber falsche Aussage.

Beispiel für falsches Verhalten (NICHT tun): Auf die Frage nach einer neuen Sauna antworten "wir arbeiten mit Hochdruck an der Fertigstellung", obwohl keine Information zum Baufortschritt vorliegt.

Beispiel für korrektes Verhalten: "Zum aktuellen Stand der Sauna können wir Ihnen aus dem Stand nichts Verbindliches sagen – das klären wir gerne mit dem Team und melden uns dazu bei Ihnen."`;

/**
 * Verhindert den Mix aus Ich- und Wir-Form, der in Entwürfen aufgefallen ist
 * (z.B. "möchte ich Ihnen bestätigen" neben Signatur "Ihr Team vom Hotel...").
 * Wird in allen drei Antwortgenerierungs-Stellen verwendet (E-Mail, Bewertung,
 * Follow-up), damit die Regel überall identisch formuliert ist.
 */
export const WIR_FORM_RULE = `Schreibe konsequent in der Wir-Form, niemals in der Ich-Form (also "wir bestätigen", "wir kümmern uns", "unser Team", nicht "ich bestätige" oder "ich kümmere mich"). Die E-Mail repräsentiert das gesamte Hotel-Team, nicht eine einzelne Person. Achte darauf, dass Anrede, Haupttext und Signatur durchgängig dieselbe Form verwenden, ohne zwischen Ich und Wir zu wechseln.`;

/**
 * Lädt alle Wissensdatenbank-Einträge des Hotels. Für den Start reicht "alle
 * Einträge mitgeben" (siehe Prompt 2.3) – keine Relevanz-Suche nötig, solange
 * die Menge klein bleibt. Schlägt der Abruf fehl, wird eine leere Liste
 * zurückgegeben statt zu werfen; die Antwortgenerierung läuft dann einfach
 * ohne zusätzliche Fakten weiter (und weicht dank ANTI_HALLUCINATION_RULE
 * weiterhin ehrlich aus statt zu spekulieren).
 */
export async function getKnowledgeBase(supabaseAdmin: SupabaseClient, hotelId: string): Promise<KnowledgeBaseEntry[]> {
  try {
    const { data, error } = await supabaseAdmin.from('knowledge_base').select('topic, content').eq('hotel_id', hotelId);
    if (error || !data) return [];
    return data;
  } catch (error) {
    console.error('getKnowledgeBase: Abruf fehlgeschlagen, arbeite ohne Wissensdatenbank-Kontext weiter', error);
    return [];
  }
}

/** Baut den Fakten-Block für den System-Prompt. */
export function describeKnowledgeBase(entries: KnowledgeBaseEntry[]): string {
  if (entries.length === 0) {
    return 'Für dieses Hotel sind aktuell keine geprüften Zusatzfakten hinterlegt. Antworte zu allem, was nicht aus dem sonstigen Kontext hervorgeht, ausweichend-ehrlich statt zu spekulieren (siehe Grundregel oben).';
  }

  const facts = entries.map((entry) => `- ${entry.topic}: ${entry.content}`).join('\n');
  return `Folgende geprüfte Fakten über das Hotel darfst du in deiner Antwort nutzen:\n${facts}\n\nNutze ausschließlich diese Fakten für konkrete Aussagen über das Hotel. Zu allem, was hier nicht aufgeführt ist, antworte ausweichend-ehrlich statt zu spekulieren (siehe Grundregel oben).`;
}
