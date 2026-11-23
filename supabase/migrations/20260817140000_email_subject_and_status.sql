-- Betreff getrennt vom Fließtext speichern (nötig für eine saubere "Re:"-Antwort)
-- und die Original-Message-ID (RFC 2822 Header), die Gmail für In-Reply-To/References
-- beim Beantworten im selben Thread verlangt.
ALTER TABLE messages
  ADD COLUMN subject TEXT,
  ADD COLUMN original_message_id_header TEXT;

-- "Verwerfen"-Aktion in der UI (Schritt 4): der Hotelchef lehnt den KI-Vorschlag ab,
-- ohne dass eine Antwort versendet wird. Der bestehende Enum kennt nur
-- new/answered/pending_review – 'discarded' ergänzt den fehlenden Zustand.
ALTER TYPE message_status ADD VALUE IF NOT EXISTS 'discarded';
