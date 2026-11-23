-- E-Mail-Integration (Gmail)
--
-- HINWEIS: Beim Abgleich mit der Remote-DB hat sich gezeigt, dass die in Schritt 1
-- geforderten Felder (messages.ai_category etc. sowie die Tabelle email_accounts
-- inkl. UNIQUE-Constraint auf hotel_id) bereits direkt auf der Remote-DB angelegt
-- wurden, aber nie als Migration committet waren (daher fehlten sie hier lokal).
-- Diese Migration ergänzt nur das, was tatsächlich noch fehlt: die Speicherung
-- des refresh_token samt Ablaufzeit des access_token. Ohne den refresh_token kann
-- der Cron-Sync (Schritt 3) keine neuen access_token holen, sobald der ursprüngliche
-- (aus der Login-Session) nach ca. 1 Stunde abgelaufen ist.

ALTER TABLE email_accounts
  ADD COLUMN refresh_token_encrypted TEXT,
  ADD COLUMN token_expires_at TIMESTAMP WITH TIME ZONE;
