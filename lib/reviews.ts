import { supabase } from '@/lib/supabase';

export type ReviewSentiment = 'positiv' | 'neutral' | 'negativ';
export type ReviewStatus = 'new' | 'replied';
export type ReviewPlatform = 'google' | 'booking' | 'other';

export type ReviewRecord = {
  id: string;
  guest_name: string;
  rating: number;
  content: string;
  platform: ReviewPlatform;
  status: ReviewStatus;
  ai_sentiment: ReviewSentiment | null;
  ai_topics: string[] | null;
  ai_reply_draft: string | null;
  created_at: string;
  replied_at: string | null;
};

/**
 * Einziger Lese-Zugriffspunkt auf Bewertungen für die UI.
 *
 * WICHTIG: Die Daten kommen aktuell aus lokalen Testdaten (data/dummy-reviews.json,
 * eingelesen über /api/reviews/sync und klassifiziert via Claude).
 * Es handelt sich NICHT um echte Google-Bewertungen, die echte Google Business
 * Profile API ist noch nicht angebunden. Sobald sie es ist, ändert sich nur der
 * Sync-Endpunkt, der die reviews-Tabelle befüllt – diese Funktion und alle
 * UI-Komponenten, die sie nutzen, bleiben unverändert.
 */
export async function getReviews(): Promise<ReviewRecord[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('getReviews: Fehler beim Laden der Bewertungen', error);
    return [];
  }
  return (data ?? []) as ReviewRecord[];
}
