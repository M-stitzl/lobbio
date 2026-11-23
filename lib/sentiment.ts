import type { ReviewSentiment } from '@/lib/reviews';

/**
 * Einheitliches Sentiment-Farbschema fürs gesamte Dashboard: Positiv = Grün,
 * Neutral = Grau, Negativ = Rot. Ab jetzt überall verwenden, wo Sentiment
 * dargestellt wird (aktuell: /analytics; /reviews kann bei Gelegenheit
 * mitziehen, wurde hier bewusst nicht angefasst – siehe Scope-Hinweis im Chat).
 */
export const SENTIMENT_COLOR: Record<ReviewSentiment, string> = {
  positiv: '#10b981', // emerald-500
  neutral: '#94a3b8', // slate-400
  negativ: '#ef4444', // red-500
};

export const SENTIMENT_LABEL: Record<ReviewSentiment, string> = {
  positiv: 'Positiv',
  neutral: 'Neutral',
  negativ: 'Negativ',
};

// Primäre Dashboard-Akzentfarbe (Waldgrün aus Navigation/Icons) – für alle
// nicht-sentiment-bezogenen Diagrammelemente (Linien, Hauptbalken).
export const PRIMARY_CHART_COLOR = '#059669'; // emerald-600
