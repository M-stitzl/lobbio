"use client";

import { Suspense } from 'react';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { notifyBadgesChanged } from '@/lib/events';
import SyncEmailsButton from '@/components/SyncEmailsButton';
import { resolveSenderDisplay } from '@/lib/message-display';
import { SenderAvatar, UnassignedBadge } from '@/components/dashboard/sender-avatar';
import {
  Mail,
  MessageCircle,
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  Save,
  Send,
  Info,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react';

type AiCategory = 'anfrage' | 'beschwerde' | 'buchungsaenderung' | 'sonstiges';
type MessageStatus = 'new' | 'answered' | 'pending_review' | 'discarded';
type Channel = 'email' | 'whatsapp' | 'phone' | 'review';

type MessageRow = {
  id: string;
  hotel_id: string;
  guest_id: string | null;
  channel: Channel;
  direction: 'inbound' | 'outbound';
  content: string;
  subject: string | null;
  status: MessageStatus;
  ai_category: AiCategory | null;
  ai_draft_reply: string | null;
  ai_context_note: string | null;
  extracted_sender_name: string | null;
  external_sender_email: string | null;
  approved_by_user: boolean;
  sent_at: string | null;
  created_at: string;
  guests: { name: string; vip_notes: string | null } | null;
};

// Fällt zurück auf einen aus dem Nachrichtentext generierten Kurztitel, falls
// (wie bei manchen Kanälen/älteren Nachrichten) kein Betreff hinterlegt ist.
function displaySubject(msg: Pick<MessageRow, 'subject' | 'content'>): string {
  if (msg.subject?.trim()) return msg.subject;
  const clean = msg.content.replace(/\s+/g, ' ').trim();
  return clean.length > 60 ? `${clean.slice(0, 60)}...` : clean || 'Ohne Betreff';
}

const CHANNEL_ICON: Record<Channel, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  phone: Phone,
  review: MessageCircle,
};

const STATUS_LABEL: Record<MessageStatus, { text: string; className: string }> = {
  new: { text: 'Neu', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  pending_review: { text: 'Prüfung nötig', className: 'bg-amber-50 text-amber-700 border-amber-100' },
  answered: { text: 'Beantwortet', className: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  discarded: { text: 'Verworfen', className: 'bg-slate-100 text-slate-500 border-slate-200' },
};

const CATEGORY_LABEL: Record<AiCategory, { text: string; className: string }> = {
  anfrage: { text: 'Anfrage', className: 'bg-blue-50 text-blue-700 border-blue-100' },
  beschwerde: { text: 'Beschwerde', className: 'bg-red-50 text-red-700 border-red-100' },
  buchungsaenderung: { text: 'Buchungsänderung', className: 'bg-purple-50 text-purple-700 border-purple-100' },
  sonstiges: { text: 'Sonstiges', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function MessagesPageContent() {
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MessageRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MessageRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Direktverlinkung von der Dashboard-Übersicht (?messageId=<id>): öffnet
  // beim Laden automatisch den Detail-/Freigabedialog für genau diesen
  // Eintrag, statt nur auf der allgemeinen Liste zu landen.
  const searchParams = useSearchParams();
  const messageIdParam = searchParams.get('messageId');

  useEffect(() => {
    async function fetchMessages() {
      const { data, error } = await supabase
        .from('messages')
        .select('*, guests(name, vip_notes)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Fehler beim Laden der Nachrichten', error);
      } else if (data) {
        const rows = data as unknown as MessageRow[];
        setMessages(rows);
        if (messageIdParam) {
          const match = rows.find((m) => m.id === messageIdParam);
          if (match) setSelected(match);
        }
      }
      setLoading(false);
    }
    fetchMessages();
    // messageIdParam bewusst nicht als Dependency: soll nur beim initialen
    // Laden ausgewertet werden, nicht bei jeder Navigation innerhalb der Seite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dezente, sich selbst ausblendende Erfolgsmeldung nach dem Löschen –
  // kein Toast-Paket im Projekt vorhanden, daher ein einfacher, selbst
  // gebauter Hinweis statt einer neuen Abhängigkeit.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  function handleUpdated(updated: MessageRow) {
    setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setSelected(updated);
    // Deckt Speichern/Verwerfen/Senden gleichermaßen ab – Status kann sich dabei
    // ändern (relevant für das Nachrichten-Badge), daher immer benachrichtigen.
    notifyBadgesChanged();
  }

  // Eigenständige Refetch-Funktion für den "Postfach synchronisieren"-Button
  // (bewusst getrennt vom useEffect-Fetch beim ersten Laden der Seite).
  async function handleSynced() {
    const { data, error } = await supabase
      .from('messages')
      .select('*, guests(name, vip_notes)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Fehler beim Neuladen der Nachrichten', error);
    } else if (data) {
      setMessages(data as unknown as MessageRow[]);
      notifyBadgesChanged();
    }
  }

  // Echtes DELETE (kein Soft-Delete-Flag). Die RLS-Policy
  // "Hotels sehen und verwalten nur eigene Nachrichten" auf messages ist FOR ALL
  // mit USING (hotel_id = auth.uid()) und deckt DELETE damit bereits ab, geprüft
  // in der Migrationshistorie – keine zusätzliche Policy nötig.
  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('messages').delete().eq('id', deleteTarget.id);
    setDeleting(false);

    if (error) {
      setToast('Löschen fehlgeschlagen.');
      return;
    }

    // Optimistisches UI-Update statt komplettem Neuladen der Seite.
    setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    if (selected?.id === deleteTarget.id) setSelected(null);
    setDeleteTarget(null);
    setToast('Nachricht gelöscht.');
    // Löst u.a. die Realtime-/Badge-Aktualisierung der Kennzahl "Neue
    // Nachrichten" auf der Übersichtsseite aus.
    notifyBadgesChanged();
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Nachrichten</h1>
          <p className="text-slate-500 mt-1">Posteingang für E-Mail, WhatsApp und Telefonnotizen.</p>
        </div>
        <SyncEmailsButton onSynced={handleSynced} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-slate-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Lade Nachrichten...
          </div>
        ) : messages.length === 0 ? (
          <p className="p-8 text-slate-500 text-sm">Keine Nachrichten vorhanden.</p>
        ) : (
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {messages.map((msg) => {
              const ChannelIcon = CHANNEL_ICON[msg.channel] ?? Mail;
              const status = STATUS_LABEL[msg.status] ?? STATUS_LABEL.new;
              const sender = resolveSenderDisplay(msg);
              return (
                <div
                  key={msg.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(msg)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setSelected(msg);
                  }}
                  className={`group w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-start gap-3 cursor-pointer ${
                    msg.status === 'answered' ? 'opacity-50' : ''
                  }`}
                >
                  <SenderAvatar
                    name={sender.name}
                    verified={sender.verified}
                    hasName={sender.hasName}
                    ChannelIcon={ChannelIcon}
                    fallbackIcon={<User size={16} />}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate">{displaySubject(msg)}</span>
                      <span className="text-xs text-slate-400 shrink-0">{formatTime(msg.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      <span className="text-xs text-slate-500 truncate">
                        {sender.name}
                        {sender.hasName && msg.external_sender_email && msg.external_sender_email !== sender.name
                          ? ` (${msg.external_sender_email})`
                          : ''}
                      </span>
                      {!sender.verified && sender.hasName && <UnassignedBadge />}
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-1 mt-1">{msg.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${status.className}`}>
                        {status.text}
                      </span>
                      {msg.ai_category && (
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${CATEGORY_LABEL[msg.ai_category].className}`}
                        >
                          {CATEGORY_LABEL[msg.ai_category].text}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Erst bei Hover über die Zeile sichtbar, damit die Liste optisch
                      nicht überladen wirkt. */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(msg);
                    }}
                    // self-center statt mt-0.5: zentriert das Icon zur ganzen
                    // Kartenhöhe (Zeile bleibt items-start, damit Kanal-Icon/
                    // Text weiterhin oben ausgerichtet sind), unabhängig davon,
                    // wie hoch die jeweilige Karte durch Betreff/Badges wird.
                    className="shrink-0 self-center p-2 rounded-lg text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 hover:bg-red-50 transition-all"
                    title="Nachricht löschen"
                    aria-label="Nachricht löschen"
                  >
                    <Trash2 size={19} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <MessageDetailModal
          message={selected}
          onClose={() => setSelected(null)}
          onUpdated={handleUpdated}
          onRequestDelete={() => setDeleteTarget(selected)}
        />
      )}

      {deleteTarget && (
        <ConfirmDeleteDialog
          deleting={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[70] bg-slate-800 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

// Eigenständiger Bestätigungsdialog vor der destruktiven Löschaktion.
// shadcn/ui AlertDialog ist in diesem Projekt nicht nutzbar (components/ui
// fehlt/ist kaputt – siehe frühere Prompts), daher im etablierten
// hand-gebauten Modal-Stil der App, z-[60] damit er auch über der
// Detailansicht (z-50) liegt.
function ConfirmDeleteDialog({
  deleting,
  onCancel,
  onConfirm,
}: {
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-slate-800 mb-1.5">Nachricht wirklich löschen?</h2>
        <p className="text-sm text-slate-600 mb-5">Diese Aktion kann nicht rückgängig gemacht werden.</p>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {deleting ? 'Löscht...' : 'Endgültig löschen'}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageDetailModal({
  message,
  onClose,
  onUpdated,
  onRequestDelete,
}: {
  message: MessageRow;
  onClose: () => void;
  onUpdated: (updated: MessageRow) => void;
  onRequestDelete: () => void;
}) {
  const [draftText, setDraftText] = useState(message.ai_draft_reply ?? '');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isPendingReview = message.status === 'pending_review';
  const isEmail = message.channel === 'email';
  const sender = resolveSenderDisplay(message);
  const canCreateGuest = !message.guest_id && !!message.extracted_sender_name;
  const [creatingGuest, setCreatingGuest] = useState(false);

  function handleGuestCreated(updated: MessageRow) {
    setCreatingGuest(false);
    onUpdated(updated);
  }

  async function handleSaveDraft() {
    setSaving(true);
    setFeedback(null);
    const { data, error } = await supabase
      .from('messages')
      .update({ ai_draft_reply: draftText })
      .eq('id', message.id)
      .select('*, guests(name, vip_notes)')
      .single();
    setSaving(false);

    if (error) {
      setFeedback({ type: 'error', text: 'Entwurf konnte nicht gespeichert werden.' });
      return;
    }
    setFeedback({ type: 'success', text: 'Entwurf gespeichert.' });
    onUpdated(data as unknown as MessageRow);
  }

  async function handleDiscard() {
    setDiscarding(true);
    setFeedback(null);
    const { data, error } = await supabase
      .from('messages')
      .update({ status: 'discarded' })
      .eq('id', message.id)
      .select('*, guests(name, vip_notes)')
      .single();
    setDiscarding(false);

    if (error) {
      setFeedback({ type: 'error', text: 'Verwerfen fehlgeschlagen.' });
      return;
    }
    onUpdated(data as unknown as MessageRow);
    onClose();
  }

  async function handleApproveAndSend() {
    if (!draftText.trim()) {
      setFeedback({ type: 'error', text: 'Der Antworttext darf nicht leer sein.' });
      return;
    }
    setSending(true);
    setFeedback(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    try {
      const response = await fetch(`/api/messages/${message.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ draftText }),
      });
      const data = await response.json();

      if (!response.ok) {
        setFeedback({ type: 'error', text: data.error ?? 'Versand fehlgeschlagen.' });
        setSending(false);
        return;
      }

      setFeedback({ type: 'success', text: 'Antwort erfolgreich versendet.' });
      onUpdated({
        ...message,
        status: 'answered',
        approved_by_user: true,
        sent_at: new Date().toISOString(),
        ai_draft_reply: draftText,
      });
      setSending(false);
      setTimeout(onClose, 900);
    } catch {
      setFeedback({ type: 'error', text: 'Netzwerkfehler beim Versand.' });
      setSending(false);
    }
  }

  return (
    <>
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-4xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-800">{displaySubject(message)}</h2>
              <p className="text-sm text-slate-500 mt-0.5 truncate">
                {sender.name}
                {sender.hasName && message.external_sender_email && message.external_sender_email !== sender.name
                  ? ` (${message.external_sender_email})`
                  : ''}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
              <XCircle size={22} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${STATUS_LABEL[message.status].className}`}>
              {STATUS_LABEL[message.status].text}
            </span>
            {message.ai_category && (
              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${CATEGORY_LABEL[message.ai_category].className}`}>
                {CATEGORY_LABEL[message.ai_category].text}
              </span>
            )}
            {message.guests?.vip_notes && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-amber-50 text-amber-700 border-amber-100">
                VIP
              </span>
            )}
            {!sender.verified && sender.hasName && <UnassignedBadge />}
          </div>
          {canCreateGuest && (
            <button
              onClick={() => setCreatingGuest(true)}
              className="mt-3 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
            >
              <UserPlus size={13} /> Als neuen Gast anlegen
            </button>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {message.guests?.vip_notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
              <span className="font-semibold">VIP-Notiz: </span>
              {message.guests.vip_notes}
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Original-Nachricht
            </h3>
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {message.content}
            </div>
          </div>

          {isPendingReview ? (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                KI-Antwortentwurf {!isEmail && '(nur Vorschlag – Versand ist derzeit nur für E-Mail möglich)'}
              </h3>
              {message.ai_context_note && (
                <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg p-2.5 text-xs text-blue-800 mb-2">
                  <Info size={14} className="shrink-0 mt-0.5" />
                  {message.ai_context_note}
                </div>
              )}
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
                placeholder="Kein Entwurf vorhanden – bitte manuell formulieren..."
              />
            </div>
          ) : (
            message.ai_draft_reply && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                  {message.status === 'answered' ? 'Versendete Antwort' : 'KI-Antwortentwurf'}
                </h3>
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
                  {message.ai_draft_reply}
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
        </div>

        <div className="p-5 border-t border-slate-100 shrink-0 flex items-center justify-between gap-2 flex-wrap">
          {/* Destruktive Aktion klar links abgesetzt von den übrigen, nicht-
              destruktiven Aktionen rechts (roter Text, eigene Position statt
              in derselben Button-Gruppe). */}
          <button
            onClick={onRequestDelete}
            className="px-3 py-2 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={14} /> Löschen
          </button>

          {isPendingReview && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDiscard}
                disabled={discarding || saving || sending}
                className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Verwerfen
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={saving || discarding || sending}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Save size={14} /> {saving ? 'Speichert...' : 'Speichern/Bearbeiten'}
              </button>
              {isEmail && (
                <button
                  onClick={handleApproveAndSend}
                  disabled={sending || saving || discarding}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {sending ? 'Sende...' : 'Freigeben und senden'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {creatingGuest && (
      <CreateGuestDialog message={message} onClose={() => setCreatingGuest(false)} onCreated={handleGuestCreated} />
    )}
    </>
  );
}

// bewusst kein stilles Auto-Anlegen – der Hotelchef sieht
// Name/E-Mail vorausgefüllt (aus der Extraktion bzw. der Absenderadresse),
// kann sie vor dem Speichern noch prüfen/ergänzen (z.B. Telefonnummer).
// Nach dem Anlegen wird NUR diese eine Nachricht sofort verknüpft – künftige
// Nachrichten derselben Adresse matchen automatisch über den bestehenden
// E-Mail-Abgleich beim Sync.
function CreateGuestDialog({
  message,
  onClose,
  onCreated,
}: {
  message: MessageRow;
  onClose: () => void;
  onCreated: (updated: MessageRow) => void;
}) {
  const [name, setName] = useState(message.extracted_sender_name ?? '');
  const [email, setEmail] = useState(message.external_sender_email ?? '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Bitte einen Namen angeben.');
      return;
    }
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Nicht angemeldet.');
      setSaving(false);
      return;
    }

    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .insert({
        hotel_id: user.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
      })
      .select('id')
      .single();

    if (guestError || !guest) {
      setError('Gast konnte nicht angelegt werden.');
      setSaving(false);
      return;
    }

    const { data: updatedMessage, error: updateError } = await supabase
      .from('messages')
      .update({ guest_id: guest.id })
      .eq('id', message.id)
      .select('*, guests(name, vip_notes)')
      .single();

    setSaving(false);

    if (updateError || !updatedMessage) {
      setError('Gast wurde angelegt, konnte aber nicht mit der Nachricht verknüpft werden.');
      return;
    }

    onCreated(updatedMessage as unknown as MessageRow);
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <form
        onSubmit={handleCreate}
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-slate-800 mb-1.5">Als neuen Gast anlegen</h2>
        <p className="text-sm text-slate-500 mb-4">
          Aus der Nachricht vorausgefüllt – bitte vor dem Speichern prüfen und bei Bedarf ergänzen.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">E-Mail</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Telefon (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            {saving ? 'Legt an...' : 'Gast anlegen'}
          </button>
        </div>
      </form>
    </div>
  );
}

// useSearchParams() braucht in Next 16 eine Suspense-Grenze, sonst bricht der
// Produktions-Build beim Vorrendern ab.
export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500 animate-pulse">Wird geladen …</div>}>
      <MessagesPageContent />
    </Suspense>
  );
}
