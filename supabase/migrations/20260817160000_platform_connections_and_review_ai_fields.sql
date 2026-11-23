-- Bewertungsmanagement
--
-- email_accounts -> platform_connections verallgemeinern.
-- Reine RENAME-Operationen erhalten alle bestehenden Gmail-Zeilen
-- (inkl. verschlüsselter Tokens) unverändert - keine Daten gehen verloren.

-- Neuer Plattform-Wert für Google-Reviews-Verbindungen. Kein Value wird im selben
-- Statement/derselben Transaktion verwendet, daher unkritisch bzgl. Postgres'
-- "unsafe use of new enum value"-Einschränkung.
ALTER TYPE email_provider_type ADD VALUE IF NOT EXISTS 'google_reviews';

ALTER TABLE email_accounts RENAME TO platform_connections;
ALTER TABLE platform_connections RENAME COLUMN provider TO platform;
ALTER TYPE email_provider_type RENAME TO platform_connection_type;

-- email_address ist nur für E-Mail-Plattformen relevant, nicht für google_reviews.
ALTER TABLE platform_connections ALTER COLUMN email_address DROP NOT NULL;

-- Ein Hotel darf künftig mehrere Plattform-Verbindungen haben (Gmail UND Google
-- Reviews), aber jede Plattform nur einmal pro Hotel.
ALTER TABLE platform_connections DROP CONSTRAINT email_accounts_hotel_id_unique;
ALTER TABLE platform_connections ADD CONSTRAINT platform_connections_hotel_platform_unique UNIQUE (hotel_id, platform);

ALTER POLICY "Hotels verwalten nur eigene E-Mail-Konten" ON platform_connections
  RENAME TO "Hotels verwalten nur eigene Plattform-Verbindungen";

-- reviews-Tabelle um KI-Felder erweitern.
CREATE TYPE review_sentiment AS ENUM ('positiv', 'neutral', 'negativ');

ALTER TABLE reviews
  ADD COLUMN external_review_id TEXT,
  ADD COLUMN ai_sentiment review_sentiment,
  ADD COLUMN ai_topics TEXT[],
  ADD COLUMN approved_by_user BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN replied_at TIMESTAMP WITH TIME ZONE;

-- Analog zu messages.external_message_id: verhindert doppeltes Einlesen derselben
-- Bewertung beim Sync, direkt auf DB-Ebene abgesichert (nicht nur in der App-Logik).
CREATE UNIQUE INDEX reviews_hotel_external_review_id_idx
  ON reviews (hotel_id, external_review_id)
  WHERE external_review_id IS NOT NULL;
