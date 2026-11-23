-- Baseline-Dokumentation: Diese Objekte wurden bereits direkt auf der Remote-DB
-- angelegt (vermutlich über den Supabase SQL-Editor), ohne dass eine Migration
-- dafür committet wurde. Diese Datei holt das nachträglich nach, damit ein
-- `supabase db reset` lokal denselben Stand erzeugt wie die Remote-DB.
-- Auf der Remote-DB selbst wird sie NICHT erneut ausgeführt (siehe `migration repair`),
-- da die Objekte dort schon existieren.

CREATE TYPE ai_message_category AS ENUM ('anfrage', 'beschwerde', 'buchungsaenderung', 'sonstiges');
CREATE TYPE email_provider_type AS ENUM ('gmail', 'imap');

ALTER TABLE messages
  ADD COLUMN ai_category ai_message_category,
  ADD COLUMN ai_draft_reply TEXT,
  ADD COLUMN external_message_id TEXT,
  ADD COLUMN approved_by_user BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN sent_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE messages
  ADD CONSTRAINT messages_external_message_id_key UNIQUE (external_message_id);

CREATE TABLE email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL UNIQUE REFERENCES hotels(id) ON DELETE CASCADE,
  provider email_provider_type NOT NULL,
  email_address TEXT NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels verwalten nur eigene E-Mail-Konten"
ON email_accounts FOR ALL
USING (hotel_id = auth.uid());
