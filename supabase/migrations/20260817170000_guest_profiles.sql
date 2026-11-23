-- Gäste-Seite: von der Kontaktliste zum daten-getriebenen Gästeprofil.

-- 1. Strukturierte Präferenzen/Zusatzkäufe (vip_notes bleibt als Freitext erhalten,
--    wird in der Detailansicht zusätzlich als "Weitere Notizen" angezeigt).
ALTER TABLE guests
  ADD COLUMN preferences TEXT[],
  ADD COLUMN purchase_history TEXT[];

-- 2. KI-Empfehlungen künftig optional einem Gast zuordenbar (bisher nur hotelweit).
--    Kein neuer Enum-Wert nötig – type='upsell'/'guest_context' wird weiterverwendet.
ALTER TABLE ai_recommendations
  ADD COLUMN guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;

-- 3. Bestehende Seed-/Live-Gäste um Präferenzen/Zusatzkäufe ergänzen – abgeleitet
--    aus den vorhandenen vip_notes, keine reinen Platzhalter. Per E-Mail statt ID
--    aktualisiert, damit sowohl die ursprünglichen als auch die (durch frühere,
--    nicht per Migration erfassten Inserts entstandenen) doppelten Gästezeilen
--    mit derselben E-Mail konsistent denselben Stand erhalten.
UPDATE guests SET preferences = ARRAY['Bergblick', 'Ruhige Lage'], purchase_history = ARRAY['Late Checkout', 'Weinverkostung']
  WHERE email = 'thomas.m@example.com';
UPDATE guests SET preferences = ARRAY['Romantisches Ambiente', 'Sekt aufs Zimmer'], purchase_history = ARRAY['Sektempfang', 'Romantik-Paket']
  WHERE email = 'j.wagner@example.com';
UPDATE guests SET preferences = ARRAY['Familienzimmer', 'Zustellbett'], purchase_history = ARRAY['Zustellbett-Miete']
  WHERE email = 'schmidt.family@example.com';
UPDATE guests SET preferences = ARRAY['Vegane Küche', 'Outdoor-Kochen']
  WHERE email = 'f.bauer@example.com';
UPDATE guests SET preferences = ARRAY['E-Bike Touren', 'Aktivurlaub'], purchase_history = ARRAY['E-Bike Verleih']
  WHERE email = 'anna.w@example.com';
UPDATE guests SET preferences = ARRAY['Regionale Biere'], purchase_history = ARRAY['Bierverkostung']
  WHERE email = 'lars.s@example.se';
UPDATE guests SET preferences = ARRAY['Später Checkout']
  WHERE email = 'm.huber@example.com';
UPDATE guests SET preferences = ARRAY['Glutenfreies Frühstück']
  WHERE email = 's.klein@example.com';

-- 4. Bestehende, thematisch passende KI-Empfehlungen einem Gast zuordnen +
--    2 weitere Beispiel-Insights mit Gästebezug ergänzen (insgesamt 4).
--    Explizite IDs (statt E-Mail-Subquery) für die beiden Gäste mit Dopplung,
--    damit konsistent dieselbe Zeile referenziert wird wie bei den Buchungen oben.
UPDATE ai_recommendations SET guest_id = 'e0d19457-d61a-47b0-a9ba-38e518782c98'
  WHERE title = 'Upsell Potenzial: Herr Müller';
UPDATE ai_recommendations SET guest_id = '22222222-2222-2222-2222-222222222222'
  WHERE title = 'Jubiläum: Julia Wagner';

INSERT INTO ai_recommendations (id, hotel_id, guest_id, type, title, description, priority, dismissed, created_at)
SELECT gen_random_uuid(), g.hotel_id, g.id, 'upsell', 'Wellness-Upsell: Herr Müller',
       'Hohe Wahrscheinlichkeit für erneutes Wellness-Upselling.', 'medium', false, now()
FROM guests g WHERE g.id = 'e0d19457-d61a-47b0-a9ba-38e518782c98';

INSERT INTO ai_recommendations (id, hotel_id, guest_id, type, title, description, priority, dismissed, created_at)
SELECT gen_random_uuid(), g.hotel_id, g.id, 'guest_context', 'Ernährung beachten: Sarah Klein',
       'Gast ist Gluten-Allergikerin. Bei Frühstücksplanung und Zusatzangeboten aktiv glutenfreie Optionen erwähnen.', 'medium', false, now()
FROM guests g WHERE g.email = 's.klein@example.com' LIMIT 1;

-- 5. Ein paar abgeschlossene (vergangene) Buchungen ergänzen, damit "Anzahl
--    Aufenthalte"/"Ø Aufenthaltsdauer"/"Letzter Aufenthalt" in der Detailansicht
--    nicht für praktisch jeden Gast leer bleiben (aktuelle Buchungen liegen fast
--    alle in der Zukunft/heute, "abgeschlossen" gäbe sonst kaum Datenbasis her).
-- Explizit auf die eine Thomas-Müller-Zeile mit der bereits existierenden aktuellen
-- Buchung eingeschränkt (per E-Mail matcht 2 Zeilen wegen einer historischen
-- Dopplung – ein CROSS JOIN darüber hätte hier versehentlich 8 statt 4 Buchungen
-- erzeugt).
INSERT INTO bookings (id, hotel_id, guest_id, check_in, check_out, room_type, status)
SELECT gen_random_uuid(), g.hotel_id, g.id, d.check_in, d.check_out, d.room_type, 'confirmed'
FROM guests g
JOIN (VALUES
  ('2025-08-10'::date, '2025-08-13'::date, 'Doppelzimmer Bergblick'),
  ('2025-12-27'::date, '2025-12-30'::date, 'Doppelzimmer Bergblick'),
  ('2026-03-14'::date, '2026-03-18'::date, 'Suite Kampenwand'),
  ('2026-07-10'::date, '2026-07-13'::date, 'Doppelzimmer Bergblick')
) AS d(check_in, check_out, room_type) ON true
WHERE g.id = 'e0d19457-d61a-47b0-a9ba-38e518782c98';

INSERT INTO bookings (id, hotel_id, guest_id, check_in, check_out, room_type, status)
SELECT gen_random_uuid(), g.hotel_id, g.id, d.check_in, d.check_out, 'Doppelzimmer', 'confirmed'
FROM guests g
JOIN (VALUES
  ('2025-09-05'::date, '2025-09-08'::date),
  ('2026-05-01'::date, '2026-05-03'::date)
) AS d(check_in, check_out) ON true
WHERE g.email = 'anna.w@example.com';

INSERT INTO bookings (id, hotel_id, guest_id, check_in, check_out, room_type, status)
SELECT gen_random_uuid(), g.hotel_id, g.id, '2025-11-20'::date, '2025-11-22'::date, 'Einzelzimmer', 'confirmed'
FROM guests g WHERE g.email = 's.klein@example.com';
