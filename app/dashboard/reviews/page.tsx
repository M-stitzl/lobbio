"use client";

import { Suspense } from 'react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { notifyBadgesChanged } from '@/lib/events';
import SyncReviewsButton from '@/components/SyncReviewsButton';
import { Star, Loader2, CheckCircle2, XCircle, Save, Send, AlertTriangle } from 'lucide-react';

type Sentiment = 'positiv' | 'neutral' | 'negativ';
type ReviewStatus = 'new' | 'replied';
type Platform = 'google' | 'booking' | 'other';

type Review = {
  id: string;
  guest_name: string;
  rating: number;
  content: string;
  platform: Platform;
  status: ReviewStatus;
  ai_sentiment: Sentiment | null;
  ai_topics: string[] | null;
  ai_reply_draft: string | null;
  created_at: string;
};

const SENTIMENT_LABEL: Record<Sentiment, { text: string; className: string }> = {
  positiv: { text: 'Positiv', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  neutral: { text: 'Neutral', className: 'bg-slate-100 text-slate-600 border-slate-200' },
  negativ: { text: 'Negativ', className: 'bg-red-50 text-red-700 border-red-100' },
};

const STATUS_LABEL: Record<ReviewStatus, { text: string; className: string }> = {
  new: { text: 'Neu', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  replied: { text: 'Beantwortet', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

type FilterTab = 'new' | 'replied';

function ReviewsPageContent() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('new');
  const [selected, setSelected] = useState<Review | null>(null);
  // Direktverlinkung von der Dashboard-Übersicht (?reviewId=<id>): öffnet
  // beim Laden automatisch den Detail-/Freigabedialog für genau diese
  // Bewertung, statt nur auf der allgemeinen Liste zu landen.
  const searchParams = useSearchParams();
  const reviewIdParam = searchParams.get('reviewId');

  async function loadReviews() {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fehler beim Laden der Bewertungen', error);
    } else if (data) {
      setReviews(data as Review[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    async function fetchReviews() {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Fehler beim Laden der Bewertungen', error);
      } else if (data) {
        const rows = data as Review[];
        setReviews(rows);
        if (reviewIdParam) {
          const match = rows.find((r) => r.id === reviewIdParam);
          if (match) setSelected(match);
        }
      }
      setLoading(false);
    }
    fetchReviews();
    // reviewIdParam bewusst nicht als Dependency: soll nur beim initialen
    // Laden ausgewertet werden, nicht bei jeder Navigation innerhalb der Seite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSynced() {
    await loadReviews();
    notifyBadgesChanged();
  }

  function handleUpdated(updated: Review) {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelected(null);
    notifyBadgesChanged();
  }

  const filteredReviews = reviews.filter((r) => r.status === activeTab);
  const newCount = reviews.filter((r) => r.status === 'new').length;
  const repliedCount = reviews.filter((r) => r.status === 'replied').length;

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bewertungen</h1>
          <p className="text-slate-500 mt-1">
            Google-Bewertungen mit Themen und Antwortentwurf.
          </p>
        </div>
        <SyncReviewsButton onSynced={handleSynced} />
      </div>

      {/* Filter-Tabs */}
      <div className="shrink-0 flex items-center gap-2">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'new' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Neu ({newCount})
        </button>
        <button
          onClick={() => setActiveTab('replied')}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === 'replied' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Beantwortet ({repliedCount})
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-slate-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Lade Bewertungen...
          </div>
        ) : filteredReviews.length === 0 ? (
          <p className="p-8 text-slate-500 text-sm">
            {reviews.length === 0
              ? 'Noch keine Bewertungen vorhanden. Klicke oben auf „Bewertungen synchronisieren“.'
              : activeTab === 'new'
                ? 'Keine neuen Bewertungen.'
                : 'Noch keine beantworteten Bewertungen.'}
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredReviews.map((review) => (
              <button
                key={review.id}
                onClick={() => setSelected(review)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                  review.status === 'replied' ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-sm font-medium text-slate-800">{review.guest_name}</span>
                  <span className="text-xs text-slate-400">{formatDate(review.created_at)}</span>
                </div>
                <div className="flex items-center gap-0.5 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-600 mb-2 line-clamp-2">{review.content}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_LABEL[review.status].className}`}>
                    {STATUS_LABEL[review.status].text}
                  </span>
                  {review.ai_sentiment && (
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${SENTIMENT_LABEL[review.ai_sentiment].className}`}>
                      {SENTIMENT_LABEL[review.ai_sentiment].text}
                    </span>
                  )}
                  {(review.ai_topics ?? []).map((topic) => (
                    <span
                      key={topic}
                      className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-100"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <ReviewDetailModal review={selected} onClose={() => setSelected(null)} onUpdated={handleUpdated} />
      )}
    </div>
  );
}

function ReviewDetailModal({
  review,
  onClose,
  onUpdated,
}: {
  review: Review;
  onClose: () => void;
  onUpdated: (updated: Review) => void;
}) {
  const [draftText, setDraftText] = useState(review.ai_reply_draft ?? '');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isNew = review.status === 'new';

  async function handleSaveDraft() {
    setSaving(true);
    setFeedback(null);
    const { data, error } = await supabase
      .from('reviews')
      .update({ ai_reply_draft: draftText })
      .eq('id', review.id)
      .select('*')
      .single();
    setSaving(false);

    if (error) {
      setFeedback({ type: 'error', text: 'Entwurf konnte nicht gespeichert werden.' });
      return;
    }
    setFeedback({ type: 'success', text: 'Entwurf gespeichert.' });
    onUpdated(data as Review);
  }

  // Es gibt bewusst keinen "discarded"-Status für Bewertungen (anders als bei
  // messages): eine öffentliche Kundenbewertung kann man nicht verwerfen, nur
  // (noch) nicht beantworten. "Verwerfen" schließt daher lediglich den Dialog,
  // ohne den Datensatz zu verändern.
  function handleDiscard() {
    onClose();
  }

  async function handlePublish() {
    if (!draftText.trim()) {
      setFeedback({ type: 'error', text: 'Der Antworttext darf nicht leer sein.' });
      return;
    }
    setPublishing(true);
    setFeedback(null);

    // Noch keine echte Google-Business-API-Anbindung – wir simulieren
    // die Freigabe, indem wir ausschließlich den Datensatz in Supabase aktualisieren.
    const { data, error } = await supabase
      .from('reviews')
      .update({
        status: 'replied',
        ai_reply_draft: draftText,
        approved_by_user: true,
        replied_at: new Date().toISOString(),
      })
      .eq('id', review.id)
      .select('*')
      .single();

    setPublishing(false);
    setConfirmingPublish(false);

    if (error) {
      setFeedback({ type: 'error', text: 'Freigabe fehlgeschlagen.' });
      return;
    }
    onUpdated(data as Review);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">{review.guest_name}</h2>
              <div className="flex items-center gap-0.5 mt-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}
                  />
                ))}
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
              <XCircle size={22} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_LABEL[review.status].className}`}>
              {STATUS_LABEL[review.status].text}
            </span>
            {review.ai_sentiment && (
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${SENTIMENT_LABEL[review.ai_sentiment].className}`}>
                {SENTIMENT_LABEL[review.ai_sentiment].text}
              </span>
            )}
            {(review.ai_topics ?? []).map((topic) => (
              <span
                key={topic}
                className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-purple-50 text-purple-700 border-purple-100"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Original-Bewertung</h3>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {review.content}
            </div>
          </div>

          {isNew ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">KI-Antwortentwurf</h3>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
                placeholder="Kein Entwurf vorhanden – bitte manuell formulieren..."
              />
            </div>
          ) : (
            review.ai_reply_draft && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Veröffentlichte Antwort</h3>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {review.ai_reply_draft}
                </div>
              </div>
            )
          )}

          {feedback && (
            <div
              className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-100 text-emerald-700'
                  : 'bg-red-50 border border-red-100 text-red-700'
              }`}
            >
              {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {feedback.text}
            </div>
          )}

          {confirmingPublish && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Antwort wird öffentlich auf Google veröffentlicht. Fortfahren?
                </p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmingPublish(false)}
                  disabled={publishing}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg text-slate-600 hover:bg-white transition-colors disabled:opacity-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {publishing ? <Loader2 size={14} className="animate-spin" /> : null}
                  {publishing ? 'Veröffentliche...' : 'Ja, veröffentlichen'}
                </button>
              </div>
            </div>
          )}
        </div>

        {isNew && (
          <div className="p-5 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2 flex-wrap">
            <button
              onClick={handleDiscard}
              disabled={saving || publishing}
              className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Verwerfen
            </button>
            <button
              onClick={handleSaveDraft}
              disabled={saving || publishing}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save size={14} /> {saving ? 'Speichert...' : 'Speichern/Bearbeiten'}
            </button>
            <button
              onClick={() => setConfirmingPublish(true)}
              disabled={saving || publishing || confirmingPublish}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send size={14} /> Freigeben und antworten
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// useSearchParams() braucht in Next 16 eine Suspense-Grenze, sonst bricht der
// Produktions-Build beim Vorrendern ab.
export default function ReviewsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 animate-pulse">Wird geladen …</div>}>
      <ReviewsPageContent />
    </Suspense>
  );
}
