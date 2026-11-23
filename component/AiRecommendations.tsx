"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Star, X, AlertCircle, TrendingUp, Lightbulb, Users } from 'lucide-react';

type RecommendationType = 'alert' | 'upsell' | 'guest_context' | 'pattern';
type RecommendationPriority = 'low' | 'medium' | 'high';

type Recommendation = {
  id: string;
  type: RecommendationType;
  title: string;
  description: string | null;
  priority: RecommendationPriority;
};

export default function AiRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecommendations() {
      const { data, error } = await supabase
        .from('ai_recommendations')
        .select('*')
        .eq('dismissed', false)
        .order('priority', { ascending: false });

      if (error) console.error('Fehler beim Laden der KI-Empfehlungen', error);
      else if (data) setRecommendations(data as Recommendation[]);
      setLoading(false);
    }
    fetchRecommendations();
  }, []);

  const handleDismiss = async (id: string) => {
    setRecommendations((prev) => prev.filter((rec) => rec.id !== id));
    await supabase.from('ai_recommendations').update({ dismissed: true }).eq('id', id);
  };

  // festes, wiederverwendbares Farbsystem je Empfehlungs-Typ statt
  // zufällig wirkender Icon-Farben – alert = Rot (Aufmerksamkeit nötig),
  // upsell = Grün (positiv/umsatzbezogen), guest_context = Blau (neutrale
  // Gästeinfo), pattern = Violett (erkanntes Muster).
  const getIconForType = (type: string) => {
    switch (type) {
      case 'alert': return <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />;
      case 'upsell': return <TrendingUp size={18} className="text-emerald-500 shrink-0 mt-0.5" />;
      case 'guest_context': return <Users size={18} className="text-blue-500 shrink-0 mt-0.5" />;
      case 'pattern':
      default: return <Lightbulb size={18} className="text-violet-500 shrink-0 mt-0.5" />;
    }
  };

  const getBorderColor = (priority: string) => {
    if (priority === 'high') return 'border-red-200 bg-red-50/50';
    if (priority === 'medium') return 'border-blue-200 bg-blue-50/50';
    return 'border-slate-200 bg-white';
  };

  return (
    // NEU: border-l und border-slate-200 sorgen für eine saubere, vertikale Linie zum Hauptinhalt
    // bg-slate-50/80 und backdrop-blur geben der Spalte eine minimale materielle Tiefe
    <aside className="hidden xl:flex flex-col w-80 bg-slate-50/80 backdrop-blur-sm border-l border-slate-200 h-[calc(100vh-73px)] fixed right-0 top-[73px] z-30">
      
      {/* NEU: border-b sorgt für eine klare Abgrenzung der Überschrift zu den scrollenden Karten */}
      <div className="pt-6 px-6 pb-4 border-b border-slate-200/60 shrink-0">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Star size={18} className="text-emerald-600" />
          Empfehlungen
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500 text-center mt-4">Analysiere Daten...</p>
        ) : recommendations.length === 0 ? (
          <div className="text-center p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50">
            <p className="text-sm text-slate-500">Aktuell keine neuen Empfehlungen.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div 
              key={rec.id} 
              className={`p-4 rounded-xl border shadow-sm relative transition-all group hover:shadow-md ${getBorderColor(rec.priority)}`}
            >
              <button 
                onClick={() => handleDismiss(rec.id)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors opacity-0 group-hover:opacity-100"
                title="Verwerfen"
              >
                <X size={16} />
              </button>
              <div className="flex gap-3">
                {getIconForType(rec.type)}
                <div>
                  <h3 className="text-sm font-semibold text-slate-800 pr-4 leading-tight mb-1.5">{rec.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{rec.description}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}