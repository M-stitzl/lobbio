"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { notifyBadgesChanged } from '@/lib/events';
import {
  Circle, RotateCcw, Loader2, MessageCircleReply, Send, XCircle, Mail, MessageCircle, Phone, Star, AlertTriangle,
} from 'lucide-react';

// Interner DB-Wert (Postgres-Enum task_status: 'open'/'done') – wird nirgends
// als Text angezeigt. Die sichtbaren, deutschen Labels ("Offen"/"Erledigt")
// stehen unten in den Spaltenüberschriften und Button-Titeln.
type TaskStatus = 'open' | 'done';

type SourceMessage = { content: string; channel: 'email' | 'whatsapp' | 'phone' | 'review'; created_at: string } | null;

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  source: 'message' | 'review' | 'manual';
  created_at: string;
  guest_id: string | null;
  requires_guest_reply: boolean;
  guests: { name: string } | null;
  messages: SourceMessage;
};

// Dieselben Icons wie in der Nachrichten-Liste (component/Sidebar.tsx-Konvention).
const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail,
  whatsapp: MessageCircle,
  phone: Phone,
  review: Star,
};

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [followUpTask, setFollowUpTask] = useState<Task | null>(null);
  const [viewMessageTask, setViewMessageTask] = useState<Task | null>(null);
  const [confirmCompleteTask, setConfirmCompleteTask] = useState<Task | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, guests(name), messages(content, channel, created_at)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Fehler beim Laden der Aufgaben', error);
      } else if (data) {
        setTasks(data as unknown as Task[]);
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  async function updateStatus(task: Task, newStatus: TaskStatus) {
    const previousTasks = tasks;
    setUpdatingId(task.id);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));

    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);

    if (error) {
      console.error('Fehler beim Aktualisieren der Aufgabe', error);
      setTasks(previousTasks);
    } else {
      notifyBadgesChanged();
    }
    setUpdatingId(null);
  }

  // kurze, dezente Übergangsanimation (reines CSS, kein neues Paket)
  // bevor eine Karte von "Offen" nach "Erledigt" wandert – die Karte blendet
  // erst aus, dann erst der eigentliche Statuswechsel.
  function completeWithTransition(task: Task) {
    setLeavingId(task.id);
    setTimeout(() => {
      updateStatus(task, 'done');
      setLeavingId(null);
    }, 200);
  }

  function handleMarkDoneClick(task: Task) {
    if (task.requires_guest_reply) {
      // Kein hartes Sperren, nur eine kurze Rückfrage.
      setConfirmCompleteTask(task);
    } else {
      completeWithTransition(task);
    }
  }

  function handleReopen(task: Task) {
    updateStatus(task, 'open');
  }

  // Wird vom FollowUpDialog nach erfolgreichem Versand aufgerufen (Aufgabe
  // geht dabei automatisch auf status='done').
  function handleFollowUpSent(taskId: string) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: 'done' } : t)));
    setFollowUpTask(null);
    setViewMessageTask(null);
    notifyBadgesChanged();
  }

  const openTasks = tasks.filter((t) => t.status === 'open');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="flex flex-col h-full">
      <h1 className="text-2xl font-bold text-slate-800 mb-4 shrink-0">Aufgaben</h1>

      {loading ? (
        <div className="p-8 text-slate-500 flex items-center gap-2">
          <Loader2 size={16} className="animate-spin" /> Lade Aufgaben...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-0">
          {/* Spalte: Offen. flex-col + min-h-0 auf der Spalte, overflow-y-auto +
              min-h-0 auf der Liste darin – ohne beides bricht das Scrollen in
              diesem Grid/Flex-Layout (Kind wächst sonst unbegrenzt mit dem
              Inhalt statt an der Spaltenhöhe zu enden). */}
          <div className="bg-slate-100 p-4 rounded-xl flex flex-col min-h-0">
            <h2 className="font-semibold text-slate-700 mb-4 shrink-0">Offen ({openTasks.length})</h2>
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
              {openTasks.length === 0 ? (
                <p className="text-sm text-slate-500">Keine offenen Aufgaben.</p>
              ) : (
                openTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    leaving={leavingId === task.id}
                    onOpenDetail={() => task.requires_guest_reply && setViewMessageTask(task)}
                    statusIcon={
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarkDoneClick(task);
                        }}
                        disabled={updatingId === task.id}
                        title="Als erledigt markieren"
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50"
                      >
                        {updatingId === task.id ? <Loader2 size={20} className="animate-spin" /> : <Circle size={20} />}
                      </button>
                    }
                    replyAction={
                      task.requires_guest_reply ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFollowUpTask(task);
                          }}
                          title="Antwort verfassen"
                          className="shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center gap-1.5"
                        >
                          <MessageCircleReply size={14} /> Antwort verfassen
                        </button>
                      ) : undefined
                    }
                  />
                ))
              )}
            </div>
          </div>

          {/* Spalte: Erledigt */}
          <div className="bg-slate-100 p-4 rounded-xl opacity-75 flex flex-col min-h-0">
            <h2 className="font-semibold text-slate-700 mb-4 shrink-0">Erledigt ({doneTasks.length})</h2>
            <div className="space-y-3 overflow-y-auto flex-1 min-h-0 pr-1">
              {doneTasks.length === 0 ? (
                <p className="text-sm text-slate-500">Noch keine erledigten Aufgaben.</p>
              ) : (
                doneTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    done
                    leaving={false}
                    onOpenDetail={() => task.requires_guest_reply && setViewMessageTask(task)}
                    statusIcon={
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReopen(task);
                        }}
                        disabled={updatingId === task.id}
                        title="Wieder öffnen"
                        className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                      >
                        {updatingId === task.id ? <Loader2 size={20} className="animate-spin" /> : <RotateCcw size={20} />}
                      </button>
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {confirmCompleteTask && (
        <ConfirmCompleteDialog
          task={confirmCompleteTask}
          onCancel={() => setConfirmCompleteTask(null)}
          onConfirm={() => {
            completeWithTransition(confirmCompleteTask);
            setConfirmCompleteTask(null);
          }}
        />
      )}

      {followUpTask && (
        <FollowUpDialog task={followUpTask} onClose={() => setFollowUpTask(null)} onSent={handleFollowUpSent} />
      )}

      {viewMessageTask?.messages && (
        <MessagePeekDialog
          task={viewMessageTask}
          onClose={() => setViewMessageTask(null)}
          onReply={() => {
            setFollowUpTask(viewMessageTask);
            setViewMessageTask(null);
          }}
        />
      )}
    </div>
  );
}

// Karte zeigt nur noch Titel + Badge + Gästename (kein Vorschautext
// mehr). Bei gästebezogenen Aufgaben ist die gesamte Karte klickbar (öffnet
// die Detailansicht) – außer den Aktions-Buttons, die per stopPropagation
// eigenständig bleiben.
function TaskCard({
  task,
  done = false,
  leaving,
  onOpenDetail,
  statusIcon,
  replyAction,
}: {
  task: Task;
  done?: boolean;
  leaving: boolean;
  onOpenDetail: () => void;
  /** Erledigt-Kreis bzw. Wieder-öffnen-Icon – immer oben rechts, unabhängig vom Kartentyp. */
  statusIcon: React.ReactNode;
  /** Nur bei requires_guest_reply=true und offener Aufgabe gesetzt. */
  replyAction?: React.ReactNode;
}) {
  const clickable = task.requires_guest_reply;

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onOpenDetail : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') onOpenDetail();
            }
          : undefined
      }
      className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 transition-opacity duration-200 ${
        leaving ? 'opacity-0' : 'opacity-100'
      } ${clickable ? 'cursor-pointer hover:border-emerald-200 hover:shadow-md transition-shadow' : ''}`}
    >
      {/* Zeile 1: Titel + Erledigt-Kreis, für beide Kartentypen identisch aufgebaut. */}
      <div className="flex items-start justify-between gap-3">
        <h3 className={`flex-1 min-w-0 font-medium text-slate-800 ${done ? 'line-through' : ''}`}>{task.title}</h3>
        {statusIcon}
      </div>

      {/* Zeile 2: bei gästebezogenen Aufgaben Badge + Antwort-Button, sonst wie
          bisher der graue Beschreibungstext – beide Kartentypen bekommen so
          exakt dieselbe Struktur, nur mit unterschiedlichem Inhalt. */}
      {task.requires_guest_reply ? (
        <div className="flex items-center justify-between gap-3 mt-2">
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border ${
              done ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}
          >
            <MessageCircleReply size={11} /> {done ? 'Gast beantwortet' : 'Rückmeldung ausstehend'}
          </span>
          {replyAction}
        </div>
      ) : (
        task.description && (
          <p className={`text-xs mt-1 ${done ? 'text-slate-400 line-through' : 'text-slate-500'}`}>{task.description}</p>
        )
      )}

      {task.requires_guest_reply && task.guests?.name && (
        <p className="text-xs text-slate-500 mt-1">Anfrage von: {task.guests.name}</p>
      )}
    </div>
  );
}

// informativer Dialog mit der vollständigen Original-Nachricht,
// inkl. Absender, Kanal und Zeitstempel, plus optionalem direktem Einstieg in
// den Antwort-Dialog, damit man nicht extra zurück zur Karte muss.
function MessagePeekDialog({ task, onClose, onReply }: { task: Task; onClose: () => void; onReply: () => void }) {
  const message = task.messages;
  if (!message) return null;
  const ChannelIcon = CHANNEL_ICON[message.channel] ?? Mail;

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-800 font-bold">
              <ChannelIcon size={16} className="text-slate-400 shrink-0" />
              {task.guests?.name ?? 'Unbekannter Absender'}
            </div>
            <p className="text-xs text-slate-400 mt-1">{formatTimestamp(message.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <XCircle size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50 text-sm text-slate-700 whitespace-pre-wrap">
          {message.content}
        </div>
        {task.requires_guest_reply && task.status === 'open' && (
          <div className="p-4 border-t border-slate-100 shrink-0 flex justify-end">
            <button
              onClick={onReply}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors flex items-center gap-1.5"
            >
              <MessageCircleReply size={14} /> Antwort verfassen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// kurze Rückfrage statt harter Sperre, wenn eine gästebezogene
// Aufgabe direkt (ohne Antwort-Versand) als erledigt markiert werden soll.
function ConfirmCompleteDialog({
  task,
  onCancel,
  onConfirm,
}: {
  task: Task;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-[60]" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 p-2 rounded-lg bg-amber-50 text-amber-600">
            <AlertTriangle size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-800 mb-1">Wurde der Gast bereits informiert?</h2>
            <p className="text-sm text-slate-600">
              „{task.title}&rdquo; wartet eigentlich auf eine Rückmeldung an {task.guests?.name ?? 'den Gast'}. Falls das
              z.B. schon telefonisch geklärt wurde, kannst du trotzdem direkt abschließen.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors"
          >
            Trotzdem erledigen
          </button>
        </div>
      </div>
    </div>
  );
}

// Dialog zum Verfassen/Versenden einer Folge-Nachricht aus einer
// gästebezogenen Aufgabe heraus. Zwei Schritte wie im bestehenden
// Freigabe-Workflow: erst KI-Entwurf erzeugen (editierbar), dann senden.
function FollowUpDialog({
  task,
  onClose,
  onSent,
}: {
  task: Task;
  onClose: () => void;
  onSent: (taskId: string) => void;
}) {
  const [notes, setNotes] = useState('');
  const [draftText, setDraftText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function authHeader(): Promise<Record<string, string>> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
  }

  async function handleGenerate() {
    if (!notes.trim()) {
      setError('Bitte zuerst Stichpunkte oder einen Text eintragen.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/generate-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ notes }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'KI-Entwurf konnte nicht erstellt werden.');
        return;
      }
      setDraftText(data.draft);
    } catch {
      setError('Netzwerkfehler beim Erstellen des Entwurfs.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend() {
    if (!draftText.trim()) {
      setError('Der Antworttext darf nicht leer sein.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}/send-followup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ draftText }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error ?? 'Versand fehlgeschlagen.');
        return;
      }
      onSent(task.id);
    } catch {
      setError('Netzwerkfehler beim Versand.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 shrink-0 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Antwort verfassen</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {task.title}
              {task.guests?.name ? ` · an ${task.guests.name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 shrink-0">
            <XCircle size={22} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
              Stichpunkte
            </h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Stichpunkte eingeben, z.B.: Balkonzimmer verfügbar, E-Bikes bei Sport Müller ausleihbar, 15€/Tag"
              className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              Stichpunkte reichen – vollständiger Text funktioniert genauso, ist aber kein Muss.
            </p>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || sending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {generating ? <Loader2 size={14} className="animate-spin" /> : <MessageCircleReply size={14} />}
            {generating ? 'Erstellt Entwurf...' : 'Antwort generieren'}
          </button>

          {draftText && (
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5">
                Folge-E-Mail an den Gast
              </h3>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-lg p-3 text-sm text-slate-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors resize-none"
              />
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg text-sm flex items-center gap-2 bg-red-50 border border-red-100 text-red-700">
              <XCircle size={16} /> {error}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-100 shrink-0 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSend}
            disabled={!draftText.trim() || sending || generating}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {sending ? 'Sendet...' : 'Senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
