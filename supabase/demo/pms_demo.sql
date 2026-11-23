-- =====================================================================
-- Demo-Daten für den Vorführbetrieb „Hotel Alpenblick“ (KEINE Migration)
--
-- Befüllt NUR das unten angegebene Demo-Hotel mit Zimmern, Preisen,
-- Raten, Fotos und Portal-Texten und markiert es als Demo (is_demo), damit
-- Portal und Rechnungen die Daten sichtbar als Beispiel kennzeichnen.
-- Darf niemals auf einen echten Kundenbetrieb angewendet werden.
--
-- Ausführen (nach der Migration 20261116120000_pms_core.sql), z. B. im
-- Supabase-SQL-Editor oder mit psql. Mehrfaches Ausführen ist unschädlich.
--
-- Fotos: Unsplash (https://unsplash.com/license), frei nutzbar:
--   Titelbild  Kampenwand  – Daniel Seßler  https://unsplash.com/photos/G2Df3hE0O4I
--   Einzelzimmer           – Caroline Badran https://unsplash.com/photos/ePpt1W2cTjs
--   Doppelzimmer           – Clay Banks      https://unsplash.com/photos/yOs9Zc5JvTw
--   DZ Bergblick           – Unsplash        https://unsplash.com/photos/r25XI14I-Gc
--   Familienzimmer         – Caroline Badran https://unsplash.com/photos/aH_EykwSvFk
--   Suite Kampenwand       – Clay Banks      https://unsplash.com/photos/4iTQFfuiFzc
-- =====================================================================

DO $$
DECLARE
  -- Demo-Hotel (hotels.id = auth.uid() des Demo-Logins)
  h UUID := 'f6d38b99-84e7-49b9-960a-290130c7a480';
  img TEXT := 'https://images.unsplash.com/';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM hotels WHERE id = h) THEN
    RAISE NOTICE 'Demo-Hotel % nicht gefunden – nichts zu tun.', h;
    RETURN;
  END IF;

  UPDATE hotels SET
    is_demo = true,
    booking_enabled = true,
    slug = COALESCE(slug, 'alpenblick'),
    accent_color = '#2f5d50',
    hero_image_url = img || 'photo-1679218499012-d77004d35a09?w=2400&q=80&fm=jpg&fit=crop&crop=focalpoint&fp-y=0.4&h=1300',
    tagline = 'Familiengeführt, mit Blick auf die Kampenwand',
    public_description = 'Ein kleines Haus mit 22 Zimmern am Fuß der Kampenwand. Frühstück mit Produkten aus dem Chiemgau, Wanderwege direkt vor der Tür, zum Chiemsee sind es 15 Minuten.',
    street = 'Musterweg 1',
    postal_code = '83229',
    city = 'Aschau im Chiemgau',
    phone = NULL,
    email = 'info@alpenblick.example',
    check_in_from = '15:00',
    check_out_until = '10:00',
    cancellation_policy = 'Kostenfreie Stornierung bis 7 Tage vor Anreise. Danach berechnen wir 80 % des Übernachtungspreises.',
    tourist_tax_label = 'Gästebeitrag',
    tourist_tax_per_night = 2.50,
    tourist_tax_min_age = 16,
    vat_lodging = 7,
    vat_standard = 19,
    legal_name = 'Hotel Alpenblick (Demo)',
    tax_number = '000/000/00000 (Muster)',
    bank_details = 'Musterbank · IBAN DE00 0000 0000 0000 0000 00 (Muster)',
    invoice_prefix = 'DEMO'
  WHERE id = h;

  UPDATE room_types rt SET
    base_price = v.price, size_sqm = v.size, sort_order = v.ord, description = v.descr,
    amenities = v.amen, image_url = img || v.photo || '?w=900&q=75&fm=jpg&fit=crop', bookable_online = true
  FROM (VALUES
    ('Einzelzimmer', 79, 16, 1, 'Ruhiges Zimmer zur Gartenseite mit Holzvertäfelung, ideal für Wanderer und Geschäftsreisende.',
      ARRAY['WLAN', 'Dusche/WC', 'Schreibtisch'], 'photo-1752407828561-2450ced77979'),
    ('Doppelzimmer', 119, 22, 2, 'Helles Doppelzimmer mit Holzboden, großem Fenster und Blick ins Grüne.',
      ARRAY['WLAN', 'Dusche/WC', 'Balkon'], 'photo-1788217023349-ad7763845844'),
    ('Doppelzimmer Bergblick', 139, 24, 3, 'Doppelzimmer mit Balkon und freiem Blick auf die Chiemgauer Alpen.',
      ARRAY['WLAN', 'Dusche/WC', 'Balkon', 'Bergblick'], 'photo-1732538329287-16c7ed7e3a2a'),
    ('Familienzimmer', 169, 34, 4, 'Zwei Räume mit Verbindungstür, Platz für bis zu vier Personen.',
      ARRAY['WLAN', 'Badewanne', 'Zustellbett möglich'], 'photo-1752407828784-67a92663c866'),
    ('Suite Kampenwand', 219, 45, 5, 'Unsere größte Suite mit Kamin, Wohnbereich, Bergblick und Badewanne.',
      ARRAY['WLAN', 'Kamin', 'Wohnbereich', 'Bergblick', 'Badewanne'], 'photo-1770736158887-9a0f3702416e')
  ) AS v(name, price, size, ord, descr, amen, photo)
  WHERE rt.hotel_id = h AND rt.name = v.name;

  -- Zimmer anlegen (so viele wie total_count je Typ), nur wenn noch keine existieren.
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE hotel_id = h) THEN
    INSERT INTO rooms (hotel_id, room_type_id, number, floor, sort_order)
    SELECT hotel_id, id, (100 * (1 + (n - 1) / 10) + 1 + (n - 1) % 10)::TEXT, (1 + (n - 1) / 10)::TEXT || '. OG', n
    FROM (
      SELECT rt.hotel_id, rt.id, row_number() OVER (ORDER BY rt.sort_order, gs) AS n
      FROM room_types rt CROSS JOIN LATERAL generate_series(1, rt.total_count) gs
      WHERE rt.hotel_id = h
    ) numbered;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rate_plans WHERE hotel_id = h) THEN
    INSERT INTO rate_plans (hotel_id, name, description, breakfast_per_person, price_adjustment_pct, sort_order) VALUES
      (h, 'Übernachtung mit Frühstück', 'Regionales Frühstücksbuffet inklusive.', 16.00, 0, 1),
      (h, 'Nur Übernachtung', 'Ohne Verpflegung.', 0, 0, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM rate_seasons WHERE hotel_id = h) THEN
    WITH s AS (
      INSERT INTO rate_seasons (hotel_id, name, start_date, end_date, min_stay)
      VALUES (h, 'Sommer 2027', '2027-06-15', '2027-09-15', 3)
      RETURNING id
    )
    INSERT INTO rate_season_prices (season_id, room_type_id, hotel_id, price_per_night)
    SELECT s.id, rt.id, h, round(rt.base_price * 1.2) FROM s, room_types rt
    WHERE rt.hotel_id = h AND rt.base_price IS NOT NULL;
  END IF;
END $$;
