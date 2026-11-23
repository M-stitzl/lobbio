-- Schlanke Hotel-Wissensdatenbank: geprüfte, vom Hotel selbst hinterlegte
-- Fakten (Sauna-Baustand, Öffnungszeiten, Haustierregelung usw.), die als
-- einzige erlaubte Faktenquelle in die KI-Antwortgenerierung einfließen –
-- Gegenmaßnahme zur Halluzination erfundener Fakten (siehe Prompt-Kontext:
-- frei erfundene Aussage zum Bauzustand einer Sauna).
CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  content TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels sehen und verwalten nur eigene Wissenseinträge"
ON knowledge_base FOR ALL
USING (hotel_id = auth.uid());

GRANT ALL ON knowledge_base TO service_role;

-- Seed-Daten für den bestehenden Testbetrieb – bewusst inkl. eines Themas
-- (Sauna), zu dem tatsächlich schon ein Fakt vorliegt, damit sich der
-- Unterschied "Fakt bekannt" vs. "Fakt unbekannt" beim nächsten Test direkt
-- zeigt.
INSERT INTO knowledge_base (hotel_id, topic, content) VALUES
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Sauna', 'Die neue Sauna befindet sich im Umbau und eröffnet voraussichtlich im Frühjahr 2027. Ein genaues Datum steht noch nicht fest.'),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Frühstückszeiten', 'Frühstück wird täglich von 7:30 bis 10:30 Uhr im Restaurant im Erdgeschoss serviert.'),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Haustiere', 'Hunde sind gegen eine Gebühr von 15 € pro Nacht willkommen, andere Haustiere nach Rücksprache.'),
  ('f6d38b99-84e7-49b9-960a-290130c7a480', 'Parken', 'Kostenlose Parkplätze direkt am Haus, keine Reservierung nötig.')
ON CONFLICT DO NOTHING;
