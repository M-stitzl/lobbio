---
version: 1
slug: "app-buchen"
primary_target: "app/buchen"
related_targets: ["app/api/portal"]
---

# Buchungsportal (/buchen/[slug])

Scope: öffentliches Direkt-Buchungsportal pro Hotel, white-label. Mode: Operate (Gast erledigt eine Buchung).
Audience: Urlaubsgäste (oft 50+, oft Smartphone), kommen von der Hotel-Website. Job: Zeitraum wählen, Zimmer + Rate wählen, Daten angeben, verbindlich buchen (Zahlung vor Ort).
Constraints: Hotelfoto, Akzentfarbe, Name kommen pro Hotel aus der DB; ohne Foto muss die Seite trotzdem vollständig wirken. Keine erfundenen Bewertungen/Siegel. Preise immer inkl. Kurtaxe-Ausweis. Nur Deutsch.
Unresolved: echte Hotelfotos, Online-Zahlung, Verfügbarkeit im Kalender je Tag.

## Direction contract

THESIS: Die Buchung ist eine Ansichtskarte, die der Gast ans Hotel schreibt: vorne das Haus, hinten die Reisedaten. Verweigert wird die austauschbare Booking-Engine mit Foto-Hero und gleichförmigen Zimmerkarten.

OWN-WORLD: Kartenweiß (#fbfaf7) auf kühlem Postgrau (#e9ecea); Hotel-Akzent als Schale (Kopfband, Primäraktion); Poststempel-Tinte Violettblau (#3d3a6e); Briefmarkenrot (#b8432f) nur für Knappheit. Barlow Condensed in Versalien als Ortsname-Lettering, Inter für alles Bedienbare, tabellarische Ziffern. Weißer Fotorand, gezähnte Briefmarke, runder Poststempel, Adresslinien als Haarlinien.

STORY: Der Gast sieht sofort Haus und Ort, wählt Daten, sieht ehrliche Verfügbarkeit und Gesamtpreis, füllt die Rückseite aus und erhält die abgestempelte Karte als Bestätigung.

FIRST VIEWPORT: Schmales Akzentband (Hotelname, Telefon). Darunter Kartenvorderseite: Foto im weißen Rand, ~55vh, Ortsname groß unten links. Suchleiste (Anreise, Abreise, Gäste, Verfügbarkeit prüfen) überlappt die Unterkante. Rechts (≥lg) die Kartenrückseite als Zusammenfassung mit leerer Marke, Stempel und Linien; mobil als Leiste unten.

FORM: Ansichtskarte (Vorder-/Rückseite), Position 6 der eigenen Liste; seed:28a09dd96167bea4. Raises: Crouwel-Raster im Kalender, Transit-Zustandssprache für Verfügbarkeit, Ikeda-Ziffernspalte für Preise, Streaming-Fokus beim gewählten Zimmer. Signatur: Poststempel trägt live die Reisedaten; bei Bestätigung entwertet er die Marke und die Karte dreht sich.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
