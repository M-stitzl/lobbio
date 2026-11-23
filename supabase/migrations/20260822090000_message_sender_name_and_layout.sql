-- Name des Verfassers, aus der Grußformel extrahiert (Zusatzfeld zur
-- bestehenden Anfrage-Extraktion), für den Fall, dass eine eingehende
-- Nachricht keinem bestehenden Gast über die E-Mail-Adresse zugeordnet
-- werden konnte. Bleibt null, wenn kein Name sicher extrahierbar war.
ALTER TABLE messages ADD COLUMN extracted_sender_name TEXT;
