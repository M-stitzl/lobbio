-- Verweist auf die ursprüngliche Nachricht, aus der eine Aufgabe entstanden
-- ist (nur bei source='message' gesetzt) – für den Nachrichtenauszug auf
-- gästebezogenen Aufgabenkarten und als präzisere Kontextquelle für
-- die Follow-up-Generierung (statt der bisherigen Heuristik "jüngste
-- eingehende E-Mail dieses Gasts"). ON DELETE SET NULL: wird die
-- Ursprungsnachricht später gelöscht (siehe Löschfunktion aus einem
-- vorherigen Prompt), bleibt die Aufgabe selbst bestehen, verliert nur die
-- Referenz.
ALTER TABLE tasks ADD COLUMN source_message_id UUID REFERENCES messages(id) ON DELETE SET NULL;
