import { Reveal } from './motion';

export default function PricingSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6">
      {/* Kein Kasten mehr: eine einzelne Aussage braucht keine Karte, um
          Hierarchie zu zeigen – eine Trennlinie oben genügt (siehe
          motion.tsx-Kommentar zur ruhigeren Bildsprache dieser Seite). */}
      <Reveal className="max-w-2xl mx-auto text-center border-t border-stone-200 pt-14">
        <h2 className="font-[family-name:var(--font-serif-display)] text-2xl font-medium text-stone-800 mb-5">
          Ein fairer Preis, der zu Ihrem Haus passt
        </h2>
        <p className="text-lg text-stone-600 leading-relaxed mb-8">
          Ein Haus mit zwölf Zimmern braucht etwas anderes als eines mit dreißig. Deshalb gibt es bei Lobbio keinen
          Standardtarif, sondern einen Preis, der zur Größe Ihres Hauses passt. Was das für Sie bedeutet, klären wir
          in einem kurzen, unverbindlichen Gespräch.
        </p>
        <a
          href="#kontakt"
          className="inline-block px-6 py-3 rounded-lg bg-emerald-700 hover:bg-emerald-800 active:translate-y-px text-white font-medium transition-colors"
        >
          Gespräch vereinbaren
        </a>
      </Reveal>
    </section>
  );
}
