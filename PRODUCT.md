# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: Hotelchef/-chefin bzw. Inhaberfamilie** familiengeführter Hotels und Pensionen im Chiemgau/Oberbayern (10–40 Zimmer), ohne IT-Team und oft ohne durchgehend besetzte Rezeption. Arbeitet zwischen anderen Aufgaben, häufig abends, am Desktop im Büro oder an der Rezeption, unterwegs auf Tablet/Handy.
- **Mitarbeitende an Rezeption und im Housekeeping**: brauchen „Was ist heute zu tun?“ – Anreisen, Abreisen, Zimmerstatus.
- **Gäste** (Buchungsportal): buchen direkt beim Hotel, meist über einen Link/Button auf der Website des Hotels, häufig am Smartphone.

## Product Purpose

Lobbio bündelt die Gästekommunikation (E-Mail, Bewertungen, später WhatsApp/Telefon) in einer deutschsprachigen Oberfläche mit KI-Antwortentwürfen und Mustererkennung. Ab der PMS-Ausbaustufe kommt ein **optionales, eingebautes PMS** hinzu (Zimmerplan, Rezeption, Raten, Folio/Rechnung, Housekeeping) sowie ein **Direkt-Buchungsportal** pro Hotel.

Erfolg: Hotelier spart täglich spürbar Zeit, Direktbuchungen ohne OTA-Provision entstehen, und kein Vorgang (Anreise, Rechnung, Meldeschein) fällt durchs Raster.

## Positioning

Deutschsprachig, regional verankert, persönlicher Vertrieb. Kommunikation + KI bleibt der Kern; das PMS ist ein **optionales Modul** für Betriebe ohne oder mit veraltetem PMS – kein Zwang zum Systemwechsel (Abgrenzung zu eviivo & Co.). Weil Kommunikation und PMS dieselben Daten teilen, kennt die KI Verfügbarkeit, Buchungen und Gästehistorie beim Antworten.

## Operating Context

- Gäste-E-Mails per Gmail-Anbindung, Google-Bewertungen, Wissensdatenbank des Hotels, Aufgaben mit Follow-ups.
- KI schlägt vor, der Mensch gibt frei – nie automatischer Versand ohne Freigabe.
- Tagesrhythmus: morgens Abreisen/Housekeeping, nachmittags Anreisen/Check-in, abends Kommunikation und Nachbuchungen.
- Buchungsportal wird aus der bestehenden Hotel-Website verlinkt/eingebettet.

## Capabilities and Constraints

- Stack: Next.js 16 (App Router, Abweichungen zur bekannten API beachten – siehe AGENTS.md), TypeScript, Tailwind v4, shadcn/ui, Supabase (Postgres, Auth, RLS, Realtime), Claude API, Vercel.
- Gesamte PMS-Oberfläche auf Deutsch. Buchungsportal zunächst nur Deutsch.
- Buchungsportal: verbindliche Buchung mit Live-Verfügbarkeit und Preis; **Zahlung vor Ort** (Online-Zahlung/Stripe ist bewusst später).
- Pflichten Deutschland/Bayern: digitaler **Meldeschein** (BMG §§29–30) beim Check-in, **Kurtaxe/Gästebeitrag** pro Person und Nacht, je Hotel/Gemeinde konfigurierbar; **MwSt. getrennt**: Übernachtung 7 %, Frühstück/Extras 19 %.
- Datenbankänderungen nur als Migrationsdateien; Einspielen in die Live-DB erfolgt manuell durch den Gründer.
- Mandantenfähig über `hotel_id` + RLS; aktuell ein Beispielbetrieb in den Daten.
- Offen: Online-Zahlung, Channel-Manager/OTA-Anbindung, englisches Portal, TSE/Kasse.

## Brand Commitments

- Produktname: **Lobbio** (früherer Arbeitstitel im Business Plan: Hotel Command Center).
- Buchungsportal tritt im **Look des jeweiligen Hotels** auf (Name, Fotos, Akzentfarbe pro Hotel); Lobbio nur dezent im Footer („Buchungssystem: Lobbio“).
- Ton: freundlich, klar, unaufgeregt, Sie-Form gegenüber Gästen; im PMS knappe Fachbegriffe der Hotellerie (Anreise, Abreise, Folio, Meldeschein).

## Evidence on Hand

- Beispielbetrieb in den Seed-Daten (Zimmertypen u. a. „Doppelzimmer Bergblick“, „Suite Kampenwand“), Beispielgäste und -buchungen.
- Screenshots: `public/images/dashboard*.png`.
- Keine echten Kundentestimonials, keine echten Hotelfotos, keine echten Preise – nicht erfinden; Platzhalter klar als solche kennzeichnen.

## Product Principles

1. Heute zuerst: Jede Ansicht beantwortet, was jetzt zu tun ist.
2. KI schlägt vor, Mensch entscheidet.
3. Optional statt Zwang: PMS-Module müssen auch einzeln Sinn ergeben.
4. Rechtssicher by default: Meldeschein, Kurtaxe und MwSt. sind eingebaut, nicht nachgerüstet.
5. Direktbuchung so einfach wie bei einer OTA – ohne Provision.

## Accessibility & Inclusion

Zielgruppe teils älter und nicht technikaffin: gut lesbare Schriftgrößen, hohe Kontraste (WCAG 2.2 AA), große Klickflächen an Rezeption/Tablet, Gästeportal voll mobil- und tastaturbedienbar.
