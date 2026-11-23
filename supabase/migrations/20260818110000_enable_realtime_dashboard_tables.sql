-- Aktiviert Supabase Realtime für die vier Tabellen, deren Änderungen die
-- Dashboard-Übersichtsseite (/dashboard) live nachziehen soll (Kennzahlen-
-- Karten, Anfragen-Feed, Anreisen-Liste), ohne dass der Nutzer neu laden
-- muss. Ohne diesen Eintrag in der `supabase_realtime`-Publication kommen
-- postgres_changes-Events beim Client nie an, selbst wenn RLS den Zugriff
-- erlauben würde.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'reviews'
  ) then
    alter publication supabase_realtime add table reviews;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table tasks;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
end $$;
