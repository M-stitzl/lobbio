"use client";

import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SyncReviewsButton({
  onSynced,
  className = '',
}: {
  onSynced?: () => void | Promise<void>;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleClick() {
    setLoading(true);
    setFeedback(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setFeedback({ type: 'error', text: 'Bitte zuerst einloggen.' });
        setLoading(false);
        return;
      }

      const response = await fetch('/api/reviews/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', text: data.error ?? 'Synchronisierung fehlgeschlagen.' });
        setLoading(false);
        return;
      }

      setFeedback({
        type: 'success',
        text:
          data.imported === 0
            ? 'Keine neuen Bewertungen gefunden.'
            : `${data.imported} neue Bewertung${data.imported === 1 ? '' : 'en'} importiert.`,
      });

      await onSynced?.();
    } catch {
      setFeedback({ type: 'error', text: 'Netzwerkfehler bei der Synchronisierung.' });
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {feedback && (
        <span className={`text-xs font-medium ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
          {feedback.text}
        </span>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      >
        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        {loading ? 'Synchronisiere...' : 'Bewertungen synchronisieren'}
      </button>
    </div>
  );
}
