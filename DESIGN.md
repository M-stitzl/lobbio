---
name: Lobbio
description: Deutschsprachiges Hotel-Betriebssystem (Kommunikation, PMS) mit white-label Direkt-Buchungsportal je Hotel.
colors:
  # Scope A: interne App (Dashboard + PMS), Tailwind-Paletten
  app-action: "#047857"
  app-action-deep: "#065f46"
  app-action-focus: "#059669"
  app-action-wash: "#ecfdf5"
  app-ink: "#1e293b"
  app-ink-soft: "#334155"
  app-text-muted: "#64748b"
  app-icon-muted: "#94a3b8"
  app-border: "#e2e8f0"
  app-input-border: "#cbd5e1"
  app-row-divider: "#f1f5f9"
  app-canvas: "#f8fafc"
  app-surface: "#ffffff"
  app-danger: "#b91c1c"
  app-warning-wash: "#fffbeb"
  app-warning-ink: "#92400e"
  app-arrival-blue: "#0284c7"
  # Scope B: Buchungsportal "Die Ansichtskarte"
  portal-accent-default: "#2f5d50"
  portal-on-accent-dark: "#1b1e21"
  portal-on-accent-light: "#ffffff"
  portal-postgrau: "#e9ecea"
  portal-kartenweiss: "#fbfaf7"
  portal-footer-grau: "#e1e5e3"
  portal-control-white: "#ffffff"
  portal-ink: "#22262a"
  portal-ink-body: "#3a4045"
  portal-ink-muted: "#4a5055"
  portal-ink-quiet: "#5a6065"
  portal-icon-grau: "#6b7176"
  portal-hairline: "#dfe3e1"
  portal-address-rule: "#cfd5d2"
  portal-input-border: "#c3c9c6"
  portal-control-border: "#c9cfcc"
  portal-hover-wash: "#f3f5f4"
  portal-info-wash: "#f0f2f1"
  portal-stempeltinte: "#3d3a6e"
  portal-markenrot: "#8e2f1f"
  portal-markenrot-wash: "#f8e3de"
  portal-markenrot-line: "#b8432f"
  portal-frei-wash: "#e6efe9"
  portal-frei-ink: "#24563d"
  portal-hinweis-wash: "#fdf3e3"
  portal-hinweis-ink: "#7a4a12"
typography:
  app-headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
  app-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
  app-body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  app-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
  portal-display:
    fontFamily: "Barlow Condensed, Inter, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "0.01em"
  portal-headline:
    fontFamily: "Barlow Condensed, Inter, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.01em"
  portal-title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.25
  portal-body:
    fontFamily: "Inter, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  portal-label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
  portal-figure:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  portal-photo: "2px"
  portal-card: "3px"
  portal-control: "4px"
  app-chip: "8px"
  app-control: "10px"
  app-panel: "14px"
  full: "9999px"
spacing:
  app-row: "12px 16px"
  app-panel-gap: "16px"
  portal-gutter: "16px"
  portal-card-pad: "16px"
  portal-section-gap: "32px"
components:
  app-button-primary:
    backgroundColor: "{colors.app-action}"
    textColor: "{colors.app-surface}"
    rounded: "{rounded.app-control}"
    padding: "8px 16px"
  app-button-primary-hover:
    backgroundColor: "{colors.app-action-deep}"
  app-button-secondary:
    backgroundColor: "{colors.app-surface}"
    textColor: "{colors.app-ink-soft}"
    rounded: "{rounded.app-control}"
    padding: "8px 16px"
  app-panel:
    backgroundColor: "{colors.app-surface}"
    rounded: "{rounded.app-panel}"
  app-input:
    backgroundColor: "{colors.app-surface}"
    textColor: "{colors.app-ink}"
    rounded: "{rounded.app-control}"
    padding: "8px 12px"
  app-chip-emerald:
    backgroundColor: "{colors.app-action-wash}"
    textColor: "{colors.app-action-deep}"
    rounded: "{rounded.app-chip}"
    padding: "2px 8px"
  app-nav-item-active:
    backgroundColor: "{colors.app-action-wash}"
    textColor: "{colors.app-action}"
    rounded: "{rounded.app-control}"
    padding: "10px 12px"
  portal-button-primary:
    backgroundColor: "{colors.portal-accent-default}"
    textColor: "{colors.portal-on-accent-light}"
    rounded: "{rounded.portal-control}"
    padding: "0 20px"
    height: "48px"
  portal-button-rate:
    backgroundColor: "{colors.portal-kartenweiss}"
    textColor: "{colors.portal-ink}"
    rounded: "{rounded.portal-control}"
    height: "40px"
  portal-button-rate-selected:
    backgroundColor: "{colors.portal-accent-default}"
    textColor: "{colors.portal-on-accent-light}"
    rounded: "{rounded.portal-control}"
    height: "40px"
  portal-input:
    backgroundColor: "{colors.portal-control-white}"
    textColor: "{colors.portal-ink}"
    rounded: "{rounded.portal-control}"
    padding: "0 12px"
    height: "48px"
  portal-room-card:
    backgroundColor: "{colors.portal-kartenweiss}"
    rounded: "{rounded.portal-card}"
    padding: "16px"
  portal-chip-frei:
    backgroundColor: "{colors.portal-frei-wash}"
    textColor: "{colors.portal-frei-ink}"
    rounded: "{rounded.portal-card}"
    padding: "4px 8px"
  portal-chip-knapp:
    backgroundColor: "{colors.portal-markenrot-wash}"
    textColor: "{colors.portal-markenrot}"
    rounded: "{rounded.portal-card}"
    padding: "4px 8px"
  portal-stamp:
    backgroundColor: "{colors.portal-accent-default}"
    textColor: "{colors.portal-on-accent-light}"
    width: "112px"
    height: "136px"
---

# Design System: Lobbio

Dieses System hat **zwei getrennte Geltungsbereiche**. Wer eine neue Oberfläche baut, entscheidet zuerst, in welchem er arbeitet, und mischt sie nicht:

- **Scope A – Interne App** (`/dashboard/**`, PMS-Seiten, Sidebar): das gewachsene Lobbio-Dashboard. Slate-Neutrals, Emerald als Aktionsfarbe, Inter, weiße Panels. Wurde für das PMS **erweitert, nicht neu gestaltet**; hier wird dokumentiert, was gebaut ist. Referenz: `components/pms/ui.tsx`, `app/dashboard/rezeption/page.tsx`, `app/dashboard/zimmerplan/page.tsx`, `component/Sidebar.tsx`, `app/globals.css`.
- **Scope B – Buchungsportal „Die Ansichtskarte“** (`/buchen/[slug]`): öffentlich, white-label pro Hotel. Die Hotelfarbe speist `--accent` / `--on-accent`. Referenz: `app/buchen/[slug]/portal.tsx`, `app/buchen/[slug]/page.tsx`; Richtungsvertrag in `.impeccable/surfaces/app-buchen.md`.

Token-Schlüssel tragen deshalb das Präfix `app-` bzw. `portal-`.

## Overview

**Creative North Star: "Die Ansichtskarte" (Portal) · "Der Rezeptionstresen" (App)**

**Scope A – Der Rezeptionstresen.** Ein ruhiges, dichtes Arbeitswerkzeug für Hoteliers, die zwischen anderen Aufgaben hineinschauen. Hellgraue Fläche (`app-canvas`), darauf weiße Panels mit dünner Slate-Kante und kaum sichtbarem Schatten; jede Seite beginnt mit einem Seitentitel plus Tagesbezug und beantwortet „Was ist heute zu tun?“. Farbe ist Status, nicht Dekoration: Emerald heißt „handeln / im Haus / erledigt“, Sky „erwartet / Abreise“, Amber „offen / zu reinigen“, Rot „Fehler / Stornierung“. Lucide-Linienicons in 16–20 px begleiten Titel und Navigation.

**Scope B – Die Ansichtskarte.** Die Buchung ist eine Karte, die der Gast ans Hotel schreibt: vorne das Haus mit dem Ortsnamen in kräftigen Versalien, hinten die Reisedaten mit Briefmarke, Poststempel und Adresslinien. Kartenweiß liegt auf kühlem Postgrau; die Hotelfarbe ist die einzige laute Fläche (Kopfband, Primäraktion, Kalenderauswahl). Die Postkarten-Requisiten sind **Statusträger**: die Briefmarke zeigt Zimmer und „ab“-Preis, der Stempel trägt live An- und Abreise, bei der Bestätigung entwertet er die Marke und die Karte dreht sich. Ohne Hotelfoto trägt eine geschichtete Bergsilhouette in der Hotelfarbe die Seite.

Beide Welten teilen Inter für alles Bedienbare, tabellarische Ziffern für Preise und Daten, Deutsch in Sie-Form und das Ziel WCAG 2.2 AA mit großen Klickflächen.

**Key Characteristics:**
- Zwei Welten, klar getrennt: App = Slate/Emerald/weiche Panels, Portal = Postgrau/Kartenweiß/Hotelakzent/fast eckig.
- Inter ist die UI-Schrift in beiden Welten; Barlow Condensed nur als Ortsname-Lettering im Portal.
- Farbe codiert Zustand (Belegung, Verfügbarkeit, Knappheit), nie Schmuck.
- Preise und Daten immer `tabular-nums`, Gesamtpreis inkl. Kurtaxe-Ausweis sichtbar.
- Portal: Briefmarke, Poststempel, Adresslinien sind funktionale Bauteile, keine Ornamente.

## Colors

App: kühle Slate-Neutrals mit einem einzigen satten Grün als Handlungsfarbe. Portal: entsättigte Papier- und Postgrautöne, eine pro Hotel austauschbare Akzentfarbe und eine violettblaue Stempeltinte.

### Primary
- **Rezeptionsgrün** (`app-action`): Primärbuttons („Neue Buchung“, „Check-in“, „Abrechnen“), aktiver Navigationspunkt, Zählbadges, Heute-Spalte im Zimmerplan. Hover vertieft auf `app-action-deep`; Fokusring `app-action-focus`. `app-action-deep` ist zugleich die Wortmarke „Lobbio“.
- **Hotelakzent** (`portal-accent-default` als Vorgabe, zur Laufzeit `--accent` aus `hotels.accent_color`): Kopfband, Primäraktion, gewählte Rate, Start/Ende im Kalender, Fokus-Outline, Textmarkierung, Hintergrund von Marke und Foto-Platzhalter. Die Schriftfarbe darauf (`--on-accent`) wird per relativer Luminanz berechnet: über 0,4 `portal-on-accent-dark`, sonst `portal-on-accent-light`. Abgeleitete Töne entstehen nur per `color-mix(in oklab, var(--accent) N%, white)`: 14 % Kalenderbereich, 10 % Hover der Ratenbuttons, 8 % gewählte Ratenzeile.

### Secondary
- **Stempeltinte Violettblau** (`portal-stempeltinte`): Poststempel, „Postkarte“-Schriftzug, Grußzeile der Kartenrückseite, gestrichelter Rahmen der Buchungsnummer. Ausschließlich Postkarten-Requisiten.
- **Ankunftsblau** (`app-arrival-blue`): Zimmerplan-Balken „Erwartet“, Abreisen-Icon; in der App die zweite Statusfarbe neben Emerald.

### Tertiary
- **Markenrot** (`portal-markenrot`, Fläche `portal-markenrot-wash`, Linie `portal-markenrot-line`): Knappheit („Nur noch 2 Zimmer frei“) und Fehler (Feldrand, Fehlermeldung, Pflichtstern). Kein Schmuck, keine Primäraktion.
- **App-Signalfarben** (`app-danger`, `app-warning-wash` / `app-warning-ink`): Fehler- und Warnhinweise, ungereinigte Zimmer, überfällige Abreisen.

### Neutral
- **App-Canvas** (`app-canvas`) unter allem; **Weiß** (`app-surface`) für Panels, Header, Drawer.
- **Slate-Tinte** (`app-ink`) für Titel und Namen, `app-ink-soft` für Buttontext, `app-text-muted` für Beschreibungen und Meta, `app-icon-muted` für inaktive Icons.
- **Slate-Kanten**: `app-border` für Panels und Trenner, `app-input-border` für Eingaben, `app-row-divider` zwischen Listenzeilen.
- **Postgrau** (`portal-postgrau`) als Seitengrund des Portals; **Kartenweiß** (`portal-kartenweiss`) für Kartenvorderseite, Zimmerkarten, Rückseite, Formular; reines Weiß nur für Bedienelemente (Suchleiste, Popover, Eingaben); `portal-footer-grau` für den Fuß.
- **Portal-Tinten** in vier Stufen: `portal-ink` (Überschriften, Werte), `portal-ink-body` (Fließtext), `portal-ink-muted` (Meta, Ausstattung), `portal-ink-quiet` (Labels, Hinweise); `portal-icon-grau` für Feldicons.
- **Portal-Linien**: `portal-hairline` (Kartenkanten), `portal-address-rule` (Adress- und Zusammenfassungslinien), `portal-input-border` / `portal-control-border` (Eingaben, Stepper), `portal-hover-wash` (Hover), `portal-info-wash` (Zahlungs-/Storno-Kasten).
- **Statusflächen Portal**: `portal-frei-wash` / `portal-frei-ink` („Frei“), `portal-hinweis-wash` / `portal-hinweis-ink` („Reisedaten geändert“).

### Named Rules
**The Accent-Is-The-Hotel Rule.** Im Portal gibt es keine Lobbio-Markenfarbe. Jede laute Fläche ist `var(--accent)`, jede Schrift darauf `var(--on-accent)`; Varianten nur per `color-mix` mit Weiß. Lobbio erscheint nur als „Buchungssystem: Lobbio“ im Fuß.

**The Status-Not-Paint Rule.** In beiden Welten bedeutet eine Farbe einen Zustand. Emerald/„Frei“-Grün = verfügbar oder im Haus, Amber = offen, Markenrot = knapp oder fehlerhaft. Wer eine Farbe dekorativ einsetzt, entwertet die Statussprache.

**The Ink-For-Props Rule.** Stempeltinte erscheint nur auf Postkarten-Requisiten (Stempel, Rückseiten-Schriftzug, Buchungsnummer), nie auf Buttons oder Links.

## Typography

**Display Font:** Barlow Condensed 600/700 (nur Portal, via `next/font` als `--font-lettering`, Rückfall Inter)
**Body Font:** Inter (via `next/font` als `--font-inter`; `--font-sans`, `--font-serif` und `--font-heading` zeigen bewusst alle darauf)
**Label/Mono Font:** keine eigene; `--font-mono` ist ein System-Monospace-Stapel, im UI ungenutzt.

**Character:** Inter ist die nüchterne, gut lesbare Arbeitsstimme beider Welten. Im Portal tritt Barlow Condensed in Versalien als Ortsschild-Lettering der Ansichtskarte dazu: schmal, kräftig, eng gesetzt.

### Hierarchy
**Scope A (App):**
- **Headline** (`app-headline`, slate-800, `text-balance`): Seitentitel („Rezeption“, „Zimmerplan“), darunter Datum/Beschreibung in `app-body` muted.
- **Title** (`app-title`): Panel- und Drawer-Titel (Drawer 1.125rem).
- **Body** (`app-body`): Listen, Namen (600), Hinweise, Buttons (500).
- **Label** (`app-label`): Meta-Zeilen, Chips, Feldhinweise; Zimmerplan-Wochentage 10px Versalien.

**Scope B (Portal):**
- **Display** (`portal-display`, Versalien, `text-balance`, leichter Textschatten): Ortsname auf der Kartenvorderseite. Responsiv 3rem → 3.75rem (sm) → 4.5rem (md). Die Bestätigung „Bis bald, …!“ nutzt 2.25rem → 3rem, Zeilenhöhe 1.
- **Headline** (`portal-headline`, Versalien): Abschnittstitel „Unsere Zimmer“, „Ihre Angaben“, „Über unser Haus“. „Postkarte“ 1.5rem mit 0.04em Sperrung in Stempeltinte; Grußzeile 1.125rem/600.
- **Title** (`portal-title`): Zimmername.
- **Body** (`portal-body`): Beschreibungen und Fließtext, max. 52–68ch; Meta und Ausstattung 14px.
- **Figure** (`portal-figure`, `tabular-nums`): Gesamtpreise; Feldwerte der Suchleiste 15px/600; Buchungsnummer 1.875rem/700 mit 0.12em Sperrung.
- **Label** (`portal-label`): Feldlabels der Suchleiste, „/ Nacht“-Zeilen, MwSt.-Ausweis, Hinweise.
- **Marke**: Barlow Condensed 700 Versalien 13px (klein 9.5px), Zeilenhöhe 0.95, max. 3 Zeilen, Silbentrennung an.

### Named Rules
**The Inter-Stays Rule (bestätigte Ausnahme).** Inter bleibt die UI-Schrift beider Welten; das ist eine Projektvorgabe (`app/layout.tsx`, `globals.css`). Der Detektor meldet Inter als generische Wahl; der Befund ist geprüft und **akzeptiert**, nicht zu „beheben“. Eigenständigkeit im Portal kommt allein aus dem Barlow-Lettering.

**The Lettering-Only Rule.** Barlow Condensed nur in Versalien und nur für Ortsname, Abschnittstitel, Marke und Postkarten-Schriftzüge. Nie für Bedienelemente, Formularfelder, Preise oder Fließtext.

**The Tabular Figures Rule.** Jede Zahl, die verglichen wird (Preis, Datum, Zimmernummer, Belegung, Zähler), steht in `tabular-nums`.

## Layout

**Scope A.** Fester weißer Kopf (73px) mit Menüknopf, Wortmarke und Hotelname rechts (ab sm); die Navigation ist ein Off-Canvas-Panel (256px) mit Gruppenüberschriften. Seiten sind eine vertikale Spalte mit 16px Abstand (`app-panel-gap`): Seitentitel mit Aktionen rechts → Ein-Satz-Zusammenfassung des Tages → Panels. Rezeption: zwei Panels nebeneinander ab lg, darunter volle Breite. Zimmerplan: horizontales Raster mit 120px fixer Zimmerspalte (sticky links) und 48px pro Tag über 21 Tage, waagrecht scrollbar, Kopfzeile sticky. Listenzeilen: 12px/16px Innenabstand, Trenner `app-row-divider`. Details öffnen als Drawer von rechts (max. 576px), nicht als Modal.

**Scope B.** Zentrierte Spalte max. 1152px (`max-w-6xl`) mit 16px Rand. Reihenfolge: Akzent-Kopfband (48px) → Kartenvorderseite (Foto 42vh, min. 260px, max. 520px, in 8/12px Kartenweiß-Rand) → Suchleiste, die die Unterkante um 40px **überlappt** und seitlich 8/32px eingerückt ist (ab md vier Spalten 1fr 1fr 1.1fr auto, darunter gestapelt) → Ergebnisraster mit 32px Abstand: ab lg `1fr | 360px`, rechts die Kartenrückseite **sticky** (top 24px). Unter lg entfällt die Rückseite; stattdessen erscheint nach Zimmerwahl eine fixierte Leiste am unteren Rand (Auswahl, Gesamtpreis, „Weiter zu Ihren Daten“), die Seite reserviert dafür 112px unten. Zimmerkarte: 16px Innenabstand, Marke 112px + Text (ab sm zweispaltig), Ratenzeilen ab sm dreispaltig (Text | Preis | 112px Button), mobil Button volle Breite (44px hoch). Kalender: zwei Monate ab md, sonst einer; strenges 7-Spalten-Raster 294px, Zellen 42px hoch. Formular zweispaltig ab sm, PLZ/Ort 110px + Rest.

## Elevation & Depth

**Scope A** ist nahezu flach: Panels, Primärbuttons, Header und Zimmerplan-Balken tragen `shadow-sm`; Tiefe entsteht über weiße Flächen auf `app-canvas` und Slate-Kanten. Nur überlagernde Ebenen heben sich deutlich ab (Drawer und Sidebar `shadow-2xl` über Slate-Abdunklung 30–40 %, Sidebar mit Blur; Menü-Popover `shadow-lg`).

**Scope B** ist ein Stapel Papier: weiche, nach unten verschobene Schatten mit negativem Spread lassen Karten auf dem Postgrau liegen. Ausgewählte Elemente heben sich stärker an (größerer Schatten plus 2px nach oben).

### Shadow Vocabulary
- **Kartenauflage** (`0 10px 30px -12px rgba(30,40,40,0.35)`): Kartenvorderseite; Rückseite mit `-14px` Spread.
- **Suchleiste** (`0 12px 28px -14px rgba(20,30,30,0.45)`): die überlappende Bedienleiste.
- **Gewählte Zimmerkarte** (`0 18px 40px -18px rgba(20,30,30,0.55)`, plus `translateY(-2px)` und 1px Akzentring).
- **Bestätigungskarte** (`0 12px 32px -16px rgba(20,30,30,0.5)`).
- **Mobile Leiste** (`0 -8px 24px -12px rgba(0,0,0,0.25)`): nach oben.
- **Zähnung der Marke** (`filter: drop-shadow(0 1px 1.5px rgba(0,0,0,0.18))`).
- **Popover** (Kalender, Gäste): Tailwind `shadow-xl`.

### Named Rules
**The Paper-On-Grey Rule.** Im Portal liegt jedes Kartenelement in Kartenweiß auf Postgrau und trägt einen weichen, nach unten verschobenen Schatten mit negativem Spread. Keine harten Versatzschatten, keine Glows.

**The Lift-Means-Chosen Rule.** Im Portal hebt sich eine Zimmerkarte nur, wenn sie gewählt ist; die übrigen werden auf 75 % Deckkraft und 35 % Sättigung zurückgenommen und kehren bei Hover/Fokus zurück.

## Shapes

**Scope A** ist weich gerundet über die shadcn-Basis `--radius: 0.625rem`: Panels `app-panel` (rounded-xl = 14px), Buttons, Eingaben, Hinweise und Navigationspunkte `app-control` (rounded-lg = 10px), Chips, Zimmernummern-Kästchen und Belegungsbalken `app-chip` (rounded-md = 8px), Avatare und Zählbadges rund. Unzugewiesene Zimmer und Buchungen ohne Zimmer erscheinen mit **gestrichelter** Kante; gesperrte Zimmer mit diagonaler Schraffur.

**Scope B** ist fast eckig wie Papier: Foto 2px, Karten, Chips und Feldknöpfe 3px, Buttons, Eingaben und Popover 4px; nur Stepper- und Monatspfeil-Knöpfe sind rund. Die Briefmarke hat eine **gezähnte Kante** (radiale Lochung im 7px-Rand, Raster 10px), der Poststempel ist ein doppelter Kreis (r 50/34) mit Umschrift auf Bogenpfaden und vier Entwertungswellen. Leere Zustände und „nicht verfügbar“ nutzen gestrichelte 1px-Kanten, die Buchungsnummer einen gestrichelten 2px-Rahmen in Stempeltinte. Adresslinien sind 1px-Haarlinien. Kalendertage sind **eckige** gleich große Zellen, keine Pillen.

## Components

### Buttons
- **App – Shape:** sanft gerundet (10px). Größen md (8px/16px, 14px) und sm (6px/10px, 12px), Schrift 500, Icon-Lücke 6px, Ladezustand mit drehendem Loader.
- **App – Primary:** Rezeptionsgrün mit weißer Schrift und `shadow-sm`; Hover `app-action-deep`.
- **App – Secondary / Ghost / Danger:** Weiß mit Slate-Kante (Hover slate-50); Ghost nur Text mit slate-100-Hover; Danger weiß mit roter Schrift und roter Kante.
- **App – Fokus:** 2px Outline in `app-action-focus`, 2px Abstand. Deaktiviert 50 % Deckkraft.
- **Portal – Primary:** Hotelakzent, 48px hoch, 20px seitlich, 15px/600, 4px Radius; Hover `brightness(1.1)`, Active 1px nach unten; in der Suchleiste ab md mindestens 56px hoch.
- **Portal – Ratenbutton:** Kartenweiß mit 1px Akzentkante, Hover 10 %-Akzentwäsche; gewählt vollflächig Akzent mit Häkchen und „Gewählt“ (`aria-pressed`).
- **Portal – Sekundär:** „Fertig“ im Gäste-Popover: 40px, 1px `portal-control-border`. Rückwege („Zurück zur Zimmerauswahl“) sind unterstrichene Textlinks mit Pfeil.

### Chips
- **App:** 8px Radius, 12px/500, getönte Fläche mit 1px Innenring derselben Farbfamilie (emerald, amber, red, sky, violet; slate ohne Ring).
- **Portal (Verfügbarkeit):** 3px Radius, 12px/600: „Frei“ in Frei-Grün, „Nur noch N Zimmer frei“ in Markenrot-Wäsche, sonst neutral. Nicht buchbare Zimmer erscheinen nicht als Karte, sondern als Liste in einem gestrichelten Kasten „Für Ihre Reise nicht verfügbar“.

### Cards / Containers
- **App-Panel:** weiß, 14px Radius, 1px `app-border`, `shadow-sm`; optionaler Kopf (12px/16px) mit Titel links, Zähler oder Aktion rechts, Trenner `app-row-divider`.
- **Portal-Zimmerkarte:** Kartenweiß, 3px Radius, 1px `portal-hairline`, 16px Innenabstand; Ratenzeilen unter einer Haarlinie, Übergänge 200ms auf Deckkraft, Filter, Schatten, Kante, Transform.
- **Portal-Kartenrückseite (Zusammenfassung):** Kartenweiß, 20px Innenabstand, Kartenauflage-Schatten; Kopf „Postkarte“ + kleine Marke + Stempel, Definitionsliste mit 92px Labelspalte und Adresslinien, Preistabelle mit 1px Tinten-Linie über „Gesamt“, MwSt.-Ausweis getrennt (7 % / 19 %), unten Schreibhälfte (Grußzeile) und Adresshälfte („An“ + Hoteladresse auf Linien). Offene Werte kursiv „noch offen“.

### Inputs / Fields
- **App:** weiß, 1px `app-input-border`, 10px Radius, 8px/12px, 14px. Fokus: Kante `app-action-focus` plus 2px Ring 30 %. Deaktiviert slate-50. Label 14px/500 darüber, Hinweis 12px muted, Fehler 12px `app-danger`.
- **Portal:** weiß, 48px hoch, 1px `portal-input-border`, 4px Radius, 15px. Fokus: Akzentkante plus 2px Akzentring 30 %. Fehler: Kante `portal-markenrot-line`, Text darunter in Markenrot. Pflichtfelder mit rotem Stern; Fehlermeldungen erst nach dem ersten Absenden. Checkbox 20px in Akzentfarbe.
- **Portal-Feldknopf (Suchleiste):** min. 56px hoch, 3px Radius, Icon + Label (12px) + Wert (15px/600); offen: Akzentkante auf `#f6f8f7`.

### Navigation
- **App:** fester weißer Kopf mit Wortmarke „Lobbio“ (20px/700, `app-action-deep`). Off-Canvas-Sidebar 256px, Gruppenüberschriften 11px/600 Versalien slate-500. Punkte 10px/12px, Icon 20px: inaktiv slate-600 mit slate-400-Icon, Hover slate-50, aktiv Emerald-Wäsche mit Emerald-Schrift und -Icon. Zähler als runde Emerald-Badges. Unten Profilknopf mit Initial-Avatar und Menü (Website, Abmelden in Rot).
- **Portal:** nur das Akzent-Kopfband (48px): Hotelname links, Telefon (mobil „Anrufen“) und Website rechts, unterstrichen bei Hover. Keine weitere Navigation; der Ablauf Suche → Daten → Bestätigung ist ein Schrittwechsel im selben Raster mit sanftem Scrollen.

### Briefmarke (Signatur, Portal)
Gezähnte Marke 112×136px (klein 76×92px), Motiv in Hotelakzent: Zimmerfoto oder eine von fünf Bergketten-Serien (je Zimmer andere Kette und Himmelsdichte). Zimmername unten links im Lettering, „ab N €“ oben rechts. Dekorativ (`aria-hidden`); die Informationen stehen zusätzlich im Text.

### Poststempel (Signatur, Portal)
SVG 150×82px, um −12° gedreht, in Stempeltinte: Ort als obere Umschrift, „DIREKT GEBUCHT“ unten, An- und Abreise (TT.MM.) in der Mitte, Platzhalter „— . —“. Liegt halb über der kleinen Marke. Die Entwertungswellen stehen bei 25 % Deckkraft und werden bei Bestätigung auf 85 % gesetzt.

### Bewegung (Portal)
- **Stempelschlag** `postmark-in`: 420ms `cubic-bezier(0.16, 1, 0.3, 1)`, von −24° / 125 % / unsichtbar auf −12° / 100 %.
- **Kartendrehung** `card-flip`: 560ms gleiche Kurve, `perspective(1400px) rotateY(-90deg → 0)`, Drehpunkt links; nur auf der Bestätigung.
- Bei `prefers-reduced-motion: reduce` entfallen beide. App: Drawer gleitet in 200ms von rechts, Sidebar 300ms ease-in-out.

### Kalender (Portal)
Strenges 7-Spalten-Raster (Mo zuerst), eckige Zellen 42px. Start/Ende vollflächig Akzent, Bereich 14 %-Akzentwäsche, Hover 1px Akzent-Outline nach innen, Vergangenes ausgegraut und gesperrt. Statuszeile „Anreisetag wählen“ / „Abreisetag wählen“ zwischen den Monatspfeilen.

### Zimmerplan (App)
Belegungsbalken 8px Radius mit `shadow-sm`, Farbe nach Aufenthaltsstatus: Sky „Erwartet“, Emerald „Im Haus“, Amber-400 „Ausstehend“, Slate-400 „Abgereist“. Balken beginnen und enden in Tagesmitte. Housekeeping als 8px-Punkt vor der Zimmernummer. Heute-Spalte Emerald-Wäsche, Wochenende slate-50, Belegungszeile ab 60 % Amber, ab 90 % Rot. Legende unter dem Plan.

## Do's and Don'ts

### Do:
- **Do** zuerst den Scope wählen: interne Seiten bauen mit `components/pms/ui.tsx` (PageHeader, Panel, Button, Field, Chip, Notice, Drawer), das Portal mit seinen eigenen Bausteinen.
- **Do** im Portal jede laute Fläche aus `var(--accent)` / `var(--on-accent)` ableiten und Töne nur per `color-mix(in oklab, var(--accent) N%, white)` bilden.
- **Do** Preise immer als Gesamtpreis inkl. Kurtaxe mit `tabular-nums` zeigen, pro Nacht darunter, MwSt. 7 % / 19 % getrennt.
- **Do** Briefmarke und Poststempel als Statusträger einsetzen (Zimmer, Preis, Reisedaten, Bestätigung), nie als reine Dekoration.
- **Do** Klickflächen von mindestens 40px (Portal-Hauptaktionen 48px) und sichtbare Fokus-Outlines (App Emerald, Portal Akzent, je 2px mit 2px Abstand) beibehalten.
- **Do** Bewegung bei `prefers-reduced-motion` abschalten.
- **Do** ohne Hotelfoto die Bergsilhouette in der Akzentfarbe zeigen; die Seite muss ohne Foto vollständig wirken.

### Don't:
- **Don't** die Welten mischen: kein Emerald, keine 10–14px-Radien und keine Slate-Panels im Portal; keine Postkarten-Requisiten, kein Barlow und kein Postgrau in der App.
- **Don't** Barlow Condensed für Bedienelemente, Preise, Formulare oder gemischte Groß-/Kleinschreibung verwenden.
- **Don't** Inter als Detektor-Befund „korrigieren“; die Schrift ist bestätigte Projektvorgabe.
- **Don't** Lobbio-Branding im Portal über die Fußzeile „Buchungssystem: Lobbio“ hinaus zeigen.
- **Don't** Markenrot oder Amber dekorativ einsetzen; sie bedeuten Knappheit, Fehler oder Offenes.
- **Don't** im Portal harte Versatzschatten, Glows oder runde Pillen für Kalendertage verwenden.
- **Don't** Bewertungen, Siegel oder Hotelfotos erfinden; Platzhalter bleiben als solche erkennbar.

## Bildnachweise (Demo-Betrieb)

Die Fotos des Vorführhotels werden nicht im Repo ausgeliefert, sondern per URL aus der Datenbank geladen (gesetzt durch `supabase/demo/pms_demo.sql`). Alle stammen von Unsplash und stehen unter der [Unsplash-Lizenz](https://unsplash.com/license) (frei nutzbar, auch kommerziell; Nennung freiwillig).

| Verwendung | Fotograf/in | Quelle | Bild-URL (Basis) |
|---|---|---|---|
| Titelbild (Kampenwand, Aschau i. Chiemgau) | Daniel Seßler | https://unsplash.com/photos/G2Df3hE0O4I | images.unsplash.com/photo-1679218499012-d77004d35a09 |
| Einzelzimmer | Caroline Badran | https://unsplash.com/photos/ePpt1W2cTjs | images.unsplash.com/photo-1752407828561-2450ced77979 |
| Doppelzimmer | Clay Banks | https://unsplash.com/photos/yOs9Zc5JvTw | images.unsplash.com/photo-1788217023349-ad7763845844 |
| Doppelzimmer Bergblick | siehe Quellseite | https://unsplash.com/photos/r25XI14I-Gc | images.unsplash.com/photo-1732538329287-16c7ed7e3a2a |
| Familienzimmer | Caroline Badran | https://unsplash.com/photos/aH_EykwSvFk | images.unsplash.com/photo-1752407828784-67a92663c866 |
| Suite Kampenwand | Clay Banks | https://unsplash.com/photos/4iTQFfuiFzc | images.unsplash.com/photo-1770736158887-9a0f3702416e |

Die Motive zeigen nicht das (fiktive) Demo-Hotel; echte Betriebe hinterlegen eigene Fotos unter Einstellungen bzw. Raten & Zimmer. Ohne Foto fällt das Portal auf die gezeichnete Berglinie bzw. die Briefmarken-Motive zurück.
