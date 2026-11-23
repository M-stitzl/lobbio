import { Reveal } from './motion';
import FounderPhoto from './founder-photo';

export default function AboutSection() {
  return (
    <section id="ueber-uns" className="py-20 md:py-28 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <Reveal>
          <h2 className="font-[family-name:var(--font-serif-display)] text-2xl md:text-3xl font-medium text-stone-800 text-center mb-12">
            Keine generalisierte Standardsoftwarelösung. Ein Ansprechpartner aus der Region.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8 md:gap-10 items-center">
            {/* TODO: Echtes Gründerfoto unter public/images/gruender-foto.jpg ablegen –
                die Komponente zeigt bis dahin automatisch einen Platzhalter. */}
            <FounderPhoto />
            <div>
              <p className="text-stone-700 leading-relaxed mb-4">
                Ich bin im Chiemgau aufgewachsen und entwickle Lobbio gezielt für die Häuser, die diese Region
                ausmachen: kleine, familiengeführte Hotels und Pensionen. Kein anonymes Produkt aus einem fernen
                Büro, sondern eine Lösung, die direkt mit den ersten Häusern vor Ort entsteht, und bei der Sie mich
                erreichen, wenn Sie eine Frage haben.
              </p>
              <p className="font-semibold text-stone-800">Gründer von Lobbio</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
