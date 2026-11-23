import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { ANTI_HALLUCINATION_RULE, WIR_FORM_RULE } from './knowledge-base';
import { stripMarkdown } from './claude-email';

const anthropic = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

/**
 * formuliert die Folge-E-Mail, mit der eine zuvor offengelassene Zusage
 * ("das prüfen wir noch") eingelöst wird – unter Einbeziehung der
 * ursprünglichen Gästeanfrage als Kontext, damit der Bezug erkennbar bleibt.
 * Wirft bei Fehlern (anders als classifyAndDraftEmail/-Review), da es hier
 * keinen sinnvollen leeren Fallback gibt – der Aufrufer (API-Route) zeigt den
 * Fehler dem Hotelchef direkt an, statt eine leere Aufgabe stillschweigend
 * zu übergehen.
 */
export async function draftFollowUpEmail(input: {
  hotelName: string;
  guestName: string;
  originalSubject: string;
  originalMessageContent: string;
  taskTitle: string;
  /** Stichpunkte ODER vollständiger Text vom Hotelchef – beides funktioniert,
   * Stichpunkte sind nur der schnellere Regelfall. */
  notes: string;
}): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 800,
    system: `Du bist Assistent der Rezeption von "${input.hotelName}". Ein Gast hatte eine Anfrage gestellt, bei der ein Punkt offengelassen wurde ("das prüfen wir noch und melden uns"). Dieser Punkt wurde jetzt geprüft.

Ursprüngliche Anfrage von ${input.guestName} (Betreff: "${input.originalSubject || '(kein Betreff)'}"):
${input.originalMessageContent}

Der Punkt, um den es in dieser Folge-Mail geht: ${input.taskTitle}

Der Hotelmitarbeiter hat folgende Stichpunkte als Antwort auf die ursprüngliche Gästeanfrage notiert: ${input.notes}

Formuliere daraus eine vollständige, freundliche E-Mail-Antwort an den Gast, die sich erkennbar auf dessen ursprüngliche Anfrage bezieht (z.B. "wie versprochen melden wir uns zu Ihrer Anfrage bezüglich ..."). Verwende die Stichpunkte als inhaltliche Grundlage, aber erfinde keine zusätzlichen Details, die nicht in den Stichpunkten oder im ursprünglichen Kontext enthalten sind. Reiner Fließtext ohne Markdown-Formatierung (keine **, keine #, keine Aufzählungszeichen mit - oder *, keine eckigen Klammern für Links), normale Absätze wie in einer persönlich geschriebenen E-Mail.

${ANTI_HALLUCINATION_RULE}

${WIR_FORM_RULE}`,
    messages: [{ role: 'user', content: 'Bitte formuliere die Folge-E-Mail an den Gast.' }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude-Antwort enthielt keinen Text-Block');
  }

  return stripMarkdown(textBlock.text.trim());
}
