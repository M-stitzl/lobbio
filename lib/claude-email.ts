import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { ANTI_HALLUCINATION_RULE, WIR_FORM_RULE } from './knowledge-base';

const anthropic = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

export type AiCategory = 'anfrage' | 'beschwerde' | 'buchungsaenderung' | 'sonstiges';

export type EmailClassification = {
  category: AiCategory;
  draftReply: string;
  /** Punkte, die der Entwurf bewusst offengelassen hat (siehe ANTI_HALLUCINATION_RULE),
   * z.B. "Verfügbarkeit Balkonzimmer prüfen" – wird beim Freigeben/Versenden
   * je Eintrag zu einer Aufgabe mit requires_guest_reply=true (Follow-up-Funktion). */
  openFollowups: string[];
};

const CATEGORIES: AiCategory[] = ['anfrage', 'beschwerde', 'buchungsaenderung', 'sonstiges'];

/**
 * Entfernt verbliebene Markdown-Formatierung aus einem KI-Antwortentwurf.
 * Zusätzliche Absicherung zur Prompt-Anweisung unten: Gmail & Co. zeigen
 * Sternchen, Rauten und Bindestriche als literale Zeichen an statt sie zu formatieren – falls sich das
 * Modell trotz Anweisung nicht vollständig daran hält, fängt das hier die
 * verbliebenen Fälle ab, bevor der Entwurf in ai_draft_reply landet.
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1') // [Linktext](url) -> Linktext
    .replace(/\*\*(.*?)\*\*/g, '$1') // **fett** -> fett
    .replace(/\*(.*?)\*/g, '$1') // *kursiv* -> kursiv
    .replace(/^#{1,6}\s+/gm, '') // Überschriften-Hashes entfernen
    .replace(/^[-*]\s+/gm, ''); // Aufzählungszeichen entfernen
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    ai_category: { type: 'string', enum: CATEGORIES },
    ai_draft_reply: {
      type: 'string',
      description:
        'Ein vollständiger, versandfertiger Antwortentwurf auf Deutsch. Der Hotelchef prüft und gibt ihn manuell frei, bevor er verschickt wird.',
    },
    ai_open_followups: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Kurze, aufgabentaugliche Stichpunkte (wie ein To-do-Titel) für jeden Punkt, den der Entwurf laut ANTI_HALLUCINATION_RULE bewusst offengelassen hat, weil dazu keine echte Information vorlag (z.B. "Verfügbarkeit Balkonzimmer prüfen"). Leeres Array, falls der Entwurf nichts offengelassen hat.',
    },
  },
  required: ['ai_category', 'ai_draft_reply', 'ai_open_followups'],
  additionalProperties: false,
} as const;

/**
 * Klassifiziert eine eingehende Gast-E-Mail und erstellt einen Antwortentwurf.
 * Schlägt der Claude-Aufruf fehl (Netzwerk, Rate-Limit, o.ä.), wird NICHT geworfen –
 * stattdessen 'sonstiges' mit leerem Entwurf zurückgegeben, damit der Sync-Job nicht
 * an einer einzelnen E-Mail abbricht.
 */
export async function classifyAndDraftEmail(input: {
  hotelName: string;
  subject: string;
  bodyText: string;
  guestName?: string | null;
  guestVipNotes?: string | null;
  /** Vorformulierte Kurzbeschreibung aus checkAvailability()/describeAvailability(), z.B.
   * "2 Familienzimmer frei im angefragten Zeitraum" oder "keine Verfügbarkeitsdaten ermittelbar". */
  availabilityDescription?: string;
  /** Vorformulierte Kurzbeschreibung aus getGuestContext()/describeGuestContext(). */
  guestContextDescription?: string;
  /** Vorformulierter Fakten-Block aus getKnowledgeBase()/describeKnowledgeBase(). */
  knowledgeBaseContext?: string;
}): Promise<EmailClassification> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: `Du bist Assistent der Rezeption von "${input.hotelName}". Du liest eingehende Gast-E-Mails, ordnest sie einer Kategorie zu und formulierst einen höflichen, professionellen Antwortentwurf auf Deutsch.

Kategorien:
- "anfrage": allgemeine Fragen (Ausstattung, Anreise, Verpflegung, Aktivitäten usw.)
- "beschwerde": Unzufriedenheit, Probleme, Reklamationen
- "buchungsaenderung": Wunsch nach Änderung/Stornierung einer bestehenden Buchung (Termin, Zimmer, Personenzahl)
- "sonstiges": alles andere (z.B. Bewerbungen, Spam, nicht zuordenbar)

Wichtig für den Entwurf:
- Berücksichtige VIP-Notizen zum Gast, falls vorhanden (z.B. Vorlieben, Allergien, Anlässe).
- Der Entwurf wird von der Rezeption vor dem Versand manuell geprüft und ggf. bearbeitet – schreibe ihn trotzdem so, dass er im Idealfall unverändert versendet werden könnte.
- Kein automatischer Versand, keine verbindlichen Zusagen zu Preisen oder anderen Details, die du nicht kennst. Zur Verfügbarkeit siehe die Zusatzinformationen unten.
- Bei "sonstiges" (z.B. Bewerbungen) reicht ein kurzer neutraler Entwurf oder ein leerer String, falls keine Antwort sinnvoll ist.

Formatierung des Entwurfs:
Schreibe die Antwort als reinen Fließtext ohne jegliche Markdown-Formatierung (keine **, keine #, keine Aufzählungszeichen mit - oder *, keine eckigen Klammern für Links). Nutze ausschließlich normale Absätze, wie in einer persönlich geschriebenen E-Mail. Falls einzelne Punkte hervorgehoben werden sollen, nutze dafür einen eigenen Absatz oder eine kurze Überleitung in Textform, keine Formatierungszeichen.

Zusätzliche Informationen für diese Antwort:
- Verfügbarkeit für den angefragten Zeitraum: ${input.availabilityDescription ?? 'keine Verfügbarkeitsdaten ermittelbar'}
- Bekannter Gast: ${input.guestContextDescription ?? 'Nein, neuer Gast'}

Nutze die Verfügbarkeitsinformation, um die Anfrage konkret zu beantworten, statt auf eine spätere Prüfung zu verweisen, sofern die Daten vorhanden sind (z.B. "X Zimmer frei" oder "das ist im gewünschten Zeitraum leider ausgebucht"). Ist keine Verfügbarkeitsprüfung möglich ("keine Verfügbarkeitsdaten ermittelbar"), formuliere ehrlich, dass die Verfügbarkeit noch geprüft wird, statt eine Zahl zu erfinden. Erfinde unter keinen Umständen eine Verfügbarkeit, die dir nicht explizit oben mitgeteilt wurde. Nutze den Hinweis zum bekannten Gast, um die Anrede persönlicher zu gestalten (z.B. Stammgast, bekannte Präferenz), ohne Angaben zu erfinden, die dort nicht stehen.

${input.knowledgeBaseContext ?? 'Für dieses Hotel sind aktuell keine geprüften Zusatzfakten hinterlegt. Antworte zu allem, was nicht aus dem sonstigen Kontext hervorgeht, ausweichend-ehrlich statt zu spekulieren (siehe Grundregel unten).'}

Nutze die oben aufgeführten Fakten AUSSCHLIESSLICH dann, wenn der Gast danach explizit oder klar erkennbar implizit gefragt hat. Füge keine zusätzlichen Informationen hinzu, nur weil sie dir vorliegen und "nützlich" erscheinen könnten. Eine kurze, präzise Antwort, die exakt auf die gestellten Fragen eingeht, ist einer langen Antwort mit ungefragten Zusatzinformationen immer vorzuziehen.

Prüfe vor jedem Absatz deiner Antwort: Wurde genau danach gefragt? Falls nein, lass den Absatz weg, auch wenn die Information korrekt und grundsätzlich hilfreich wäre.

${ANTI_HALLUCINATION_RULE}

${WIR_FORM_RULE}

Offene Punkte (ai_open_followups): Immer wenn du laut der Grundregel oben zu einem Punkt ausgewichen bist, statt eine konkrete Aussage zu treffen (z.B. "das prüfen wir noch"), trage genau diesen Punkt als kurzen, aufgabentauglichen Stichpunkt in ai_open_followups ein – so wird daraus automatisch eine Aufgabe für die Rezeption, sobald die Antwort freigegeben wird. Ein Punkt pro offengelassener Frage, keine Duplikate, kein Eintrag für Dinge, die du bereits konkret beantwortet hast.`,
      messages: [
        {
          role: 'user',
          content: `Gast: ${input.guestName ?? 'Unbekannt'}${
            input.guestVipNotes ? `\nVIP-Notizen: ${input.guestVipNotes}` : ''
          }\nBetreff: ${input.subject || '(kein Betreff)'}\n\nE-Mail-Text:\n${input.bodyText}`,
        },
      ],
      output_config: {
        format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
      },
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Claude-Antwort enthielt keinen Text-Block');
    }

    const parsed = JSON.parse(textBlock.text) as {
      ai_category: string;
      ai_draft_reply: string;
      ai_open_followups?: string[];
    };
    const category = CATEGORIES.includes(parsed.ai_category as AiCategory)
      ? (parsed.ai_category as AiCategory)
      : 'sonstiges';

    return {
      category,
      draftReply: stripMarkdown(parsed.ai_draft_reply ?? ''),
      openFollowups: Array.isArray(parsed.ai_open_followups) ? parsed.ai_open_followups.filter(Boolean) : [],
    };
  } catch (error) {
    console.error('classifyAndDraftEmail: Claude-Aufruf fehlgeschlagen, falle zurück auf "sonstiges"', error);
    return { category: 'sonstiges', draftReply: '', openFollowups: [] };
  }
}
