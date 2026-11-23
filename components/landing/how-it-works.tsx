"use client";

import { useEffect, useState } from 'react';
import { motion, type Variants } from 'framer-motion';
import { Reveal } from './motion';

const STEPS = [
  {
    title: 'Wir hören zu',
    text: 'In einem kurzen Gespräch schauen wir gemeinsam an, wo bei Ihnen im Alltag die meiste Zeit verloren geht.',
  },
  {
    title: 'Wir richten alles ein',
    text: 'Lobbio wird für Ihr Haus eingerichtet und mit Ihrem bestehenden Postfach verbunden – ohne dass Sie Ihr Buchungssystem wechseln müssen.',
  },
  {
    title: 'Sie testen in Ruhe',
    text: 'Sie nutzen Lobbio im echten Betrieb, mit persönlicher Begleitung. Überzeugt es Sie nicht, gehen Sie ohne Verpflichtung wieder auseinander.',
  },
];

// Einmalige Scroll-Sequenz: Linie zeichnet sich zuerst, Kreise poppen dann
// leicht versetzt nacheinander auf (Gesamtdauer ca. 0.9s).
const containerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18, delayChildren: 0.25 } },
};

const dotVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
};

export default function HowItWorks() {
  // Der Dim-Effekt beim Hover soll auf Touch-Geräten nie "einfrieren" – daher
  // nur aktivieren, wenn das Gerät echtes Hover unterstützt (Maus/Trackpad).
  const [supportsHover, setSupportsHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const mql = window.matchMedia('(hover: hover)');
    const onChange = (e: MediaQueryListEvent) => setSupportsHover(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return (
    <section className="py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">
            In drei Schritten startklar – ohne Technikstress
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Sie müssen nichts installieren und nichts umstellen. Wir übernehmen die Einrichtung, Sie behalten Ihr
            gewohntes Buchungssystem.
          </p>
        </Reveal>

        <motion.div
          className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={containerVariants}
        >
          {/* Verbindungslinie: zeichnet sich beim ersten Erscheinen einmalig
              von links nach rechts auf, statt sofort vollständig dazustehen. */}
          <motion.div
            className="hidden md:block absolute top-5 left-[calc(100%/6)] right-[calc(100%/6)] h-px bg-slate-200 origin-left"
            variants={{
              hidden: { scaleX: 0 },
              visible: { scaleX: 1, transition: { duration: 0.7, ease: 'easeOut' } },
            }}
          />

          {STEPS.map(({ title, text }, i) => {
            const isHovered = hoveredIndex === i;
            const isDimmed = supportsHover && hoveredIndex !== null && !isHovered;
            return (
              // Äußeres Element trägt nur die einmalige Scroll-Pop-Animation
              // (Opacity + Skalierung). Der Hover-Dimm-Effekt sitzt bewusst auf
              // einem verschachtelten, nicht von framer-motion animierten Element,
              // damit sich beide Opacity-Übergänge nicht gegenseitig überschreiben.
              <motion.div key={title} variants={dotVariants} className="relative">
                <div
                  className="text-center px-4 transition-opacity duration-300 ease-out"
                  style={{ opacity: isDimmed ? 0.45 : 1 }}
                  onMouseEnter={supportsHover ? () => setHoveredIndex(i) : undefined}
                  onMouseLeave={supportsHover ? () => setHoveredIndex(null) : undefined}
                >
                  <div
                    className="relative w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center mx-auto mb-4 transition-transform duration-300 ease-out"
                    style={{ transform: isHovered ? 'scale(1.08)' : 'scale(1)' }}
                  >
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-1.5">{title}</h3>
                  <p className="text-sm text-slate-600 max-w-xs mx-auto">{text}</p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
