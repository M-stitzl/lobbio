# Live-Datenbank auf den PMS-Stand bringen

Reihenfolge einhalten: **erst Datenbank, dann Code deployen.** Der neue Code erwartet die Tabellen und Spalten aus der PMS-Migration.

## 1. Projekt aufwecken (falls pausiert)

Supabase pausiert Free-Tier-Projekte nach einer Woche ohne Aktivität. Im Dashboard (supabase.com → Projekt „Hotel-KI-Dashboard“) ggf. auf **Restore** klicken und warten, bis es grün ist.

## 2. Vorschau: was würde eingespielt?

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Erwartet wird genau **eine** neue Migration: `20261116120000_pms_core.sql`.
Zeigt die Liste mehr ausstehende Migrationen, erst klären (die Live-DB wurde früher teils manuell geändert).

## 3. Migration einspielen

```bash
npx supabase db push --linked
```

Die CLI fragt nach dem Datenbank-Passwort (Supabase-Dashboard → Project Settings → Database).
Die Migration ist rein additiv (neue Tabellen/Spalten, keine Löschungen); die Datumsprüfung auf `bookings` ist `NOT VALID` und blockiert keine Altdaten.

## 4. Demo-Hotel befüllen (nur für den Vorführbetrieb)

Inhalt von `supabase/demo/pms_demo.sql` im Supabase-SQL-Editor ausführen.
Das Skript ändert **nur** das darin eingetragene Demo-Hotel (`f6d38b99-…`), markiert es als Demo und ist mehrfach ausführbar.
**Nie** für einen echten Kundenbetrieb verwenden.

## 5. Prüfen

- `/buchen/alpenblick` zeigt das Portal mit Vorführ-Banner.
- Im Dashboard: Rezeption, Zimmerplan, Housekeeping, Raten & Zimmer laden ohne Fehler.
- Einstellungen → „Hotel & Rechnung“: für echte Betriebe Steuernummer, Adresse und Kurtaxe-Satz der Gemeinde eintragen.
