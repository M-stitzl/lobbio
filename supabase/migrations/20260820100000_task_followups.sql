-- Datenmodell für automatisch aus offen gelassenen Antwort-Punkten
-- erstellte Aufgaben, die eine Folge-Nachricht an den Gast erwarten.
ALTER TABLE tasks ADD COLUMN guest_id UUID REFERENCES guests(id) ON DELETE SET NULL;
ALTER TABLE tasks ADD COLUMN requires_guest_reply BOOLEAN NOT NULL DEFAULT false;

-- Speichert die vom Modell erkannten offen gelassenen Punkte eines
-- E-Mail-Antwortentwurfs (z.B. "Verfügbarkeit Balkonzimmer prüfen"), bis die
-- Antwort freigegeben/versendet wird und daraus Aufgaben entstehen.
ALTER TABLE messages ADD COLUMN ai_open_followups TEXT[];
