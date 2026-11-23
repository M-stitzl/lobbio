-- Neue Tabelle room_types: hält fest, wie viele Zimmer eines Typs ein Hotel
-- überhaupt hat – Grundlage für die Verfügbarkeitsprüfung in der
-- E-Mail-Antwortgenerierung (nur Anzahl gebuchter Zimmer eines Typs zu kennen
-- reicht nicht, um "verfügbar/nicht verfügbar" zu beantworten).
CREATE TABLE room_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  total_count INT NOT NULL CHECK (total_count > 0),
  max_guests INT,
  UNIQUE (hotel_id, name)
);

ALTER TABLE room_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels sehen und verwalten nur eigene Zimmertypen"
ON room_types FOR ALL
USING (hotel_id = auth.uid());

GRANT ALL ON room_types TO service_role;

-- Kleine, transparente Notiz für die Freigabe-Ansicht: hält fest,
-- welche Verfügbarkeits-/Gästekontext-Zusatzinfo in den jeweiligen
-- KI-Antwortentwurf eingeflossen ist, z.B. "Verfügbarkeit geprüft: 2
-- Familienzimmer frei im angefragten Zeitraum". Nullable, da nicht jede
-- Nachricht eine Verfügbarkeitsanfrage ist.
ALTER TABLE messages ADD COLUMN ai_context_note TEXT;

-- Seed-Daten für den bestehenden Beispielbetrieb, mit Namen konsistent zu den
-- bereits in bookings.room_type verwendeten Bezeichnungen (freier Text dort,
-- kein Fremdschlüssel-Umbau in diesem Schritt – siehe Prompt).
INSERT INTO room_types (hotel_id, name, total_count, max_guests) VALUES
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Einzelzimmer', 4, 1),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Doppelzimmer', 8, 2),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Doppelzimmer Bergblick', 5, 2),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Familienzimmer', 3, 4),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Suite Kampenwand', 2, 3)
ON CONFLICT (hotel_id, name) DO NOTHING;
