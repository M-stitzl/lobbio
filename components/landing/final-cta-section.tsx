import { Reveal } from './motion';

export default function FinalCtaSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6 bg-emerald-800">
      <Reveal className="max-w-2xl mx-auto text-center">
        <h2 className="font-[family-name:var(--font-serif-display)] text-2xl md:text-3xl font-medium text-white mb-5">
          Geben Sie Ihren Abend zurück an sich, und Ihre Aufmerksamkeit an Ihre Gäste.
        </h2>
        <p className="text-emerald-50 leading-relaxed mb-8">
          Sehen Sie in einem kurzen Gespräch, wie Lobbio in Ihrem Haus konkret aussehen würde. Unverbindlich, ohne
          Vorbereitung, ohne Verpflichtung.
        </p>
        <a
          href="#kontakt"
          className="inline-block px-6 py-3 rounded-lg bg-white hover:bg-emerald-50 active:translate-y-px text-emerald-800 font-medium transition-colors"
        >
          Gespräch vereinbaren
        </a>
      </Reveal>
    </section>
  );
}
