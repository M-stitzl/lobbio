"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { notifyBadgesChanged } from '@/lib/events';
import SyncEmailsButton from '@/components/SyncEmailsButton';
import { resolveSenderDisplay } from '@/lib/message-display';
import { SenderAvatar } from '@/components/dashboard/sender-avatar';
import {
  MessageSquare, Star, CheckSquare, Calendar, ArrowUp, ArrowDown, Minus, Mail, MessageCircle, Phone, User,
} from 'lucide-react';

// Vereinheitlichte Sicht auf "ungelesene Nachrichten" UND "neue Bewertungen" für
// die gemeinsame Feed-Liste "Heute eingegangene Anfragen" (Schritt 1).
type MessageChannel = 'email' | 'whatsapp' | 'phone' | 'review';
type ReviewPlatform = 'google' | 'booking' | 'other';

type FeedItem = {
  id: string;
  rawId: string; // ID ohne "message-"/"review-"-Präfix, für die Direktverlinkung
  kind: 'message' | 'review';
  createdAt: string;
  guestName: string;
  // Nur bei kind === 'message' relevant (siehe lib/message-display) – bei
  // Bewertungen gibt es kein guest_id/extracted_sender_name-Konzept, dort
  // ist guest_name immer ein reiner Textwert.
  senderVerified: boolean;
  senderHasName: boolean;
  content: string;
  rating: number | null; // nur bei kind === 'review'
  answered: boolean;
  href: string;
  channel: MessageChannel | ReviewPlatform;
};

type TodayArrival = {
  id: string;
  room_type: string;
  guests: { name: string; vip_notes: string | null } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Icon-Badge je Kanal für die Avatar-Ecke in der Anfragen-Liste.
const CHANNEL_ICON: Record<MessageChannel | ReviewPlatform, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  phone: Phone,
  review: Star,
  google: Star,
  booking: Star,
  other: Star,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function fetchRecentFeed(): Promise<FeedItem[]> {
  // "Ungelesen" = new/pending_review bei Nachrichten, 'new' bei Bewertungen –
  // deckt sich mit den Sidebar-Badge-Definitionen.
  const [{ data: msgs }, { data: reviews }] = await Promise.all([
    supabase
      .from('messages')
      .select('*, guests(name)')
      .in('status', ['new', 'pending_review'])
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('reviews')
      .select('*')
      .eq('status', 'new')
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const messageItems: FeedItem[] = (msgs ?? []).map((msg) => {
    // Dieselbe Herleitung wie auf der Nachrichten-Seite (lib/message-display) –
    // zuvor wurde hier nur guests?.name berücksichtigt, wodurch ein per
    // Signatur erkannter, aber nicht zugeordneter Absender fälschlich als
    // "Unbekannt" erschien.
    const sender = resolveSenderDisplay(msg);
    return {
      id: `message-${msg.id}`,
      rawId: msg.id,
      kind: 'message',
      createdAt: msg.created_at,
      guestName: sender.name,
      senderVerified: sender.verified,
      senderHasName: sender.hasName,
      content: msg.content,
      rating: null,
      answered: msg.status === 'answered',
      href: '/dashboard/messages',
      channel: (msg.channel ?? 'email') as MessageChannel,
    };
  });

  const reviewItems: FeedItem[] = (reviews ?? []).map((review) => ({
    id: `review-${review.id}`,
    rawId: review.id,
    kind: 'review',
    createdAt: review.created_at,
    guestName: review.guest_name,
    senderVerified: true,
    senderHasName: true,
    content: review.content,
    rating: review.rating,
    answered: review.status === 'replied',
    href: '/dashboard/reviews',
    channel: (review.platform ?? 'google') as ReviewPlatform,
  }));

  return [...messageItems, ...reviewItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// "Vor X Minuten"-Anzeige für den letzten Sync-Zeitpunkt. Bewusst ohne
// zusätzliche Bibliothek, nur die paar Stufen, die hier gebraucht werden.
function formatRelativeSync(iso: string | null): string {
  if (!iso) return 'Noch nie synchronisiert';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Gerade eben synchronisiert';
  if (minutes < 60) return `Zuletzt synchronisiert vor ${minutes} Minute${minutes === 1 ? '' : 'n'}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Zuletzt synchronisiert vor ${hours} Stunde${hours === 1 ? '' : 'n'}`;
  const days = Math.floor(hours / 24);
  return `Zuletzt synchronisiert vor ${days} Tag${days === 1 ? '' : 'en'}`;
}

// Kleine, farbige Trend-Anzeige je Kennzahlen-Karte. `delta` ist eine
// echte, aus der Datenbank berechnete Differenz (siehe fetchTrends unten) –
// kein Platzhalterwert.
function TrendIndicator({ delta, label }: { delta: number; label: string }) {
  if (delta === 0) {
    return (
      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
        <Minus size={11} /> Unverändert {label}
      </p>
    );
  }
  const isUp = delta > 0;
  return (
    <p className={`text-xs mt-1 flex items-center gap-1 font-medium ${isUp ? 'text-emerald-600' : 'text-orange-600'}`}>
      {isUp ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
      {Math.abs(delta)} {label}
    </p>
  );
}

// Bewusst zugeordnetes, konsistentes Farbsystem statt zufälliger Icon-Farben
// Blau = Kommunikation, Amber = Bewertungen/Sterne (wie im Rest der
// App bereits für Sterne verwendet), Violett = Aufgaben/To-dos, Grün = Ankunft.
const KPI_ICON_STYLE = {
  messages: 'bg-blue-50 text-blue-600',
  reviews: 'bg-amber-50 text-amber-500',
  tasks: 'bg-violet-50 text-violet-600',
  arrivals: 'bg-emerald-50 text-emerald-600',
} as const;

export default function HomePage() {
  const [counts, setCounts] = useState({ messages: 0, reviews: 0, tasks: 0, arrivals: 0 });
  const [trends, setTrends] = useState({ messages: 0, reviews: 0, tasks: 0, arrivals: 0 });
  const [recentItems, setRecentItems] = useState<FeedItem[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<TodayArrival[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // Bewusst State statt Ref: der Realtime-Effekt unten muss erst laufen,
  // wenn die hotelId feststeht, und dafür als Dependency darauf reagieren
  // können (ein Ref löst keinen Effekt-Rerun aus).
  const [hotelId, setHotelId] = useState<string | null>(null);

  // Zentrale Ladefunktion für Kennzahlen, Trends, Feed und Anreisen – wird
  // beim ersten Laden, nach "Postfach synchronisieren" UND bei jedem
  // Realtime-Event auf messages/reviews/tasks/bookings erneut aufgerufen
  // (echte, aktuelle Daten statt veralteter/gecachter Werte).
  const fetchAllDashboardData = useCallback(async () => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - DAY_MS).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 2 * DAY_MS).toISOString();
    const today = now.toISOString().split('T')[0];
    const yesterday = new Date(now.getTime() - DAY_MS).toISOString().split('T')[0];

    const [
      { count: msgCount },
      { count: revCount },
      { count: taskCount },
      { count: arrCount },
      { count: msgLast24h },
      { count: msgPrev24h },
      { count: revLast24h },
      { count: revPrev24h },
      { count: taskLast24h },
      { count: taskPrev24h },
      { count: arrYesterday },
    ] = await Promise.all([
      // Kennzahl "Neue Nachrichten" – bewusst wie im Sidebar-Badge new+pending_review
      // (rein status='new' würde aktuelle, tatsächlich noch unbeantwortete
      // pending_review-Nachrichten unter den Tisch fallen lassen).
      supabase.from('messages').select('*', { count: 'exact', head: true }).in('status', ['new', 'pending_review']),
      // Kennzahl "Neue Bewertungen": status='new' der letzten 7 Tage.
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'new').gte('created_at', new Date(now.getTime() - 7 * DAY_MS).toISOString()),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_in', today).eq('status', 'confirmed'),
      // Trend-Fenster: neu hinzugekommen in den letzten 24h vs. den 24h davor.
      supabase.from('messages').select('*', { count: 'exact', head: true }).in('status', ['new', 'pending_review']).gte('created_at', oneDayAgo),
      supabase.from('messages').select('*', { count: 'exact', head: true }).in('status', ['new', 'pending_review']).gte('created_at', twoDaysAgo).lt('created_at', oneDayAgo),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'new').gte('created_at', oneDayAgo),
      supabase.from('reviews').select('*', { count: 'exact', head: true }).eq('status', 'new').gte('created_at', twoDaysAgo).lt('created_at', oneDayAgo),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open').gte('created_at', oneDayAgo),
      supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open').gte('created_at', twoDaysAgo).lt('created_at', oneDayAgo),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('check_in', yesterday).eq('status', 'confirmed'),
    ]);

    setCounts({ messages: msgCount || 0, reviews: revCount || 0, tasks: taskCount || 0, arrivals: arrCount || 0 });
    setTrends({
      messages: (msgLast24h || 0) - (msgPrev24h || 0),
      reviews: (revLast24h || 0) - (revPrev24h || 0),
      tasks: (taskLast24h || 0) - (taskPrev24h || 0),
      arrivals: (arrCount || 0) - (arrYesterday || 0),
    });

    setRecentItems(await fetchRecentFeed());

    const { data: arrivals } = await supabase.from('bookings').select('*, guests(name, vip_notes)').eq('check_in', today).eq('status', 'confirmed').limit(10);
    if (arrivals) setTodayArrivals(arrivals);

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('last_synced_at')
      .eq('platform', 'gmail')
      .maybeSingle();
    setLastSyncedAt(connection?.last_synced_at ?? null);
  }, []);

  useEffect(() => {
    (async () => {
      await fetchAllDashboardData();
      setLoading(false);
    })();
  }, [fetchAllDashboardData]);

  // Löst nur die hotelId auf (einmalig, async ist hier unkritisch – dieser
  // Effekt richtet selbst keinen Channel ein). Der eigentliche Realtime-
  // Effekt unten bekommt die hotelId danach als fertigen, synchronen Wert
  // über die Dependency-Liste.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!cancelled && user) setHotelId(user.id);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Realtime statt manuellem Neuladen: sobald sich messages, reviews,
  // tasks oder bookings dieses Hotels ändern – egal ob durch diese Seite,
  // eine andere Dashboard-Unterseite oder den serverseitigen Sync-Job – wird
  // automatisch neu geladen. Ergänzt (ersetzt für diese Seite) das bisherige
  // BADGES_CHANGED_EVENT, das nur Änderungen auf derselben Client-Seite
  // erfasst hätte.
  //
  // Bewusst rein synchron (kein async IIFE mehr im Effekt-Körper): das war
  // die eigentliche Ursache für "cannot add postgres_changes callbacks after
  // subscribe()" im Strict-Mode-Doppeldurchlauf – der Channel wurde erst
  // asynchron NACH dem Cleanup-Aufruf erzeugt, sodass die erste Instanz nie
  // entfernt wurde und die zweite denselben, bereits abonnierten Channel-Namen
  // traf. Jetzt entsteht der Channel synchron im Effekt-Körper, sodass React
  // die Cleanup-Funktion garantiert vor jedem erneuten Durchlauf ausführt.
  useEffect(() => {
    if (!hotelId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    function scheduleRefetch() {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchAllDashboardData();
      }, 400);
    }

    const channel = supabase
      .channel(`dashboard-overview-${hotelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `hotel_id=eq.${hotelId}` }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `hotel_id=eq.${hotelId}` }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `hotel_id=eq.${hotelId}` }, scheduleRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `hotel_id=eq.${hotelId}` }, scheduleRefetch)
      .subscribe();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [hotelId, fetchAllDashboardData]);

  // Eigenständiger Refresh-Trigger für den "Postfach synchronisieren"-Button.
  async function handleSynced() {
    await fetchAllDashboardData();
    notifyBadgesChanged(); // Sidebar-Badges haben kein eigenes Realtime, weiterhin per Event benachrichtigen.
  }

  if (loading) {
    return <div className="p-8 text-slate-500 animate-pulse">Lade Dashboard-Daten...</div>;
  }

  return (
    // h-full füllt den fixierten Container aus layout.tsx perfekt aus
    <div className="flex flex-col h-full gap-4">
      {/* schlanke Kopfzeile – Seitentitel links, Sync-Status + Button rechts, eine Höhe */}
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-lg font-bold text-slate-800">Übersicht</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{formatRelativeSync(lastSyncedAt)}</span>
          <SyncEmailsButton onSynced={handleSynced} />
        </div>
      </div>

      {/* KPI Kacheln */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
        <Link href="/dashboard/messages" className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-500 text-sm font-medium group-hover:text-emerald-700 transition-colors">Neue Nachrichten</h3>
            <div className={`p-1.5 rounded-lg ${KPI_ICON_STYLE.messages}`}><MessageSquare size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{counts.messages}</p>
          <TrendIndicator delta={trends.messages} label="seit gestern" />
        </Link>

        <Link href="/dashboard/reviews" className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-500 text-sm font-medium group-hover:text-emerald-700 transition-colors">Neue Bewertungen</h3>
            <div className={`p-1.5 rounded-lg ${KPI_ICON_STYLE.reviews}`}><Star size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{counts.reviews}</p>
          <TrendIndicator delta={trends.reviews} label="seit gestern" />
        </Link>

        <Link href="/dashboard/tasks" className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-500 text-sm font-medium group-hover:text-emerald-700 transition-colors">Offene Aufgaben</h3>
            <div className={`p-1.5 rounded-lg ${KPI_ICON_STYLE.tasks}`}><CheckSquare size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{counts.tasks}</p>
          <TrendIndicator delta={trends.tasks} label="neu seit gestern" />
        </Link>

        <Link href="/dashboard/bookings" className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200 transition-all group">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-slate-500 text-sm font-medium group-hover:text-emerald-700 transition-colors">Anreisen</h3>
            <div className={`p-1.5 rounded-lg ${KPI_ICON_STYLE.arrivals}`}><Calendar size={18} /></div>
          </div>
          <p className="text-2xl font-bold text-slate-800">{counts.arrivals}</p>
          <TrendIndicator delta={trends.arrivals} label="ggü. gestern" />
        </Link>
      </div>

      {/* Listen-Bereich - min-h-0 ist wichtig, damit flex-1 beim Scrollen nicht überläuft */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 flex-1 pb-4">

        {/* Box 1: Letzte Anfragen */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <h2 className="text-base font-bold text-slate-800">Heute eingegangene Anfragen</h2>
          </div>
          {/* Hier passiert die Magie: Nur dieser Container darf scrollen */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {recentItems.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">Keine neuen Nachrichten oder Bewertungen vorhanden.</p>
            ) : (
              recentItems.map((item) => {
                const ChannelIcon = CHANNEL_ICON[item.channel];
                // Direktverlinkung (Fix B): Zielseite öffnet über den Query-
                // Parameter automatisch den Detail-/Freigabedialog für genau
                // diesen Eintrag, statt nur auf der allgemeinen Liste zu landen.
                const targetHref =
                  item.kind === 'message'
                    ? `${item.href}?messageId=${item.rawId}`
                    : `${item.href}?reviewId=${item.rawId}`;
                return (
                  <Link
                    href={targetHref}
                    key={item.id}
                    className={`block px-4 py-5 hover:bg-slate-50 transition-colors ${item.answered ? 'opacity-50' : ''}`}
                  >
                    {/* Zweispaltiges Grid statt einzeln positionierter Elemente:
                        linke Spalte (Avatar, Kanal-Icon) und rechte Spalte
                        (Name/Zeit, Text, Antworten) folgen in Lesereihenfolge
                        automatisch denselben drei Zeilen, sodass Icon und
                        Antworten-Zeile immer auf gleicher Höhe stehen –
                        unabhängig davon, wie lang Name oder Text sind. */}
                    <div className="grid grid-cols-[36px_1fr] gap-x-3 gap-y-1.5">
                      {/* Zeile 1: Avatar | Name + Zeit */}
                      <div className="flex justify-center">
                        {item.kind === 'message' ? (
                          <SenderAvatar
                            name={item.guestName}
                            verified={item.senderVerified}
                            hasName={item.senderHasName}
                            ChannelIcon={ChannelIcon}
                            fallbackIcon={<User size={16} />}
                            showChannelBadge={false}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold bg-amber-100 text-amber-700 shrink-0">
                            {getInitials(item.guestName)}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center min-w-0">
                        <span className="text-sm font-medium text-slate-700 inline-flex items-center gap-1.5 min-w-0">
                          <span className="truncate">{item.guestName}</span>
                          {item.kind === 'review' && item.rating !== null && (
                            <span className="text-xs text-slate-400 font-normal shrink-0">({item.rating}/5)</span>
                          )}
                        </span>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">
                          {new Date(item.createdAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </span>
                      </div>

                      {/* Zeile 2: (leer) | Nachrichtentext */}
                      <div />
                      <p className="text-sm text-slate-600 line-clamp-2 min-w-0">{item.content}</p>

                      {/* Zeile 3: Kanal-Icon (unter dem Avatar zentriert) | Antworten-Button,
                          beide auf gleicher Höhe. Keine Status-/Kategorie-Badges mehr in
                          dieser kompakten Übersichts-Kachel (siehe /dashboard/messages
                          bzw. /dashboard/reviews für die vollständige Einordnung). */}
                      <div className="flex justify-center items-center">
                        <ChannelIcon size={14} className="text-slate-400" />
                      </div>
                      <div className="flex items-center">
                        {!item.answered && (
                          <span className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-medium shadow-sm">
                            Antworten
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Box 2: Heutige Anreisen */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-slate-100 shrink-0">
            <h2 className="text-base font-bold text-slate-800">Heutige Anreisen</h2>
          </div>
          {/* Nur dieser Container darf scrollen */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {todayArrivals.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">Heute gibt es keine geplanten Anreisen.</p>
            ) : (
              todayArrivals.map((booking) => (
                <div key={booking.id} className="p-4 flex justify-between items-start hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">{booking.guests?.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{booking.room_type}</p>
                  </div>
                  {booking.guests?.vip_notes ? (
                    <div className="text-right flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider mb-1.5 border border-amber-100">
                        <Star size={10} /> VIP
                      </span>
                      <p className="text-xs text-slate-400 max-w-[150px] truncate" title={booking.guests.vip_notes}>
                        {booking.guests.vip_notes}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 mt-1 block">Keine Notizen</span>
                  )}
                </div>
              ))
            )}
            {/* dezenter Leerzustand-Hinweis statt einer leeren Fläche, wenn
                wenige Anreisen vorhanden sind (unabhängig von der äußeren
                Kartenhöhe, die vom Grid vorgegeben wird). */}
            {todayArrivals.length > 0 && todayArrivals.length < 3 && (
              <div className="p-6 text-center">
                <Calendar size={20} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Keine weiteren Anreisen heute</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
