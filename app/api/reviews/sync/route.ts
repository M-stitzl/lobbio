import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { classifyAndDraftReview } from '@/lib/claude-review';
import { getKnowledgeBase, describeKnowledgeBase } from '@/lib/knowledge-base';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Simuliert die Google Business Profile API (noch nicht
// angebunden). Der Rest des Prozesses – Dedupe, Claude-
// Klassifizierung, Speichern mit status='new' – läuft exakt wie es später mit
// echten Google-Daten laufen würde, damit der Umstieg auf die echte API in
// einem späteren Schritt nur den Abruf-Teil ersetzen muss.
const DUMMY_REVIEWS_PATH = path.join(process.cwd(), 'data', 'dummy-reviews.json');

type DummyReview = {
  external_review_id: string;
  guest_name: string;
  rating: number;
  content: string;
  created_at: string;
};

async function getAuthenticatedHotelId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

export async function POST(req: NextRequest) {
  const hotelId = await getAuthenticatedHotelId(req);
  if (!hotelId) {
    return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 });
  }

  const { data: hotel } = await supabaseAdmin.from('hotels').select('name').eq('id', hotelId).single();
  const hotelName = hotel?.name ?? 'unser Hotel';

  // Einmal pro Sync-Lauf laden (nicht pro Bewertung).
  const knowledgeBaseEntries = await getKnowledgeBase(supabaseAdmin, hotelId);
  const knowledgeBaseContext = describeKnowledgeBase(knowledgeBaseEntries);

  let dummyReviews: DummyReview[];
  try {
    const raw = await readFile(DUMMY_REVIEWS_PATH, 'utf-8');
    dummyReviews = JSON.parse(raw) as DummyReview[];
  } catch (error) {
    console.error('reviews/sync: Konnte dummy-reviews.json nicht lesen', error);
    return NextResponse.json({ error: 'Dummy-Bewertungsdaten konnten nicht gelesen werden.' }, { status: 500 });
  }

  // Bereits importierte external_review_ids für dieses Hotel in einem Rutsch abfragen.
  const candidateIds = dummyReviews.map((r) => r.external_review_id).filter(Boolean);
  const { data: existingRows } = await supabaseAdmin
    .from('reviews')
    .select('external_review_id')
    .eq('hotel_id', hotelId)
    .in('external_review_id', candidateIds);
  const existingIds = new Set((existingRows ?? []).map((r) => r.external_review_id));

  let imported = 0;
  let skipped = 0;

  for (const review of dummyReviews) {
    if (existingIds.has(review.external_review_id)) {
      skipped++;
      continue;
    }

    try {
      const classification = await classifyAndDraftReview({
        hotelName,
        guestName: review.guest_name,
        rating: review.rating,
        content: review.content,
        knowledgeBaseContext,
      });

      const { error: insertError } = await supabaseAdmin.from('reviews').insert({
        hotel_id: hotelId,
        guest_name: review.guest_name,
        rating: review.rating,
        content: review.content,
        platform: 'google',
        status: 'new',
        ai_sentiment: classification.sentiment,
        ai_topics: classification.topics,
        ai_reply_draft: classification.draftReply,
        external_review_id: review.external_review_id,
        approved_by_user: false,
        created_at: review.created_at,
      });

      if (insertError) {
        console.error(`reviews/sync: Insert fehlgeschlagen für ${review.external_review_id}`, insertError);
        skipped++;
        continue;
      }

      imported++;
    } catch (perReviewError) {
      console.error(`reviews/sync: Fehler bei Bewertung ${review.external_review_id}`, perReviewError);
      skipped++;
    }
  }

  return NextResponse.json({ imported, skipped });
}
