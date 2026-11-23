"use client";
import { Suspense } from 'react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Search, XCircle, Star, Sparkles, Loader2, BedDouble } from 'lucide-react';

type Guest = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  vip_notes: string | null;
  preferences: string[] | null;
  purchase_history: string[] | null;
};

type BookingStatus = 'confirmed' | 'pending' | 'cancelled';

type Booking = {
  id: string;
  guest_id: string;
  check_in: string;
  check_out: string;
  room_type: string;
  status: BookingStatus;
};

type GuestInsight = {
  id: string;
  guest_id: string;
  type: string;
  title: string;
  description: string | null;
  priority: string;
};

// Gleiche Statuslabels/Farben wie auf /bookings (bewusst hier dupliziert, statt
// die andere Seite zu importieren/anzufassen – siehe Scope-Hinweis im Chat).
const BOOKING_STATUS_LABEL: Record<BookingStatus, { text: string; className: string }> = {
  confirmed: { text: 'Bestätigt', className: 'bg-emerald-100 text-emerald-800' },
  pending: { text: 'Ausstehend', className: 'bg-amber-100 text-amber-800' },
  cancelled: { text: 'Storniert', className: 'bg-red-100 text-red-800' },
};

function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function computeStats(guestId: string, bookings: Booking[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastConfirmed = bookings.filter(
    (b) => b.guest_id === guestId && b.status === 'confirmed' && new Date(b.check_out) < today
  );

  const totalStays = pastConfirmed.length;
  const avgNights =
    totalStays > 0
      ? pastConfirmed.reduce((sum, b) => sum + nightsBetween(b.check_in, b.check_out), 0) / totalStays
      : null;
  const lastStay =
    totalStays > 0
      ? pastConfirmed.reduce((latest, b) => (b.check_out > latest ? b.check_out : latest), pastConfirmed[0].check_out)
      : null;

  return { totalStays, avgNights, lastStay };
}

// "Aktuell zu Gast" = es gibt eine bestätigte Buchung, deren Zeitraum das
// heutige Datum einschließt (check_in <= heute <= check_out).
function isCurrentlyCheckedIn(guestId: string, bookings: Booking[]): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return bookings.some(
    (b) =>
      b.guest_id === guestId &&
      b.status === 'confirmed' &&
      new Date(b.check_in) <= today &&
      new Date(b.check_out) >= today
  );
}

function GuestsPageContent() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [insights, setInsights] = useState<GuestInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Guest | null>(null);
  // Standardmäßig nur aktuell eingecheckte Gäste anzeigen.
  const [stayFilter, setStayFilter] = useState<'current' | 'other'>('current');
  // Direktverlinkung von der Buchungen-Seite (?guestId=<id>, "Zum
  // Gästeprofil"): öffnet beim Laden automatisch das Gästeprofil, statt nur
  // auf der allgemeinen Liste zu landen. Gleiches Muster wie messageId/
  // reviewId auf der Dashboard-Übersicht.
  const searchParams = useSearchParams();
  const guestIdParam = searchParams.get('guestId');

  useEffect(() => {
    async function fetchData() {
      const [{ data: guestData, error: guestError }, { data: bookingData }, { data: insightData }] = await Promise.all([
        supabase.from('guests').select('*').order('name'),
        supabase.from('bookings').select('id, guest_id, check_in, check_out, room_type, status'),
        supabase
          .from('ai_recommendations')
          .select('id, guest_id, type, title, description, priority')
          .not('guest_id', 'is', null)
          .eq('dismissed', false),
      ]);

      if (guestError) console.error('Fehler beim Laden der Gäste', guestError);
      else if (guestData) {
        const rows = guestData as Guest[];
        setGuests(rows);
        if (guestIdParam) {
          const match = rows.find((g) => g.id === guestIdParam);
          if (match) setSelected(match);
        }
      }

      if (bookingData) setBookings(bookingData as Booking[]);
      if (insightData) setInsights(insightData as GuestInsight[]);

      setLoading(false);
    }
    fetchData();
    // guestIdParam bewusst nicht als Dependency: soll nur beim initialen
    // Laden ausgewertet werden, nicht bei jeder Navigation innerhalb der Seite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const query = search.trim().toLowerCase();
  const currentGuestCount = guests.filter((g) => isCurrentlyCheckedIn(g.id, bookings)).length;
  const otherGuestCount = guests.length - currentGuestCount;
  const filteredGuests = guests
    .filter((g) => g.name.toLowerCase().includes(query) || (g.email ?? '').toLowerCase().includes(query))
    .filter((g) => isCurrentlyCheckedIn(g.id, bookings) === (stayFilter === 'current'));

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Gäste</h1>
        <p className="text-slate-500 mb-4">Gästeprofile mit Präferenzen, Historie und KI-Insights.</p>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative max-w-sm w-full sm:w-auto sm:flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nach Name oder E-Mail suchen..."
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStayFilter('current')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                stayFilter === 'current' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Aktuell im Haus ({currentGuestCount})
            </button>
            <button
              onClick={() => setStayFilter('other')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                stayFilter === 'other' ? 'bg-emerald-700 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Früher/Zukünftig ({otherGuestCount})
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="p-8 text-slate-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Lade Gäste...
          </div>
        ) : filteredGuests.length === 0 ? (
          <p className="p-8 text-center text-slate-500 text-sm">
            {guests.length === 0 ? 'Keine Gäste vorhanden.' : 'Keine Gäste gefunden.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-4">
            {filteredGuests.map((guest) => {
              const { totalStays } = computeStats(guest.id, bookings);
              const topPreferences = (guest.preferences ?? []).slice(0, 2);
              return (
                <button
                  key={guest.id}
                  onClick={() => setSelected(guest)}
                  className="text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:shadow-md hover:border-emerald-200 hover:ring-1 hover:ring-emerald-200 transition-all"
                >
                  <h3 className="font-semibold text-slate-800 mb-2">{guest.name}</h3>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100">
                      <BedDouble size={11} /> {totalStays} {totalStays === 1 ? 'Aufenthalt' : 'Aufenthalte'}
                    </span>
                    {topPreferences.map((p) => (
                      <span
                        key={p}
                        className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-slate-100 text-slate-600 border-slate-200"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <GuestDetailModal
          guest={selected}
          bookings={bookings.filter((b) => b.guest_id === selected.id)}
          insights={insights.filter((i) => i.guest_id === selected.id)}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setGuests((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

function GuestDetailModal({
  guest,
  bookings,
  insights,
  onClose,
  onUpdated,
}: {
  guest: Guest;
  bookings: Booking[];
  insights: GuestInsight[];
  onClose: () => void;
  onUpdated: (updated: Guest) => void;
}) {
  const [notes, setNotes] = useState(guest.vip_notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSaveNotes() {
    setSaving(true);
    setSaved(false);
    const { data, error } = await supabase
      .from('guests')
      .update({ vip_notes: notes.trim() || null })
      .eq('id', guest.id)
      .select('*')
      .single();
    setSaving(false);

    if (error) {
      console.error('Fehler beim Speichern der Notizen', error);
      return;
    }
    onUpdated(data as Guest);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const { totalStays, avgNights, lastStay } = computeStats(guest.id, bookings);
  const sortedBookings = [...bookings].sort((a, b) => (a.check_in < b.check_in ? 1 : -1));

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{guest.name}</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {[guest.email, guest.phone].filter(Boolean).join(' | ') || 'Keine Kontaktdaten hinterlegt'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <XCircle size={22} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Kennzahlen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Aufenthalte</p>
              <p className="text-xl font-bold text-slate-800">{totalStays}</p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Ø Aufenthaltsdauer</p>
              <p className="text-xl font-bold text-slate-800">
                {avgNights !== null ? `${avgNights.toFixed(1).replace('.', ',')} Nächte` : '–'}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Letzter Aufenthalt</p>
              <p className="text-xl font-bold text-slate-800">
                {lastStay ? new Date(lastStay).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }) : '–'}
              </p>
            </div>
          </div>

          {/* Präferenzen */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Präferenzen</h3>
            {(guest.preferences ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Keine hinterlegt.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(guest.preferences ?? []).map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Zusatzkäufe */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Bisherige Zusatzkäufe</h3>
            {(guest.purchase_history ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">Keine hinterlegt.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(guest.purchase_history ?? []).map((p) => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Wichtige Informationen zum Gast (ehemals "KI-Insight") – Block bleibt
              vollständig ausgeblendet, wenn kein Insight vorhanden ist. */}
          {insights.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Wichtige Informationen zum Gast</h3>
              <div className="space-y-2">
                {insights.map((i) => (
                  <div key={i.id} className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 flex items-center gap-2.5">
                    <div className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg shrink-0">
                      <Sparkles size={14} />
                    </div>
                    <p className="text-sm text-emerald-800">{i.description ?? i.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buchungshistorie */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">Buchungshistorie</h3>
            {sortedBookings.length === 0 ? (
              <p className="text-sm text-slate-500">Keine Buchungen vorhanden.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-1.5 font-medium">Zeitraum</th>
                    <th className="py-1.5 font-medium">Zimmertyp</th>
                    <th className="py-1.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedBookings.map((b) => (
                    <tr key={b.id}>
                      <td className="py-1.5 text-slate-700">
                        {new Date(b.check_in).toLocaleDateString('de-DE')} – {new Date(b.check_out).toLocaleDateString('de-DE')}
                      </td>
                      <td className="py-1.5 text-slate-600">{b.room_type}</td>
                      <td className="py-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${BOOKING_STATUS_LABEL[b.status].className}`}>
                          {BOOKING_STATUS_LABEL[b.status].text}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Weitere Notizen (ehemals vip_notes) – frei editierbar */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <Star size={12} /> Weitere Notizen
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Freitext-Notizen zum Gast..."
              className="w-full text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSaveNotes}
                disabled={saving || notes === (guest.vip_notes ?? '')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {saving && <Loader2 size={12} className="animate-spin" />}
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
              {saved && <span className="text-xs text-emerald-600">Gespeichert.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// useSearchParams() braucht in Next 16 eine Suspense-Grenze, sonst bricht der
// Produktions-Build beim Vorrendern ab.
export default function GuestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 animate-pulse">Wird geladen …</div>}>
      <GuestsPageContent />
    </Suspense>
  );
}
