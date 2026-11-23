"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getReviews, type ReviewRecord, type ReviewSentiment } from '@/lib/reviews';
import { SENTIMENT_COLOR, SENTIMENT_LABEL, PRIMARY_CHART_COLOR } from '@/lib/sentiment';
import StarRating from '@/components/star-rating';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Loader2,
  XCircle,
  Clock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

type Channel = 'email' | 'whatsapp' | 'phone' | 'review';

type MessageRow = {
  id: string;
  channel: Channel;
  direction: 'inbound' | 'outbound';
  created_at: string;
  sent_at: string | null;
};

type TopicStat = { topic: string; positiv: number; neutral: number; negativ: number; total: number };

const MAX_DAYS = 90;

function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((sum, n) => sum + n, 0) / nums.length;
}

function isInMonth(iso: string, monthsAgo: number): boolean {
  const date = new Date(iso);
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
  return date.getFullYear() === target.getFullYear() && date.getMonth() === target.getMonth();
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Montag als Wochenstart
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildRatingOverTime(reviews: ReviewRecord[], days: number) {
  const cutoff = daysAgo(days);
  const buckets = new Map<string, { sum: number; count: number; sortKey: number }>();
  for (const r of reviews) {
    const created = new Date(r.created_at);
    if (created < cutoff) continue;
    const weekStart = startOfWeek(created);
    const key = weekStart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
    const entry = buckets.get(key) ?? { sum: 0, count: 0, sortKey: weekStart.getTime() };
    entry.sum += r.rating;
    entry.count += 1;
    buckets.set(key, entry);
  }
  return Array.from(buckets.entries())
    .map(([week, { sum, count, sortKey }]) => ({ week, avgRating: Number((sum / count).toFixed(2)), reviews: count, sortKey }))
    .sort((a, b) => a.sortKey - b.sortKey);
}

function buildMessageVolume(messages: MessageRow[], days: number) {
  const counts = new Map<string, number>();
  for (const m of messages) {
    const d = new Date(m.created_at);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().split('T')[0];
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    result.push({ date: d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), count: counts.get(key) ?? 0 });
  }
  return result;
}

/** Kein hartkodierter Text – sucht das Thema, dessen Anteil an positiven
 * Erwähnungen spürbar über dem Gesamtdurchschnitt liegt (≥15 Punkte, ≥2 Erwähnungen). */
function computeInsight(topicStats: TopicStat[], overallPositiveRatio: number | null): string | null {
  if (overallPositiveRatio === null) return null;
  const MIN_COUNT = 2;
  const MARGIN = 0.15;

  const candidates = topicStats
    .filter((t) => t.total >= MIN_COUNT)
    .map((t) => ({ ...t, ratio: t.positiv / t.total }))
    .filter((t) => t.ratio - overallPositiveRatio >= MARGIN)
    .sort((a, b) => b.ratio - a.ratio || b.total - a.total);

  if (candidates.length === 0) return null;
  const top = candidates[0];
  return `KI erkennt: "${top.topic}" wird überdurchschnittlich häufig positiv erwähnt (${Math.round(top.ratio * 100)}% der Erwähnungen, ⌀ ${Math.round(overallPositiveRatio * 100)}%).`;
}

function formatMinutes(min: number): string {
  if (min < 60) return `${Math.round(min)} Min`;
  const hours = Math.floor(min / 60);
  const rest = Math.round(min % 60);
  return rest > 0 ? `${hours} Std ${rest} Min` : `${hours} Std`;
}

// Gleicher Card-Grundstil wie die KPI-Kacheln auf der Übersichtsseite.
const CARD_BASE =
  'bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all';
const CARD_CLICKABLE =
  'cursor-pointer hover:shadow-md hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200 text-left w-full';

export default function AnalyticsPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const cutoff = daysAgo(MAX_DAYS).toISOString();
      const [reviewData, { data: messageData, error: messageError }] = await Promise.all([
        getReviews(),
        supabase
          .from('messages')
          .select('id, channel, direction, created_at, sent_at')
          .gte('created_at', cutoff),
      ]);

      setReviews(reviewData);
      if (messageError) console.error('Fehler beim Laden der Nachrichten für Analytics', messageError);
      else if (messageData) setMessages(messageData as MessageRow[]);

      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-slate-500 flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" /> Lade Analysen...
      </div>
    );
  }

  // --- Bewertungs-KPIs ---
  const newReviewsCount = reviews.filter((r) => r.status === 'new').length;
  const currentMonthRatings = reviews.filter((r) => isInMonth(r.created_at, 0)).map((r) => r.rating);
  const previousMonthRatings = reviews.filter((r) => isInMonth(r.created_at, 1)).map((r) => r.rating);
  const currentAvg = average(currentMonthRatings);
  const previousAvg = average(previousMonthRatings);
  const avgDiff = currentAvg !== null && previousAvg !== null ? currentAvg - previousAvg : null;

  // --- Themen sentiment-differenziert ---
  const topicMap = new Map<string, TopicStat>();
  for (const review of reviews) {
    for (const topic of review.ai_topics ?? []) {
      const entry = topicMap.get(topic) ?? { topic, positiv: 0, neutral: 0, negativ: 0, total: 0 };
      if (review.ai_sentiment) entry[review.ai_sentiment] += 1;
      entry.total += 1;
      topicMap.set(topic, entry);
    }
  }
  const topicStats = Array.from(topicMap.values()).sort((a, b) => b.total - a.total);
  const topTopics = topicStats.slice(0, 6);

  const sentimentTagged = reviews.filter((r) => r.ai_sentiment !== null);
  const overallPositiveRatio =
    sentimentTagged.length > 0
      ? sentimentTagged.filter((r) => r.ai_sentiment === 'positiv').length / sentimentTagged.length
      : null;
  const insight = computeInsight(topicStats, overallPositiveRatio);

  // --- Sentiment-Verteilung + Vormonatsvergleich (negativ-Anteil) ---
  const sentimentCounts: Record<ReviewSentiment, number> = { positiv: 0, neutral: 0, negativ: 0 };
  for (const r of sentimentTagged) {
    if (r.ai_sentiment) sentimentCounts[r.ai_sentiment] += 1;
  }
  const sentimentData = (['positiv', 'neutral', 'negativ'] as ReviewSentiment[])
    .map((s) => ({
      name: SENTIMENT_LABEL[s],
      value: sentimentCounts[s],
      percent: sentimentTagged.length > 0 ? Math.round((sentimentCounts[s] / sentimentTagged.length) * 100) : 0,
      color: SENTIMENT_COLOR[s],
    }))
    .filter((d) => d.value > 0);

  const negRatio = (list: ReviewRecord[]) => {
    const tagged = list.filter((r) => r.ai_sentiment !== null);
    return tagged.length > 0 ? tagged.filter((r) => r.ai_sentiment === 'negativ').length / tagged.length : null;
  };
  const negRatioCurrent = negRatio(reviews.filter((r) => isInMonth(r.created_at, 0)));
  const negRatioPrevious = negRatio(reviews.filter((r) => isInMonth(r.created_at, 1)));

  // --- Diagramme (Standardansicht: 30 Tage) ---
  const ratingOverTime = buildRatingOverTime(reviews, 30);
  const messageVolume = buildMessageVolume(messages, 30);

  // --- Kanalverteilung (Nachrichten + Bewertungen als "Kanal") ---
  const channelCounts: Record<Channel, number> = { email: 0, whatsapp: 0, phone: 0, review: 0 };
  for (const m of messages) {
    if (m.direction === 'inbound') channelCounts[m.channel] += 1;
  }
  const channelData = [
    { name: 'E-Mail', value: channelCounts.email },
    { name: 'WhatsApp', value: channelCounts.whatsapp },
    { name: 'Telefon', value: channelCounts.phone },
    { name: 'Bewertungen', value: reviews.length },
  ].filter((d) => d.value > 0);

  // --- Plattform-Verteilung ---
  const platformCounts: Record<string, number> = {};
  for (const r of reviews) {
    platformCounts[r.platform] = (platformCounts[r.platform] ?? 0) + 1;
  }
  const platformLabel: Record<string, string> = { google: 'Google', booking: 'Booking.com', other: 'Sonstige' };
  const platformData = Object.entries(platformCounts).map(([platform, count]) => ({
    name: platformLabel[platform] ?? platform,
    value: count,
  }));

  // --- Durchschnittliche Antwortzeit ---
  const responseTimesMinutes = messages
    .filter((m) => m.direction === 'inbound' && m.sent_at)
    .map((m) => (new Date(m.sent_at as string).getTime() - new Date(m.created_at).getTime()) / 60000)
    .filter((min) => min >= 0);
  const avgResponseMinutes = average(responseTimesMinutes);

  return (
    // Layout-Sonderfall nur für diese Seite: layout.tsx zentriert seinen Wrapper
    // auf max-w-5xl, wodurch ein normaler Scrollbalken innerhalb dieser Seite an
    // der 5xl-Kante läge statt an der wahren rechten Kante neben "Empfehlungen".
    // Lösung: ab xl wird DIESER Container per position:absolute + inset-0 relativ
    // zu <main> (dort als "relative" markiert) auf die volle main-Breite gebracht
    // – main endet ohnehin exakt an der Empfehlungen-Spalte (xl:mr-80). Der 5xl-
    // Wrapper aus layout.tsx bleibt für alle anderen Seiten unverändert bestehen;
    // dieser Container ignoriert ihn nur für die eigene Positionierung/Scrollbreite.
    // Der Inhalt selbst bleibt weiterhin auf max-w-5xl zentriert (innerer Wrapper).
    <div className="h-full overflow-y-auto xl:absolute xl:inset-0">
      <div className="max-w-5xl mx-auto space-y-4 xl:p-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Analysen</h1>
            <p className="text-slate-500 mt-1">Auswertungen zu Nachrichten und Bewertungen.</p>
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded border bg-amber-50 text-amber-700 border-amber-200"
            title="Die angezeigten Bewertungen stammen aus lokalen Testdaten (data/dummy-reviews.json), nicht von der echten Google-API. Die Anbindung folgt in einer späteren Ausbaustufe."
          >
            Testdaten
          </span>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={() => setSelectedCard('new-reviews')} className={`${CARD_BASE} ${CARD_CLICKABLE}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-500 text-sm font-medium">Neue Bewertungen</h3>
              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><Star size={18} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{newReviewsCount}</p>
            <p className="text-xs text-slate-400 mt-1">Noch nicht beantwortet</p>
          </button>

          <button onClick={() => setSelectedCard('avg-rating')} className={`${CARD_BASE} ${CARD_CLICKABLE}`}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-500 text-sm font-medium">Bewertungsschnitt</h3>
              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><Star size={18} /></div>
            </div>
            {currentAvg !== null ? <StarRating value={currentAvg} /> : <p className="text-2xl font-bold text-slate-800">–</p>}
            {avgDiff !== null ? (
              <p className={`text-xs mt-1 flex items-center gap-1 ${avgDiff >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {avgDiff >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {avgDiff >= 0 ? '+' : ''}
                {avgDiff.toFixed(1).replace('.', ',')} ggü. Vormonat
              </p>
            ) : (
              <p className="text-xs text-slate-400 mt-1">Kein Vergleichswert aus dem Vormonat vorhanden</p>
            )}
          </button>

          <div className={CARD_BASE}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-500 text-sm font-medium">Ø Antwortzeit</h3>
              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><Clock size={18} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">
              {avgResponseMinutes !== null ? formatMinutes(avgResponseMinutes) : '–'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {responseTimesMinutes.length > 0 ? `Basis: ${responseTimesMinutes.length} beantwortete Nachrichten` : 'Noch keine beantworteten Nachrichten'}
            </p>
          </div>

          <div className={CARD_BASE}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-slate-500 text-sm font-medium">Sentiment erkannt</h3>
              <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg"><Sparkles size={18} /></div>
            </div>
            <p className="text-2xl font-bold text-slate-800">{sentimentTagged.length}</p>
            <p className="text-xs text-slate-400 mt-1">von {reviews.length} Bewertungen</p>
          </div>
        </div>

        {/* Top-Themen: sentiment-differenzierte Stacked Bars */}
        <button onClick={() => setSelectedCard('topics')} className={`${CARD_BASE} ${CARD_CLICKABLE} block`}>
          <h2 className="text-base font-bold text-slate-800 mb-4">Top-Themen in Bewertungen</h2>
          {topTopics.length === 0 ? (
            <p className="text-sm text-slate-500">Noch keine Themen erkannt.</p>
          ) : (
            <div className="space-y-2.5">
              {topTopics.map((t) => (
                <div key={t.topic} className="flex items-center gap-3">
                  <span className="text-sm text-slate-700 w-24 shrink-0 truncate">{t.topic}</span>
                  <div
                    className="flex-1 h-3 rounded-full overflow-hidden flex bg-slate-100"
                    title={`${t.topic}: ${t.positiv} positiv, ${t.neutral} neutral, ${t.negativ} negativ`}
                  >
                    {t.positiv > 0 && <div style={{ width: `${(t.positiv / t.total) * 100}%`, backgroundColor: SENTIMENT_COLOR.positiv }} />}
                    {t.neutral > 0 && <div style={{ width: `${(t.neutral / t.total) * 100}%`, backgroundColor: SENTIMENT_COLOR.neutral }} />}
                    {t.negativ > 0 && <div style={{ width: `${(t.negativ / t.total) * 100}%`, backgroundColor: SENTIMENT_COLOR.negativ }} />}
                  </div>
                  <span className="text-sm font-semibold text-slate-600 w-6 text-right shrink-0">{t.total}</span>
                </div>
              ))}
              <div className="flex items-center gap-4 pt-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SENTIMENT_COLOR.positiv }} /> Positiv</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SENTIMENT_COLOR.neutral }} /> Neutral</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: SENTIMENT_COLOR.negativ }} /> Negativ</span>
              </div>
            </div>
          )}
        </button>

        {/* KI-Insight Callout */}
        {insight && (
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start gap-3">
            <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg shrink-0">
              <Sparkles size={16} />
            </div>
            <p className="text-sm text-emerald-800">{insight}</p>
          </div>
        )}

        {/* Zeitreihen + Sentiment-Verteilung */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <button onClick={() => setSelectedCard('rating-trend')} className={`${CARD_BASE} ${CARD_CLICKABLE} block`}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Bewertungsschnitt über Zeit</h2>
            <p className="text-xs text-slate-400 mb-4">Ø Sterne pro Woche · letzte 30 Tage</p>
            {ratingOverTime.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Daten.</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={ratingOverTime} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                  <CartesianGrid stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
                  <YAxis domain={[1, 5]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip formatter={(value) => [String(value).replace('.', ','), 'Ø Sterne']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="avgRating" stroke={PRIMARY_CHART_COLOR} strokeWidth={2} dot={{ r: 3, fill: PRIMARY_CHART_COLOR }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </button>

          <button onClick={() => setSelectedCard('message-volume')} className={`${CARD_BASE} ${CARD_CLICKABLE} block`}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Nachrichtenvolumen</h2>
            <p className="text-xs text-slate-400 mb-4">Letzte 30 Tage</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={messageVolume} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval={4} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={28} />
                <Tooltip formatter={(value) => [value, 'Nachrichten']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                <Bar dataKey="count" fill={PRIMARY_CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Sentiment-Verteilung: kompakt + Vormonatsvergleich */}
          <button onClick={() => setSelectedCard('sentiment')} className={`${CARD_BASE} ${CARD_CLICKABLE} block lg:col-span-1`}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Sentiment-Verteilung</h2>
            <p className="text-xs text-slate-400 mb-2">Alle Bewertungen</p>
            {sentimentData.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Daten.</p>
            ) : (
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={90} height={72}>
                  <PieChart>
                    <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={22} outerRadius={34} paddingAngle={2}>
                      {sentimentData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1">
                  {sentimentData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: d.color }} />
                      {d.name} {d.percent}%
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-slate-100">
              {negRatioCurrent !== null && negRatioPrevious !== null ? (
                <p className={`text-xs flex items-center gap-1 ${negRatioCurrent > negRatioPrevious ? 'text-red-600' : 'text-emerald-600'}`}>
                  {negRatioCurrent > negRatioPrevious ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  Negativ-Anteil: {Math.round(negRatioCurrent * 100)}% (Vormonat: {Math.round(negRatioPrevious * 100)}%,
                  {negRatioCurrent > negRatioPrevious ? ' ↑' : ' ↓'}
                  {Math.abs(Math.round((negRatioCurrent - negRatioPrevious) * 100))} Pp)
                </p>
              ) : (
                <p className="text-xs text-slate-400">Kein Vergleichswert aus dem Vormonat vorhanden</p>
              )}
            </div>
          </button>

          {/* Kanalverteilung */}
          <div className={`${CARD_BASE} lg:col-span-1`}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Kanalverteilung</h2>
            <p className="text-xs text-slate-400 mb-2">Eingehende Anfragen</p>
            {channelData.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Daten.</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={channelData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                  <Bar dataKey="value" fill={PRIMARY_CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Plattform-Verteilung */}
          <div className={`${CARD_BASE} lg:col-span-1`}>
            <h2 className="text-base font-bold text-slate-800 mb-1">Bewertungen nach Plattform</h2>
            <p className="text-xs text-slate-400 mb-2">Alle Bewertungen</p>
            {platformData.length === 0 ? (
              <p className="text-sm text-slate-500">Noch keine Daten.</p>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={platformData} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
                  <Bar dataKey="value" fill={PRIMARY_CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center pb-2">
          Wochentags-/Uhrzeit-Heatmap des Nachrichtenaufkommens folgt in einer späteren Iteration.
        </p>
      </div>

      {selectedCard && (
        <DetailDialog
          cardId={selectedCard}
          onClose={() => setSelectedCard(null)}
          reviews={reviews}
          messages={messages}
          topicStats={topicStats}
          sentimentData={sentimentData}
        />
      )}
    </div>
  );
}

function DetailDialog({
  cardId,
  onClose,
  reviews,
  messages,
  topicStats,
  sentimentData,
}: {
  cardId: string;
  onClose: () => void;
  reviews: ReviewRecord[];
  messages: MessageRow[];
  topicStats: TopicStat[];
  sentimentData: { name: string; value: number; percent: number; color: string }[];
}) {
  const [range, setRange] = useState<7 | 30 | 90>(30);
  const isTimeSeries = cardId === 'rating-trend' || cardId === 'message-volume';

  const titles: Record<string, string> = {
    'new-reviews': 'Neue Bewertungen',
    'avg-rating': 'Bewertungsschnitt',
    topics: 'Top-Themen in Bewertungen',
    'rating-trend': 'Bewertungsschnitt über Zeit',
    'message-volume': 'Nachrichtenvolumen',
    sentiment: 'Sentiment-Verteilung',
  };

  function renderChart() {
    switch (cardId) {
      case 'rating-trend': {
        const data = buildRatingOverTime(reviews, range);
        return (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} />
              <YAxis domain={[1, 5]} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip formatter={(value) => [String(value).replace('.', ','), 'Ø Sterne']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
              <Line type="monotone" dataKey="avgRating" stroke={PRIMARY_CHART_COLOR} strokeWidth={2} dot={{ r: 4, fill: PRIMARY_CHART_COLOR }} />
            </LineChart>
          </ResponsiveContainer>
        );
      }
      case 'message-volume': {
        const data = buildMessageVolume(messages, range);
        return (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
              <CartesianGrid stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={{ stroke: '#e2e8f0' }} tickLine={false} interval={Math.ceil(range / 10)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
              <Tooltip formatter={(value) => [value, 'Nachrichten']} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
              <Bar dataKey="count" fill={PRIMARY_CHART_COLOR} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      }
      case 'sentiment':
        return (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label={(e) => `${e.name} ${e.percent}%`} labelLine={false}>
                {sentimentData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: '#e2e8f0' }} />
              <Legend formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'topics':
        return (
          <div className="space-y-3">
            {topicStats.map((t) => (
              <div key={t.topic} className="flex items-center gap-3">
                <span className="text-sm text-slate-700 w-28 shrink-0 truncate">{t.topic}</span>
                <div className="flex-1 h-4 rounded-full overflow-hidden flex bg-slate-100">
                  {t.positiv > 0 && <div style={{ width: `${(t.positiv / t.total) * 100}%`, backgroundColor: SENTIMENT_COLOR.positiv }} title={`${t.positiv} positiv`} />}
                  {t.neutral > 0 && <div style={{ width: `${(t.neutral / t.total) * 100}%`, backgroundColor: SENTIMENT_COLOR.neutral }} title={`${t.neutral} neutral`} />}
                  {t.negativ > 0 && <div style={{ width: `${(t.negativ / t.total) * 100}%`, backgroundColor: SENTIMENT_COLOR.negativ }} title={`${t.negativ} negativ`} />}
                </div>
                <span className="text-sm font-semibold text-slate-600 w-6 text-right shrink-0">{t.total}</span>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  }

  function renderTable() {
    if (cardId === 'new-reviews' || cardId === 'avg-rating' || cardId === 'topics') {
      const rows =
        cardId === 'new-reviews'
          ? reviews.filter((r) => r.status === 'new')
          : cardId === 'avg-rating'
            ? reviews.filter((r) => isInMonth(r.created_at, 0))
            : reviews.filter((r) => (r.ai_topics ?? []).length > 0);

      return (
        <table className="w-full text-left text-sm mt-4">
          <thead className="text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-2 font-medium">Gast</th>
              <th className="py-2 font-medium">Datum</th>
              <th className="py-2 font-medium">Sterne</th>
              <th className="py-2 font-medium">Sentiment</th>
              {cardId === 'topics' && <th className="py-2 font-medium">Themen</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="py-2 text-slate-700">{r.guest_name}</td>
                <td className="py-2 text-slate-500">{new Date(r.created_at).toLocaleDateString('de-DE')}</td>
                <td className="py-2 text-slate-500">{r.rating}/5</td>
                <td className="py-2 text-slate-500">{r.ai_sentiment ? SENTIMENT_LABEL[r.ai_sentiment] : '–'}</td>
                {cardId === 'topics' && <td className="py-2 text-slate-500">{(r.ai_topics ?? []).join(', ')}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (cardId === 'rating-trend') {
      const data = buildRatingOverTime(reviews, range);
      return (
        <table className="w-full text-left text-sm mt-4">
          <thead className="text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-2 font-medium">Woche ab</th>
              <th className="py-2 font-medium">Ø Sterne</th>
              <th className="py-2 font-medium">Anzahl Bewertungen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((d) => (
              <tr key={d.week}>
                <td className="py-2 text-slate-700">{d.week}</td>
                <td className="py-2 text-slate-500">{d.avgRating.toString().replace('.', ',')}</td>
                <td className="py-2 text-slate-500">{d.reviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (cardId === 'message-volume') {
      const data = buildMessageVolume(messages, range).filter((d) => d.count > 0);
      return (
        <table className="w-full text-left text-sm mt-4">
          <thead className="text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-2 font-medium">Datum</th>
              <th className="py-2 font-medium">Nachrichten</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.map((d) => (
              <tr key={d.date}>
                <td className="py-2 text-slate-700">{d.date}</td>
                <td className="py-2 text-slate-500">{d.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (cardId === 'sentiment') {
      return (
        <table className="w-full text-left text-sm mt-4">
          <thead className="text-slate-500 border-b border-slate-100">
            <tr>
              <th className="py-2 font-medium">Sentiment</th>
              <th className="py-2 font-medium">Anzahl</th>
              <th className="py-2 font-medium">Anteil</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sentimentData.map((d) => (
              <tr key={d.name}>
                <td className="py-2 text-slate-700">{d.name}</td>
                <td className="py-2 text-slate-500">{d.value}</td>
                <td className="py-2 text-slate-500">{d.percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-slate-800">{titles[cardId] ?? cardId}</h2>
          <div className="flex items-center gap-3">
            {isTimeSeries && (
              <div className="flex items-center gap-1">
                {([7, 30, 90] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                      range === r ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}T
                  </button>
                ))}
              </div>
            )}
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <XCircle size={22} />
            </button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          {renderChart()}
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
