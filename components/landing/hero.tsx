"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Users, MessageCircle, Tag, CheckCircle2, Star, BedDouble, Sparkles, CheckSquare, MessageSquare, AlertCircle,
} from 'lucide-react';
import ProductPreviewCard, { type PreviewTabContent } from './product-preview-card';

type TabKey = 'nachrichten' | 'bewertungen' | 'gaeste' | 'aufgaben';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'nachrichten', label: 'Nachrichten' },
  { key: 'bewertungen', label: 'Bewertungen' },
  { key: 'gaeste', label: 'Gästeprofile' },
  { key: 'aufgaben', label: 'Aufgaben' },
];

// Inhalte sind bewusst keine Fantasie-Beispiele, sondern an die tatsächlichen
// Seed-/Demo-Daten des Projekts angelehnt (Maximilian Huber, Familie Schmidt,
// Thomas Müller, die Google-Testbewertungen aus data/dummy-reviews.json) –
// siehe Erläuterung im Chat. Sprache bewusst ohne "KI"/"Agent"/"Automatisierung":
// konkret beschrieben, was Lobbio tut, statt mit welcher Technik.
const TAB_CONTENT: Record<TabKey, PreviewTabContent> = {
  nachrichten: {
    eyebrow: 'Neue Anfrage: Antwortvorschlag liegt bereit',
    fields: [
      { label: 'Gast', value: 'Maximilian Huber', icon: Users },
      { label: 'Kanal', value: 'WhatsApp', icon: MessageCircle },
      { label: 'Kategorie', value: 'Buchungsänderung', icon: Tag },
      { label: 'Nachricht (Auszug)', value: '„Können wir den Checkout morgen auf 12 Uhr schieben?“', icon: MessageSquare },
      { label: 'Antwortvorschlag', value: 'Bereits formuliert', icon: CheckCircle2 },
      { label: 'Status', value: 'Freigabe in einem Klick', icon: CheckCircle2 },
    ],
  },
  bewertungen: {
    eyebrow: 'Kritische Bewertung erkannt: Antwortvorschlag liegt bereit',
    fields: [
      { label: 'Gast', value: 'Jonas B.', icon: Users },
      { label: 'Plattform', value: 'Google, 2 Sterne', icon: Star },
      { label: 'Erkannt', value: 'Kritische Bewertung', icon: AlertCircle, iconClassName: 'text-amber-600' },
      { label: 'Bewertung (Auszug)', value: '„Beim Frühstück fehlten uns vegane Alternativen, es gab nur Kuhmilch.“', icon: MessageSquare },
      { label: 'Antwortvorschlag', value: 'Bereits formuliert', icon: CheckCircle2 },
      { label: 'Status', value: 'Freigabe in einem Klick', icon: CheckCircle2 },
    ],
  },
  gaeste: {
    eyebrow: 'Stammgast wiedererkannt',
    fields: [
      { label: 'Gast', value: 'Thomas Müller', icon: Users },
      { label: 'Status', value: 'Stammgast · 4 Aufenthalte', icon: BedDouble },
      { label: 'Präferenz', value: 'Zimmer mit Bergblick', icon: Star },
      { label: 'Letzter Aufenthalt', value: 'Juli 2026', icon: BedDouble },
      { label: 'Hinweis', value: 'Vermutlich offen für ein Wellness-Angebot', icon: Sparkles },
      { label: 'Empfehlung', value: 'Beim Check-in ansprechen', icon: CheckCircle2 },
    ],
  },
  aufgaben: {
    eyebrow: 'Aufgabe direkt aus der Nachricht erstellt',
    fields: [
      { label: 'Aufgabe', value: 'Zustellbett für Familie Schmidt richten', icon: CheckSquare },
      { label: 'Quelle', value: 'Aus E-Mail erstellt', icon: MessageSquare },
      { label: 'Erstellt', value: 'Direkt aus der Nachricht', icon: CheckSquare },
      { label: 'Status', value: 'Offen', icon: CheckSquare },
      { label: 'Notiz', value: 'Zimmer 12, Anreise heute Abend, Gast hat nochmals erinnert.', icon: MessageSquare },
      { label: 'Vorteil', value: 'Geht in der Hektik nicht mehr unter', icon: CheckCircle2 },
    ],
  },
};

export default function Hero() {
  const [activeTab, setActiveTab] = useState<TabKey>('nachrichten');

  return (
    <section className="relative overflow-hidden">
      {/* Ruhiger, flacher Hintergrund statt Rauschtextur + starkem Verlauf:
          ein warmer Papierton mit einem sehr weichen Akzent-Schimmer. */}
      <div
        className="absolute inset-0 bg-stone-50"
        style={{
          backgroundImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.06), transparent 70%)',
        }}
      />

      {/* Sehr dezente, abstrakte Bergsilhouette am unteren Hero-Rand – bewusst
          nur eine dünne Linie, keine Fotografie. */}
      <svg
        className="absolute bottom-0 left-0 w-full h-20 md:h-28 text-emerald-800/10"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M0 110 L150 60 L280 95 L420 30 L560 85 L700 45 L850 100 L1000 55 L1200 90 L1200 120 L0 120 Z"
          fill="currentColor"
        />
      </svg>

      <div className="relative max-w-3xl mx-auto px-4 pt-20 pb-24 md:pt-24 md:pb-32 flex flex-col items-center text-center gap-6">
        <h1 className="font-[family-name:var(--font-serif-display)] text-4xl md:text-5xl font-medium text-stone-800 leading-[1.15]">
          Weniger Zeit am Postfach. Mehr Zeit für Ihre Gäste.
        </h1>
        <p className="text-lg text-stone-600 max-w-xl leading-relaxed">
          Lobbio sammelt Gästenachrichten und Bewertungen an einem Ort und legt zu jeder eine fertige Antwort vor.
          Sie lesen, bestätigen, fertig.
        </p>
        <a
          href="#kontakt"
          className="px-6 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:translate-y-px text-white font-medium transition-colors"
        >
          Gespräch vereinbaren
        </a>

        <div className="w-full max-w-xl mt-4">
          {/* Crossfade + minimaler Slide beim Tab-Wechsel, statt abruptem
              Austausch des Karteninhalts. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <ProductPreviewCard content={TAB_CONTENT[activeTab]} />
            </motion.div>
          </AnimatePresence>

          <p className="text-center text-sm text-stone-400 mt-4">
            Gestaltet für familiengeführte Hotels im Chiemgau.
          </p>

          <div className="flex items-center justify-center gap-2 mt-5 flex-wrap">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 ${
                  activeTab === tab.key
                    ? 'bg-emerald-700 border-emerald-700 text-white'
                    : 'bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
