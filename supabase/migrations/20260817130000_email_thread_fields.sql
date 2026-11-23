-- Zusätzlich zu external_message_id (Schritt 1) brauchen wir für den Versand in
-- Schritt 4 die Gmail thread_id (damit die Antwort im richtigen Thread landet)
-- und die Absenderadresse (falls die Mail keinem bestehenden Gast zugeordnet ist,
-- z.B. Bewerbungen oder neue Anfragen ohne existierenden guests-Eintrag).

ALTER TABLE messages
  ADD COLUMN gmail_thread_id TEXT,
  ADD COLUMN external_sender_email TEXT;
