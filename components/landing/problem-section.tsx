import { Inbox, Star, UserX } from 'lucide-react';
import { Reveal, StaggerGroup, StaggerItem } from './motion';

const PROBLEMS = [
  {
    icon: Inbox,
    title: 'Vier Kanäle, kein Überblick',
    text: 'Anfragen kommen per E-Mail, über Buchungsportale, per WhatsApp und am Telefon. Was wo offen ist, weiß am Ende niemand genau.',
  },
  {
    icon: Star,
    title: 'Bewertungen bleiben liegen',
    text: 'Eine schnelle, freundliche Antwort auf jede Bewertung stärkt Ihren Ruf. Genau dafür fehlt im Alltag aber regelmäßig die Zeit.',
  },
  {
    icon: UserX,
    title: 'Gute Gäste, vergessene Wünsche',
    text: 'Der Stammgast mit dem Bergblick, die Familie mit dem Zustellbett: Dieses Wissen steckt in Köpfen und Notizzetteln, nicht dort, wo Sie es brauchen.',
  },
];

export default function ProblemSection() {
  return (
    <section className="py-20 md:py-28 px-4 md:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <Reveal>
          <h2 className="font-[family-name:var(--font-serif-display)] text-2xl md:text-3xl font-medium text-stone-800 mb-5">
            Ihr Haus läuft. Ihr Posteingang auch, nur leider gegen Sie.
          </h2>
          <p className="text-lg text-stone-600 leading-relaxed max-w-2xl mx-auto mb-14">
            Zwischen Rezeption, Küche und Zimmerservice bleibt kaum Zeit für den Bildschirm. E-Mails stapeln sich,
            Bewertungen warten tagelang auf eine Antwort, und der Wunsch, den ein Gast letztes Jahr geäußert hat, ist
            längst vergessen. Nicht aus Nachlässigkeit, sondern weil ein Familienbetrieb keine eigene
            Rezeptionsabteilung hat.
          </p>
        </Reveal>

        {/* Ruhige, geteilte Liste statt drei gleicher Karten nebeneinander –
            passender zur editorialen, kartenarmen Bildsprache dieser Seite
            (siehe Kommentar in features-section.tsx für dieselbe Überlegung). */}
        <StaggerGroup className="text-left divide-y divide-stone-200 border-t border-b border-stone-200">
          {PROBLEMS.map(({ icon: Icon, title, text }) => (
            <StaggerItem key={title} className="flex items-start gap-5 py-7">
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
