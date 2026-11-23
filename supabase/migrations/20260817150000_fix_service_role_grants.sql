-- BUGFIX: Der service_role (genutzt vom Server via SUPABASE_SERVICE_ROLE_KEY, u.a. im
-- Cron-Sync und in /api/save-gmail) hatte auf allen Tabellen außer email_accounts nur
-- REFERENCES/TRIGGER/TRUNCATE/MAINTAIN – aber kein SELECT/INSERT/UPDATE/DELETE. Das ist
-- keine RLS-Policy-Frage (service_role umgeht RLS), sondern fehlende Postgres-GRANTs,
-- vermutlich aus der initialen Projekt-Konfiguration. Betraf hotels, guests, bookings,
-- messages, reviews, tasks, ai_recommendations.
--
-- Symptom, das das aufgedeckt hat: "permission denied for table hotels" beim
-- server-seitigen Auslesen des Hotelnamens im Sync-Job.

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Auch künftig neu angelegte Tabellen sollen automatisch die vollen Rechte bekommen,
-- damit dieses Problem nicht bei der nächsten Migration wieder auftaucht.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
