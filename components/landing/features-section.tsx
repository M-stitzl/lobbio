// Reines Server Component: enthält selbst keine Hooks/Motion-Aufrufe mehr,
// Reveal/StaggerGroup/StaggerItem sind bereits eigene Client-Leaf-Komponenten
// (siehe motion.tsx) – RSC-Grundsatz laut Vorgabe: Server Components rendern
// statisches Layout, Interaktivität bleibt isoliert.
import Image from 'next/image';
import { MessageSquare, Users, CheckSquare, BarChart3 } from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from './motion';

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Jede Nachricht an einem Ort, mit fertiger Antwort',
    text: 'E-Mails und Bewertungen laufen gebündelt bei Lobbio ein. Zu jeder Anfrage liegt ein passender Antwortvorschlag bereit, den Sie mit einem Klick übernehmen oder in Ruhe anpassen.',
  },
  {
    icon: Users,
    title: 'Sie erkennen jeden Stammgast sofort wieder',
    text: 'Lobbio merkt sich, wer schon da war und was ihm wichtig ist: Zimmerwunsch, Vorlieben, frühere Aufenthalte. So begrüßen Sie jeden Gast persönlich, ohne lange nachzuschlagen.',
  },
  {
    icon: CheckSquare,
    title: 'Kein Gästewunsch geht mehr unter',
    text: 'Aus jeder Nachricht und jeder Bewertung wird bei Bedarf automatisch eine Aufgabe, vom Late Check-out bis zur Flasche Sekt aufs Zimmer. Nichts bleibt mehr an einem Notizzettel hängen.',
  },
  {
    icon: BarChart3,
    title: 'Sie sehen auf einen Blick, wie Ihr Haus dasteht',
    text: 'Bewertungsschnitt, offene Anfragen, wiederkehrende Themen: Lobbio zeigt Ihnen ohne Excel und ohne Aufwand, wo alles gut läuft und wo sich etwas häuft.',
  },
];

export default function FeaturesSection() {
  return (
    <section id="funktionen" className="py-20 md:py-28 px-4 md:px-6 bg-stone-100/60">
      <div className="max-w-5xl mx-auto">
        <Reveal className="text-center mb-14 max-w-2xl mx-auto">
          <h2 className="font-[family-name:var(--font-serif-display)] text-2xl md:text-3xl font-medium text-stone-800 mb-5">
            Ein Bildschirm, der Ihnen den Rücken freihält.
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed">
            Lobbio bringt alles zusammen, was Ihre Gäste Ihnen schreiben, und bereitet die Arbeit so weit vor, dass
            für Sie nur noch die Entscheidung bleibt.
          </p>
        </Reveal>

        {/* Der Screenshot steht für sich, ohne schwebende Erklärkarten drumherum
            (das frühere Stripe-artige Callout-Muster wirkte für eine ruhige,
            editoriale Seite zu unruhig) – die vier Karten darunter erklären
            dieselben Punkte bereits in Textform. */}
        <Reveal className="mb-16 md:mb-20">
          <Image
            src="/images/dashboard.png"
            alt="Lobbio Dashboard Übersicht"
            width={1822}
            height={883}
            quality={90}
            className="w-full h-auto rounded-xl border border-stone-200 shadow-sm mx-auto lg:max-w-4xl"
          />
        </Reveal>

        <StaggerGroup className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-10">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <StaggerItem key={title} className="flex items-start gap-4">
              <div className="shrink-0 text-emerald-700 mt-0.5">
                <Icon size={22} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-semibold text-stone-800 mb-1.5">{title}</h3>
                <p className="text-stone-600 leading-relaxed">{text}</p>
              </div>
            </StaggerItem>
          ))}
        </StaggerGroup>
      </div>
    </section>
  );
}
