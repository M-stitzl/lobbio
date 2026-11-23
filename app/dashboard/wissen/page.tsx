"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react';

type KnowledgeEntry = {
  id: string;
  topic: string;
  content: string;
  updated_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [newTopic, setNewTopic] = useState('');
  const [newContent, setNewContent] = useState('');
  const [adding, setAdding] = useState(false);

  const [editTopic, setEditTopic] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchEntries() {
      const { data, error } = await supabase.from('knowledge_base').select('*').order('updated_at', { ascending: false });
      if (error) console.error('Fehler beim Laden der Wissensdatenbank', error);
      else if (data) setEntries(data as KnowledgeEntry[]);
      setLoading(false);
    }
    fetchEntries();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTopic.trim() || !newContent.trim()) return;

    setAdding(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({ hotel_id: user?.id, topic: newTopic.trim(), content: newContent.trim() })
      .select('*')
      .single();
    setAdding(false);

    if (error) {
      console.error('Fehler beim Anlegen des Wissenseintrags', error);
      return;
    }
    setEntries((prev) => [data as KnowledgeEntry, ...prev]);
    setNewTopic('');
    setNewContent('');
  }

  function startEdit(entry: KnowledgeEntry) {
    setEditingId(entry.id);
    setEditTopic(entry.topic);
    setEditContent(entry.content);
  }

  async function handleSaveEdit(id: string) {
    if (!editTopic.trim() || !editContent.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('knowledge_base')
      .update({ topic: editTopic.trim(), content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    setSaving(false);

    if (error) {
      console.error('Fehler beim Speichern des Wissenseintrags', error);
      return;
    }
    setEntries((prev) => prev.map((e) => (e.id === id ? (data as KnowledgeEntry) : e)));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('knowledge_base').delete().eq('id', id);
    if (error) {
      console.error('Fehler beim Löschen des Wissenseintrags', error);
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setConfirmDeleteId(null);
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen size={22} className="text-emerald-600" /> Wissensdatenbank
        </h1>
        <p className="text-slate-500 mt-1">
          Geprüfte Fakten über Ihr Haus (Ausstattung, Öffnungszeiten, Regelungen), die in Antwortentwürfe einfließen
          dürfen. Zu allem, was hier nicht steht, weichen Entwürfe bewusst ehrlich aus, statt zu spekulieren.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="shrink-0 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3"
      >
        <input
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          placeholder="Schlagwort, z.B. Sauna"
          className="sm:w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
        />
        <input
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Fakt in ein bis wenigen Sätzen"
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={adding || !newTopic.trim() || !newContent.trim()}
          className="shrink-0 px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Hinzufügen
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 min-h-0 overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-8 text-slate-500 flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Lade Wissensdatenbank...
          </div>
        ) : entries.length === 0 ? (
          <p className="p-8 text-slate-500 text-sm">
            Noch keine Einträge vorhanden. Fügen Sie oben einen ersten Fakt hinzu.
          </p>
        ) : (
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4">
                {editingId === entry.id ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      value={editTopic}
                      onChange={(e) => setEditTopic(e.target.value)}
                      className="sm:w-48 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                    />
                    <input
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSaveEdit(entry.id)}
                        disabled={saving}
                        className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:opacity-50"
                        title="Speichern"
                      >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                        title="Abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-100">
                          {entry.topic}
                        </span>
                        <span className="text-xs text-slate-400">Aktualisiert am {formatDate(entry.updated_at)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1.5">{entry.content}</p>
                    </div>

                    {confirmDeleteId === entry.id ? (
                      <div className="flex items-center gap-2 shrink-0 text-xs">
                        <span className="text-slate-500">Löschen?</span>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
                        >
                          Ja
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 rounded text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                          Nein
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                          title="Bearbeiten"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(entry.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
