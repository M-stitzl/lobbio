-- =====================================================================
-- PMS-Ausbaustufe 1: Zimmer, Raten, Folio/Rechnung, Housekeeping,
-- Meldeschein, Kurtaxe und öffentliches Buchungsportal.
--
-- Rein additiv: bestehende Spalten (insb. bookings.room_type als Freitext,
-- bookings.status) bleiben unverändert erhalten, damit KI-Verfügbarkeits-
-- prüfung, Gäste- und Analytics-Seiten weiter funktionieren. Neue Spalten
-- sind nullable bzw. haben Defaults.
--
-- Belegungs-Konvention ab hier (Hotellerie-Standard, Nacht-basiert):
--   Ein Zimmer ist in der Nacht D belegt, wenn check_in <= D < check_out.
--   Am Abreisetag ist das Zimmer also wieder frei.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Hotel-Stammdaten, Portal-Branding, Steuern, Kurtaxe
-- ---------------------------------------------------------------------
ALTER TABLE hotels
  ADD COLUMN slug TEXT UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ADD COLUMN booking_enabled BOOLEAN NOT NULL DEFAULT false,
  -- Vorführbetrieb: Portal und Rechnungen kennzeichnen Daten als Beispiel.
  ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN tagline TEXT,
  ADD COLUMN public_description TEXT,
  ADD COLUMN street TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN website_url TEXT,
  ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#2f5d50' CHECK (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD COLUMN hero_image_url TEXT,
  ADD COLUMN check_in_from TIME NOT NULL DEFAULT '15:00',
  ADD COLUMN check_out_until TIME NOT NULL DEFAULT '10:00',
  ADD COLUMN cancellation_policy TEXT,
  -- Kurtaxe / Gästebeitrag: pro Person ab Mindestalter und Nacht, keine USt.
  ADD COLUMN tourist_tax_label TEXT NOT NULL DEFAULT 'Gästebeitrag',
  ADD COLUMN tourist_tax_per_night NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (tourist_tax_per_night >= 0),
  ADD COLUMN tourist_tax_min_age INT NOT NULL DEFAULT 16 CHECK (tourist_tax_min_age >= 0),
  -- Umsatzsteuer: Beherbergung ermäßigt, Frühstück/Extras regulär.
  ADD COLUMN vat_lodging NUMERIC(4,2) NOT NULL DEFAULT 7,
  ADD COLUMN vat_standard NUMERIC(4,2) NOT NULL DEFAULT 19,
  -- Rechnungsangaben (§14 UStG)
  ADD COLUMN legal_name TEXT,
  ADD COLUMN tax_number TEXT,
  ADD COLUMN vat_id TEXT,
  ADD COLUMN bank_details TEXT,
  ADD COLUMN invoice_prefix TEXT NOT NULL DEFAULT 'RE',
  ADD COLUMN next_invoice_number INT NOT NULL DEFAULT 1 CHECK (next_invoice_number > 0);

-- ---------------------------------------------------------------------
-- 2. Zimmertypen: Portal-Inhalte und Grundpreis
-- ---------------------------------------------------------------------
ALTER TABLE room_types
  ADD COLUMN description TEXT,
  ADD COLUMN base_price NUMERIC(10,2) CHECK (base_price >= 0),
  ADD COLUMN size_sqm INT,
  ADD COLUMN amenities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN image_url TEXT,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0,
  ADD COLUMN bookable_online BOOLEAN NOT NULL DEFAULT true;

-- ---------------------------------------------------------------------
-- 3. Einzelne Zimmer + Housekeeping-Status
-- ---------------------------------------------------------------------
CREATE TYPE housekeeping_status AS ENUM ('clean', 'dirty', 'inspected', 'out_of_service');

CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  number TEXT NOT NULL,
  floor TEXT,
  housekeeping_status housekeeping_status NOT NULL DEFAULT 'clean',
  housekeeping_note TEXT,
  housekeeping_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE (hotel_id, number)
);
CREATE INDEX rooms_hotel_idx ON rooms (hotel_id, room_type_id);

-- ---------------------------------------------------------------------
-- 4. Raten: Ratenpläne (Verpflegung/Storno) und Saisonpreise
-- ---------------------------------------------------------------------
CREATE TABLE rate_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  -- Frühstück wird separat mit 19 % ausgewiesen (Pro Person und Nacht).
  breakfast_per_person NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (breakfast_per_person >= 0),
  -- Auf-/Abschlag auf den Zimmerpreis in Prozent (z.B. -10 für Frühbucher).
  price_adjustment_pct NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (price_adjustment_pct > -100),
  cancellation_policy TEXT,
  public BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE rate_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL, -- inklusive (letzte Nacht der Saison)
  min_stay INT NOT NULL DEFAULT 1 CHECK (min_stay >= 1),
  CHECK (end_date >= start_date)
);
CREATE INDEX rate_seasons_hotel_idx ON rate_seasons (hotel_id, start_date, end_date);

CREATE TABLE rate_season_prices (
  season_id UUID NOT NULL REFERENCES rate_seasons(id) ON DELETE CASCADE,
  room_type_id UUID NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  price_per_night NUMERIC(10,2) NOT NULL CHECK (price_per_night >= 0),
  PRIMARY KEY (season_id, room_type_id)
);

-- ---------------------------------------------------------------------
-- 5. Buchungen erweitern
-- ---------------------------------------------------------------------
CREATE TYPE booking_source AS ENUM ('portal', 'email', 'phone', 'walk_in', 'ota', 'manual');

ALTER TABLE bookings
  ADD COLUMN room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
  ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  ADD COLUMN rate_plan_id UUID REFERENCES rate_plans(id) ON DELETE SET NULL,
  ADD COLUMN adults INT NOT NULL DEFAULT 2 CHECK (adults >= 1),
  ADD COLUMN children INT NOT NULL DEFAULT 0 CHECK (children >= 0),
  ADD COLUMN children_ages INT[] NOT NULL DEFAULT '{}',
  ADD COLUMN total_price NUMERIC(10,2),
  ADD COLUMN source booking_source NOT NULL DEFAULT 'manual',
  ADD COLUMN booking_code TEXT UNIQUE,
  ADD COLUMN guest_message TEXT,
  ADD COLUMN checked_in_at TIMESTAMPTZ,
  ADD COLUMN checked_out_at TIMESTAMPTZ,
  ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- NOT VALID: gilt für neue/geänderte Zeilen, Altdaten blockieren die Migration nicht.
  ADD CONSTRAINT bookings_dates_check CHECK (check_out > check_in) NOT VALID;

CREATE INDEX bookings_hotel_dates_idx ON bookings (hotel_id, check_in, check_out);

-- Bestehende Buchungen mit ihrem Zimmertyp (bisher nur Name) verknüpfen.
UPDATE bookings b SET room_type_id = rt.id
FROM room_types rt
WHERE rt.hotel_id = b.hotel_id AND rt.name = b.room_type AND b.room_type_id IS NULL;

-- Gäste: Adresse für Rechnung/Meldeschein.
ALTER TABLE guests
  ADD COLUMN street TEXT,
  ADD COLUMN postal_code TEXT,
  ADD COLUMN city TEXT,
  ADD COLUMN country TEXT DEFAULT 'DE';

-- ---------------------------------------------------------------------
-- 6. Folio (Leistungen), Zahlungen, Rechnungen
-- ---------------------------------------------------------------------
CREATE TYPE folio_category AS ENUM ('lodging', 'breakfast', 'tourist_tax', 'food_beverage', 'extra');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'transfer', 'other');

CREATE TABLE folio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  category folio_category NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(8,2) NOT NULL DEFAULT 1 CHECK (quantity <> 0),
  unit_price NUMERIC(10,2) NOT NULL, -- brutto
  vat_rate NUMERIC(4,2) NOT NULL CHECK (vat_rate >= 0),
  invoice_id UUID, -- gesetzt, sobald abgerechnet (dann nicht mehr änderbar)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX folio_items_booking_idx ON folio_items (booking_id);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount <> 0),
  method payment_method NOT NULL,
  note TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking_idx ON payments (booking_id);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  number TEXT NOT NULL,
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Unveränderlicher Schnappschuss (GoBD): Empfänger, Positionen, Summen.
  recipient JSONB NOT NULL,
  issuer JSONB NOT NULL,
  lines JSONB NOT NULL,
  totals JSONB NOT NULL,
  total_gross NUMERIC(10,2) NOT NULL,
  cancelled_by UUID REFERENCES invoices(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, number)
);

ALTER TABLE folio_items
  ADD CONSTRAINT folio_items_invoice_fk FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- Fortlaufende, lückenlose Rechnungsnummer pro Hotel (atomar).
CREATE OR REPLACE FUNCTION next_invoice_number(p_hotel_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_prefix TEXT;
  v_num INT;
BEGIN
  UPDATE hotels
     SET next_invoice_number = next_invoice_number + 1
   WHERE id = p_hotel_id
  RETURNING invoice_prefix, next_invoice_number - 1 INTO v_prefix, v_num;
  IF v_num IS NULL THEN
    RAISE EXCEPTION 'Hotel nicht gefunden';
  END IF;
  RETURN v_prefix || '-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(v_num::TEXT, 4, '0');
END;
$$;

-- ---------------------------------------------------------------------
-- 7. Meldeschein (§§ 29, 30 BMG)
-- ---------------------------------------------------------------------
-- Aufbewahrung: 1 Jahr ab Abreise, Vernichtung binnen 3 Monaten danach
-- (§ 30 Abs. 4 BMG) – siehe purge_after.
CREATE TABLE registration_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_date DATE NOT NULL,
  nationality TEXT NOT NULL,
  street TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  -- Nur bei ausländischen Gästen Pflicht (§ 30 Abs. 2 BMG).
  id_document_number TEXT,
  -- Mitreisende: Ehegatten/Lebenspartner und minderjährige Kinder nur Anzahl,
  -- ausländische Mitreisende einzeln (Name, Geburtsdatum, Staatsangehörigkeit).
  co_travellers JSONB NOT NULL DEFAULT '[]',
  co_traveller_count INT NOT NULL DEFAULT 0,
  arrival DATE NOT NULL,
  departure DATE NOT NULL,
  signed_name TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  purge_after DATE GENERATED ALWAYS AS (departure + 365) STORED,
  UNIQUE (booking_id)
);

-- ---------------------------------------------------------------------
-- 8. RLS + Grants (gleiches Muster wie Bestandstabellen)
-- ---------------------------------------------------------------------
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_season_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE folio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hotels verwalten nur eigene Zimmer" ON rooms FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid());
CREATE POLICY "Hotels verwalten nur eigene Raten" ON rate_plans FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid());
CREATE POLICY "Hotels verwalten nur eigene Saisons" ON rate_seasons FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid());
CREATE POLICY "Hotels verwalten nur eigene Saisonpreise" ON rate_season_prices FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid());
CREATE POLICY "Hotels verwalten nur eigene Folios" ON folio_items FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid() AND invoice_id IS NULL);
CREATE POLICY "Hotels verwalten nur eigene Zahlungen" ON payments FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid());
-- Rechnungen: lesen + anlegen, aber nie ändern/löschen (Storno = neue Rechnung).
CREATE POLICY "Hotels lesen eigene Rechnungen" ON invoices FOR SELECT USING (hotel_id = auth.uid());
CREATE POLICY "Hotels legen eigene Rechnungen an" ON invoices FOR INSERT WITH CHECK (hotel_id = auth.uid());
CREATE POLICY "Hotels verwalten nur eigene Meldescheine" ON registration_forms FOR ALL USING (hotel_id = auth.uid()) WITH CHECK (hotel_id = auth.uid());

-- Abgerechnete Folio-Positionen dürfen nicht mehr geändert/gelöscht werden.
CREATE OR REPLACE FUNCTION protect_invoiced_folio_items()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.invoice_id IS NOT NULL AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Abgerechnete Positionen können nicht mehr geändert werden';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER folio_items_protect
  BEFORE UPDATE OR DELETE ON folio_items
  FOR EACH ROW EXECUTE FUNCTION protect_invoiced_folio_items();

GRANT ALL ON rooms, rate_plans, rate_seasons, rate_season_prices, folio_items, payments, invoices, registration_forms TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON rooms, rate_plans, rate_seasons, rate_season_prices, folio_items, payments, registration_forms TO authenticated;
GRANT SELECT, INSERT ON invoices TO authenticated;
GRANT EXECUTE ON FUNCTION next_invoice_number(UUID) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- ---------------------------------------------------------------------
-- 9. Portal-Buchung: atomar mit Verfügbarkeitsprüfung
-- ---------------------------------------------------------------------
-- Wird ausschließlich serverseitig mit dem Service-Role-Key aufgerufen
-- (app/api/portal/...), der Preis wird dort berechnet. Die Sperre pro Hotel
-- verhindert Überbuchung bei gleichzeitigen Anfragen.
CREATE OR REPLACE FUNCTION portal_create_booking(
  p_hotel_id UUID,
  p_room_type_id UUID,
  p_rate_plan_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_adults INT,
  p_children INT,
  p_children_ages INT[],
  p_total_price NUMERIC,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_guest_street TEXT,
  p_guest_postal_code TEXT,
  p_guest_city TEXT,
  p_guest_country TEXT,
  p_guest_message TEXT
) RETURNS TABLE (booking_id UUID, booking_code TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_capacity INT;
  v_room_type_name TEXT;
  v_max_guests INT;
  v_taken INT;
  v_guest_id UUID;
  v_booking_id UUID;
  v_code TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('portal:' || p_hotel_id::TEXT));

  IF p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'INVALID_DATES';
  END IF;

  SELECT total_count, name, max_guests INTO v_capacity, v_room_type_name, v_max_guests
    FROM room_types
   WHERE id = p_room_type_id AND hotel_id = p_hotel_id AND bookable_online;
  IF v_capacity IS NULL THEN
    RAISE EXCEPTION 'ROOM_TYPE_NOT_FOUND';
  END IF;
  IF v_max_guests IS NOT NULL AND p_adults + p_children > v_max_guests THEN
    RAISE EXCEPTION 'TOO_MANY_GUESTS';
  END IF;

  -- Höchste Belegung über alle Nächte des Zeitraums.
  SELECT COALESCE(MAX(cnt), 0) INTO v_taken FROM (
    SELECT d::DATE AS night, COUNT(b.id) AS cnt
      FROM generate_series(p_check_in, p_check_out - 1, INTERVAL '1 day') AS d
      LEFT JOIN bookings b
        ON b.hotel_id = p_hotel_id
       AND b.status <> 'cancelled'
       AND (b.room_type_id = p_room_type_id OR (b.room_type_id IS NULL AND b.room_type = v_room_type_name))
       AND b.check_in <= d::DATE AND d::DATE < b.check_out
     GROUP BY d
  ) nights;

  IF v_taken >= v_capacity THEN
    RAISE EXCEPTION 'NOT_AVAILABLE';
  END IF;

  SELECT id INTO v_guest_id FROM guests
   WHERE hotel_id = p_hotel_id AND lower(email) = lower(p_guest_email)
   ORDER BY created_at LIMIT 1;

  IF v_guest_id IS NULL THEN
    INSERT INTO guests (hotel_id, name, email, phone, street, postal_code, city, country)
    VALUES (p_hotel_id, p_guest_name, p_guest_email, p_guest_phone, p_guest_street, p_guest_postal_code, p_guest_city, p_guest_country)
    RETURNING id INTO v_guest_id;
  ELSE
    UPDATE guests SET
      phone = COALESCE(p_guest_phone, phone),
      street = COALESCE(p_guest_street, street),
      postal_code = COALESCE(p_guest_postal_code, postal_code),
      city = COALESCE(p_guest_city, city),
      country = COALESCE(p_guest_country, country)
    WHERE id = v_guest_id;
  END IF;

  LOOP
    v_code := upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE bookings.booking_code = v_code);
  END LOOP;

  INSERT INTO bookings (
    hotel_id, guest_id, check_in, check_out, room_type, room_type_id, rate_plan_id,
    adults, children, children_ages, total_price, status, source, booking_code, guest_message
  ) VALUES (
    p_hotel_id, v_guest_id, p_check_in, p_check_out, v_room_type_name, p_room_type_id, p_rate_plan_id,
    p_adults, p_children, COALESCE(p_children_ages, '{}'), p_total_price, 'confirmed', 'portal', v_code, p_guest_message
  ) RETURNING id INTO v_booking_id;

  RETURN QUERY SELECT v_booking_id, v_code;
END;
$$;

REVOKE ALL ON FUNCTION portal_create_booking FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION portal_create_booking TO service_role;

