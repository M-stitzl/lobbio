-- 1. RLS (Row Level Security) für alle Tabellen aktivieren
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendations ENABLE ROW LEVEL SECURITY;

-- 2. Policies (Zugriffsregeln) definieren

-- Für die Tabelle 'hotels' prüfen wir direkt die 'id'
CREATE POLICY "Hotels verwalten nur sich selbst" 
ON hotels FOR ALL 
USING (id = auth.uid());

-- Für alle anderen Tabellen prüfen wir den Fremdschlüssel 'hotel_id'
CREATE POLICY "Hotels sehen und verwalten nur eigene Gäste" 
ON guests FOR ALL 
USING (hotel_id = auth.uid());

CREATE POLICY "Hotels sehen und verwalten nur eigene Buchungen" 
ON bookings FOR ALL 
USING (hotel_id = auth.uid());

CREATE POLICY "Hotels sehen und verwalten nur eigene Nachrichten" 
ON messages FOR ALL 
USING (hotel_id = auth.uid());

CREATE POLICY "Hotels sehen und verwalten nur eigene Aufgaben" 
ON tasks FOR ALL 
USING (hotel_id = auth.uid());

CREATE POLICY "Hotels sehen und verwalten nur eigene Reviews" 
ON reviews FOR ALL 
USING (hotel_id = auth.uid());

CREATE POLICY "Hotels sehen und verwalten nur eigene KI Empfehlungen" 
ON ai_recommendations FOR ALL 
USING (hotel_id = auth.uid());