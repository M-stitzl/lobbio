-- Buchungsnotizen/Sonderwünsche, editierbar im neuen Detail-Dialog.
ALTER TABLE bookings ADD COLUMN notes TEXT;

-- zusätzliche Buchungen für die produktive Testumgebung, damit die
-- neuen Ansichten (Kalender, Anstehend/Vergangen-Filter, Zimmerübersicht)
-- sinnvoll geprüft werden können. Bestehende Zeilen bleiben unverändert,
-- ausschließlich additive Inserts über vorhandene Gäste des realen Hotels.
--
-- Vorher: nur 2 Buchungen mit check_out in der Vergangenheit (relativ zum
-- 2026-08-26) und keine Buchung mit Status 'cancelled'.
INSERT INTO bookings (id, hotel_id, guest_id, check_in, check_out, room_type, status) VALUES
  (gen_random_uuid(), 'f6d38b99-84e7-49b9-960a-290130c7a480', '22222222-2222-2222-2222-222222222225', '2026-01-05', '2026-01-08', 'Einzelzimmer', 'confirmed'),
  (gen_random_uuid(), 'f6d38b99-84e7-49b9-960a-290130c7a480', 'd2de2b53-caa0-48ff-8684-f94050bc7578', '2026-02-10', '2026-02-12', 'Doppelzimmer', 'confirmed'),
  (gen_random_uuid(), 'f6d38b99-84e7-49b9-960a-290130c7a480', 'b34a4caf-d537-459c-97da-19b85cbfe7bc', '2026-09-05', '2026-09-08', 'Doppelzimmer', 'cancelled'),
  -- Zusätzliche, sich überschneidende Buchungen in Zimmertypen mit kleinem
  -- total_count (Suite Kampenwand: 2, Familienzimmer: 3), damit die
  -- Auslastungsanzeige auch mittlere/hohe Werte zeigt statt
  -- durchgehend niedriger Prozentsätze.
  (gen_random_uuid(), 'f6d38b99-84e7-49b9-960a-290130c7a480', '22222222-2222-2222-2222-222222222227', '2026-08-25', '2026-08-29', 'Suite Kampenwand', 'confirmed'),
  (gen_random_uuid(), 'f6d38b99-84e7-49b9-960a-290130c7a480', '22222222-2222-2222-2222-222222222228', '2026-08-20', '2026-08-27', 'Familienzimmer', 'confirmed'),
  (gen_random_uuid(), 'f6d38b99-84e7-49b9-960a-290130c7a480', 'e0d19457-d61a-47b0-a9ba-38e518782c98', '2026-08-24', '2026-08-28', 'Familienzimmer', 'confirmed');
