import LandingHeader from '@/components/landing/header';
import LandingFooter from '@/components/landing/footer';

export default function ImpressumPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 md:px-6 py-16 w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Impressum</h1>

        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="font-semibold text-slate-800 mb-2">Angaben gemäß § 5 TMG / DDG</h2>
            {/* TODO: Name, Anschrift und Rechtsform gemäß §5 TMG/DDG ergänzen */}
            <p>
              [TODO: Name / Firma]
              <br />
              [TODO: Straße, Hausnummer]
              <br />
              [TODO: PLZ, Ort]
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">Kontakt</h2>
            {/* TODO: Telefonnummer und E-Mail-Adresse ergänzen */}
            <p>
              Telefon: [TODO]
              <br />
              E-Mail: [TODO]
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">Umsatzsteuer-ID</h2>
            {/* TODO: Falls vorhanden, Umsatzsteuer-Identifikationsnummer gemäß §27a UStG ergänzen */}
            <p>[TODO: USt-IdNr. oder Hinweis, dass keine vorhanden ist]</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
            {/* TODO: Name und Anschrift der inhaltlich verantwortlichen Person ergänzen */}
            <p>[TODO: Name, Anschrift wie oben]</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">Streitschlichtung</h2>
            {/* TODO: Prüfen, ob Verweis auf OS-Plattform der EU-Kommission verpflichtend ist */}
            <p>
              [TODO: Hinweis zur EU-Streitschlichtungsplattform (ec.europa.eu/consumers/odr) ergänzen, falls
              anwendbar. Wir sind nicht bereit/verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen – bitte prüfen und anpassen.]
            </p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
