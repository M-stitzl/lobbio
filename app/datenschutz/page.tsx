import LandingHeader from '@/components/landing/header';
import LandingFooter from '@/components/landing/footer';

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <LandingHeader />
      <main className="flex-1 max-w-3xl mx-auto px-4 md:px-6 py-16 w-full">
        <h1 className="text-2xl font-bold text-slate-800 mb-8">Datenschutzerklärung</h1>

        <div className="space-y-8 text-sm text-slate-600 leading-relaxed">
          <section>
            <h2 className="font-semibold text-slate-800 mb-2">1. Verantwortlicher</h2>
            {/* TODO: Verantwortliche Stelle gemäß Art. 4 Nr. 7 DSGVO ergänzen (Name, Anschrift, Kontakt) */}
            <p>
              [TODO: Name / Firma]
              <br />
              [TODO: Anschrift]
              <br />
              [TODO: E-Mail, Telefon]
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">2. Datenerfassung auf dieser Website</h2>
            {/* TODO: Hosting-Anbieter, Server-Log-Files und deren Speicherdauer beschreiben */}
            <p>
              [TODO: Beschreibung, welche Daten beim Besuch der Website automatisch erfasst werden (z.B.
              Server-Logfiles über den Hosting-Anbieter), Zweck und Rechtsgrundlage gemäß Art. 6 DSGVO.]
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">3. Kontaktformular</h2>
            <p>
              Wenn Sie uns über das Kontaktformular Anfragen zukommen lassen, werden Ihre Angaben aus dem
              Anfrageformular inklusive der von Ihnen dort angegebenen Kontaktdaten zwecks Bearbeitung der Anfrage
              und für den Fall von Anschlussfragen bei uns gespeichert.
            </p>
            {/* TODO: Rechtsgrundlage (i.d.R. Art. 6 Abs. 1 lit. b DSGVO), Speicherdauer und eingesetzten
                Dienstleister (Supabase, Hosting-Standort) ergänzen */}
            <p className="mt-2">
              [TODO: Rechtsgrundlage, Speicherdauer und Angaben zum eingesetzten Datenbank-Dienstleister ergänzen.]
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">4. Hosting</h2>
            {/* TODO: Hosting-Anbieter und Standort der Datenverarbeitung (z.B. Vercel, Supabase-Region) ergänzen */}
            <p>[TODO: Name und Anschrift des Hosting-Anbieters, Standort der Server, Auftragsverarbeitungsvertrag.]</p>
          </section>

          <section>
            <h2 className="font-semibold text-slate-800 mb-2">5. Ihre Rechte</h2>
            <p>
              Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Ihre gespeicherten personenbezogenen
              Daten sowie ein Recht auf Berichtigung, Sperrung oder Löschung dieser Daten gemäß den gesetzlichen
              Bestimmungen der DSGVO.
            </p>
            {/* TODO: Kontaktmöglichkeit zur Ausübung dieser Rechte sowie Hinweis auf Beschwerderecht bei einer
                Aufsichtsbehörde ergänzen */}
            <p className="mt-2">[TODO: Kontaktmöglichkeit und zuständige Aufsichtsbehörde ergänzen.]</p>
          </section>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
