import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { ANTI_HALLUCINATION_RULE, WIR_FORM_RULE } from './knowledge-base';

const anthropic = new Anthropic(); // liest ANTHROPIC_API_KEY aus der Umgebung

export type ReviewSentiment = 'positiv' | 'neutral' | 'negativ';

export type ReviewClassification = {
  sentiment: ReviewSentiment;
  topics: string[];
  draftReply: string;
};

const SENTIMENTS: ReviewSentiment[] = ['positiv', 'neutral', 'negativ'];

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    ai_sentiment: { type: 'string', enum: SENTIMENTS },
    ai_topics: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Kurze, wiederverwendbare Stichworte zu den in der Bewertung angesprochenen Themen (z.B. "WLAN", "Frühstück", "Zimmer", "Personal", "Lage", "Sauberkeit"). Max. 5.',
    },
    ai_reply_draft: {
      type: 'string',
      description:
        'Ein vollständiger, versandfertiger Antwortentwurf auf Deutsch. Der Hotelchef prüft und gibt ihn manuell frei, bevor er auf der Plattform veröffentlicht wird.',
    },
  },
  required: ['ai_sentiment', 'ai_topics', 'ai_reply_draft'],
  additionalProperties: false,
} as const;

/**
 * Klassifiziert eine Gästebewertung (Sentiment + Themen) und erstellt einen
 * Antwortentwurf. Schlägt der Claude-Aufruf fehl, wird NICHT geworfen –
 * stattdessen 'neutral' mit leerem Entwurf zurückgegeben, damit der Sync-Job
 * nicht an einer einzelnen Bewertung abbricht (analog zu classifyAndDraftEmail).
 */
export async function classifyAndDraftReview(input: {
  hotelName: string;
  guestName: string;
  rating: number;
  content: string;
  /** Vorformulierter Fakten-Block aus getKnowledgeBase()/describeKnowledgeBase(). */
  knowledgeBaseContext?: string;
}): Promise<ReviewClassification> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: `Du bist Assistent der Rezeption von "${input.hotelName}". Du liest eingehende Gästebewertungen (z.B. von Google), schätzt die Grundstimmung ein, erkennst angesprochene Themen und formulierst einen höflichen, professionellen Antwortentwurf auf Deutsch.

Sentiment:
- "positiv": überwiegend zufrieden, lobend
- "neutral": gemischt, sowohl Lob als auch Kritik, oder sachlich ohne klare Tendenz
- "negativ": überwiegend unzufrieden, Beschwerde-Charakter

Themen (ai_topics): kurze, wiederverwendbare Stichworte (z.B. "WLAN", "Frühstück", "Zimmer", "Personal", "Lage", "Sauberkeit", "Preis-Leistung") – keine ganzen Sätze, max. 5 Stück, nur Themen die tatsächlich erwähnt werden.

Wichtig für den Entwurf:
- Bedanke dich für die Bewertung, gehe konkret auf 1-2 genannte Punkte ein.
- Bei negativen Bewertungen: nicht rechtfertigen, Verständnis zeigen, wo sinnvoll eine Verbesserung/Lösung andeuten, zur persönlichen Kontaktaufnahme einladen.
- Der Entwurf wird von der Rezeption vor der Veröffentlichung manuell geprüft und ggf. bearbeitet.
- Keine falschen Versprechen (Rabatte, Rückerstattungen), die du nicht autorisieren kannst.

${input.knowledgeBaseContext ?? 'Für dieses Hotel sind aktuell keine geprüften Zusatzfakten hinterlegt. Antworte zu allem, was nicht aus dem sonstigen Kontext hervorgeht, ausweichend-ehrlich statt zu spekulieren (siehe Grundregel unten).'}

Nutze die oben aufgeführten Fakten AUSSCHLIESSLICH dann, wenn die Bewertung tatsächlich danach fragt oder das Thema klar erkennbar anspricht. Füge keine zusätzlichen Informationen hinzu, nur weil sie dir vorliegen und "nützlich" erscheinen könnten. Eine kurze, präzise Antwort ist einer langen Antwort mit ungefragten Zusatzinformationen immer vorzuziehen.

${ANTI_HALLUCINATION_RULE}

${WIR_FORM_RULE}`,
      messages: [
        {
          role: 'user',
          content: `Gast: ${input.guestName}\nBewertung: ${input.rating}/5 Sterne\n\nText:\n${input.content}`,
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
      ai_sentiment: string;
      ai_topics: string[];
      ai_reply_draft: string;
    };
    const sentiment = SENTIMENTS.includes(parsed.ai_sentiment as ReviewSentiment)
      ? (parsed.ai_sentiment as ReviewSentiment)
      : 'neutral';

    return {
      sentiment,
      topics: Array.isArray(parsed.ai_topics) ? parsed.ai_topics.slice(0, 5) : [],
      draftReply: parsed.ai_reply_draft ?? '',
    };
  } catch (error) {
    console.error('classifyAndDraftReview: Claude-Aufruf fehlgeschlagen, falle zurück auf "neutral"', error);
    return { sentiment: 'neutral', topics: [], draftReply: '' };
  }
}
