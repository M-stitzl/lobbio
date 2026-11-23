-- Damit Realtime-DELETE-Events auf messages (neu: Nachrichten-Löschfunktion)
-- den gefilterten Dashboard-Abo-Kanal (`hotel_id=eq.<hotelId>`) auch
-- erreichen, muss die WAL-Payload für gelöschte Zeilen mehr als nur die
-- Primärspalte enthalten – per Default (REPLICA IDENTITY DEFAULT) enthält
-- der "alte" Datensatz bei DELETE/UPDATE nur die Primary-Key-Spalte, ohne
-- hotel_id. Der Realtime-Filter könnte das DELETE-Event dann nie einem
-- Kanal zuordnen, und die KPI "Neue Nachrichten" auf /dashboard würde nach
-- dem Löschen nicht automatisch aktualisiert.
ALTER TABLE messages REPLICA IDENTITY FULL;
