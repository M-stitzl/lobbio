-- 1. Hotel anlegen (Feste UUID für Verknüpfungen)
INSERT INTO hotels (id, name, created_at) 
VALUES ('11111111-1111-1111-1111-111111111111', 'Hotel Alpenblick Chiemgau', now())
ON CONFLICT (id) DO NOTHING;

-- 2. Gäste anlegen (8 Stück)
INSERT INTO guests (id, hotel_id, name, email, phone, vip_notes) VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Thomas Müller', 'thomas.m@example.com', '+49 160 1234567', 'Stammgast. Bevorzugt Zimmer mit freiem Bergblick auf die Kampenwand.'),
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Julia Wagner', 'j.wagner@example.com', NULL, 'Feiert dieses Jahr den 4. Jahrestag mit ihrem Freund bei uns. Evtl. Sekt aufs Zimmer.'),
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Familie Schmidt', 'schmidt.family@example.com', '+49 151 9876543', 'Reisen mit zwei kleinen Kindern an. Brauchen ein Zustellbett.'),
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111111', 'Felix Bauer', 'f.bauer@example.com', NULL, 'Begeisterter Hobbykoch, hat letztes Jahr gefragt, ob er seinen Dutch Oven im Garten für veganes Pulled Pork nutzen darf.'),
('22222222-2222-2222-2222-222222222225', '11111111-1111-1111-1111-111111111111', 'Anna Weber', 'anna.w@example.com', '+43 664 123456', 'Fragt oft nach E-Bike Verleih am Chiemsee.'),
('22222222-2222-2222-2222-222222222226', '11111111-1111-1111-1111-111111111111', 'Lars Svensson', 'lars.s@example.se', NULL, 'Kommt aus Schweden (Umeå), spricht aber etwas Deutsch. Mag lokale bayrische Biere.'),
('22222222-2222-2222-2222-222222222227', '11111111-1111-1111-1111-111111111111', 'Maximilian Huber', 'm.huber@example.com', '+49 170 5554443', 'Nutzt oft den Late-Checkout am Sonntag.'),
('22222222-2222-2222-2222-222222222228', '11111111-1111-1111-1111-111111111111', 'Sarah Klein', 's.klein@example.com', NULL, 'Bevorzugt ruhige Zimmer zur Gartenseite. Hat letztes Jahr Fahrräder für einen Ausflug gemietet.')
ON CONFLICT (id) DO NOTHING;

-- 2b. Zimmertypen anlegen (Namen konsistent zu den unten verwendeten
-- bookings.room_type-Werten, für die Verfügbarkeitsprüfung der
-- E-Mail-Antwortgenerierung)
INSERT INTO room_types (hotel_id, name, total_count, max_guests) VALUES
('11111111-1111-1111-1111-111111111111', 'Einzelzimmer', 4, 1),
('11111111-1111-1111-1111-111111111111', 'Doppelzimmer', 8, 2),
('11111111-1111-1111-1111-111111111111', 'Doppelzimmer Bergblick', 5, 2),
('11111111-1111-1111-1111-111111111111', 'Familienzimmer', 3, 4),
('11111111-1111-1111-1111-111111111111', 'Suite Kampenwand', 2, 3)
ON CONFLICT (hotel_id, name) DO NOTHING;

-- 2c. Wissensdatenbank anlegen (geprüfte Fakten für die Antwortgenerierung)
INSERT INTO knowledge_base (hotel_id, topic, content) VALUES
('11111111-1111-1111-1111-111111111111', 'Sauna', 'Die neue Sauna befindet sich im Umbau und eröffnet voraussichtlich im Frühjahr 2027. Ein genaues Datum steht noch nicht fest.'),
('11111111-1111-1111-1111-111111111111', 'Frühstückszeiten', 'Frühstück wird täglich von 7:30 bis 10:30 Uhr im Restaurant im Erdgeschoss serviert.'),
('11111111-1111-1111-1111-111111111111', 'Haustiere', 'Hunde sind gegen eine Gebühr von 15 € pro Nacht willkommen, andere Haustiere nach Rücksprache.'),
('11111111-1111-1111-1111-111111111111', 'Parken', 'Kostenlose Parkplätze direkt am Haus, keine Reservierung nötig.')
ON CONFLICT DO NOTHING;

-- 3. Buchungen anlegen (Um die Anzeige auf dem Dashboard realistisch zu machen)
INSERT INTO bookings (id, hotel_id, guest_id, check_in, check_out, room_type, status) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', CURRENT_DATE, CURRENT_DATE + 3, 'Doppelzimmer Bergblick', 'confirmed'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', CURRENT_DATE, CURRENT_DATE + 2, 'Suite Kampenwand', 'confirmed'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', CURRENT_DATE + 1, CURRENT_DATE + 5, 'Familienzimmer', 'pending')
ON CONFLICT DO NOTHING;

-- 4. Nachrichten anlegen (15 Stück)
INSERT INTO messages (id, hotel_id, guest_id, channel, direction, content, status, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'email', 'inbound', 'Guten Tag, wir reisen heute voraussichtlich erst gegen 20 Uhr an. Ist ein Check-in dann noch problemlos möglich oder sollen wir uns vorher telefonisch melden?', 'new', now() - interval '2 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222225', 'whatsapp', 'inbound', 'Hallo! Kann man bei Ihnen auch E-Bikes für morgen reservieren? Wir würden gerne um den Chiemsee fahren.', 'new', now() - interval '3 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'phone', 'inbound', 'Gast fragte telefonisch, ob der Parkplatz hinter dem Haus am Wochenende reserviert werden muss.', 'answered', now() - interval '1 day'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222221', 'phone', 'outbound', 'Parkplatz wurde bestätigt. Keine Reservierung nötig.', 'answered', now() - interval '1 day'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222228', 'email', 'inbound', 'Liebes Alpenblick-Team, haben Sie glutenfreie Brötchen beim Frühstück? LG Sarah Klein', 'answered', now() - interval '2 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222228', 'email', 'outbound', 'Sehr geehrte Frau Klein, ja, wir haben immer eine Auswahl an glutenfreien Backwaren vorrätig.', 'answered', now() - interval '1 day'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222226', 'whatsapp', 'inbound', 'Hej! Vi är på väg... also wir sind auf dem Weg von München zu euch. Können wir schon um 13 Uhr einchecken?', 'new', now() - interval '1 hour'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222224', 'email', 'inbound', 'Hallo zusammen, wir freuen uns auf nächste Woche. Gibt es am Buffet mittlerweile eigentlich Soja- oder Hafermilch? Wir ernähren uns vegan.', 'pending_review', now() - interval '4 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222227', 'whatsapp', 'inbound', 'Können wir den Checkout morgen auf 12 Uhr schieben?', 'answered', now() - interval '3 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222227', 'whatsapp', 'outbound', 'Gerne Herr Huber, wir haben 12 Uhr für Sie im System vermerkt.', 'answered', now() - interval '3 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL, 'email', 'inbound', 'Bewerbung als Rezeptionist. Sehr geehrte Damen und Herren, anbei erhalten Sie...', 'new', now() - interval '5 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'whatsapp', 'inbound', 'Danke für den tollen Sekt auf dem Zimmer! Unser Jahrestag fängt super an :)', 'answered', now() - interval '20 minutes'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'whatsapp', 'outbound', 'Das freut uns sehr, Frau Wagner! Genießen Sie den Tag.', 'answered', now() - interval '10 minutes'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', NULL, 'phone', 'inbound', 'Unbekannter Anrufer fragte nach den Stornierungsbedingungen für den Winter.', 'answered', now() - interval '4 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222223', 'email', 'inbound', 'Nachtrag zu heute Abend: Bitte stellen Sie das Babybett schon auf, die Kleine ist sehr müde.', 'new', now() - interval '30 minutes')
ON CONFLICT DO NOTHING;

-- 5. Bewertungen anlegen (5 Stück)
INSERT INTO reviews (id, hotel_id, guest_name, rating, content, platform, ai_reply_draft, status, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Sabine H.', 5, 'Wunderschönes Hotel mit herrlichem Blick auf die Berge. Das Frühstück war reichhaltig und regional. Wir kommen wieder!', 'google', 'Liebe Sabine H., vielen Dank für die großartige 5-Sterne-Bewertung! Es freut uns sehr, dass Ihnen der Bergblick und unser regionales Frühstück so gut gefallen haben. Bis zum nächsten Mal!', 'new', now() - interval '12 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Klaus D.', 4, 'Zimmer sauber, Personal freundlich. Leider war der WLAN-Empfang im zweiten Stock etwas schwach, daher ein Stern Abzug.', 'booking', NULL, 'new', now() - interval '1 day'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Anonym', 5, 'Perfekt für einen Kurzurlaub am Chiemsee. Tolle Radwege direkt ab dem Hotel.', 'other', NULL, 'replied', now() - interval '4 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'L.S.', 5, 'Mycket bra! Schönes Zimmer, leckeres Bier an der Bar.', 'google', NULL, 'new', now() - interval '2 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Günther', 3, 'Gutes Haus, aber die Matratzen waren uns persönlich viel zu weich.', 'booking', 'Lieber Günther, danke für das ehrliche Feedback. Schade, dass die Matratzen nicht Ihrem Geschmack entsprachen. Sprechen Sie uns beim nächsten Besuch gerne an, wir haben für einige Zimmer auch härtere Topper verfügbar.', 'new', now() - interval '2 hours')
ON CONFLICT DO NOTHING;

-- 6. Aufgaben anlegen (6 Stück)
INSERT INTO tasks (id, hotel_id, title, description, source, status, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Zustellbett für Familie Schmidt richten', 'Zimmer 12, Anreise heute Abend, Gast hat nochmals per Mail erinnert.', 'message', 'open', now()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'WLAN Repeater in 2. OG prüfen', 'Aufgrund einer Booking.com Bewertung von Klaus D.', 'review', 'open', now() - interval '1 day'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Hafermilch/Sojamilch nachbestellen', 'Felix B. hat nachgefragt. Genug Vorrat fürs Wochenende prüfen.', 'manual', 'open', now() - interval '2 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Glühbirne Flur Erdgeschoss tauschen', 'Flackert seit heute Morgen', 'manual', 'done', now() - interval '3 days'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'Sektflasche in die Suite bringen', 'Für Julia Wagner (Jahrestag)', 'manual', 'done', now() - interval '5 hours'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'E-Bike Reservierung für morgen fixieren', 'Frau Weber hat über WhatsApp angefragt. 2x E-Bike bei Sport Müller reservieren.', 'message', 'open', now() - interval '1 hour')
ON CONFLICT DO NOTHING;

-- 7. KI Empfehlungen anlegen (5 Stück)
INSERT INTO ai_recommendations (id, hotel_id, type, title, description, priority, dismissed, created_at) VALUES
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'alert', 'Häufung: Späte Anreise', 'Zwei Gäste haben heute eine Anreise nach 20 Uhr angekündigt. Besetzung der Rezeption prüfen.', 'high', false, now()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'upsell', 'Upsell Potenzial: Herr Müller', 'Gast Thomas Müller bevorzugt Bergblick. Ein Upgrade auf die freie Panoramasuite für 40€/Nacht per WhatsApp anbieten?', 'medium', false, now()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'pattern', 'Trend erkannt: Veganes Angebot', 'In den letzten 30 Tagen gab es 4 Nachfragen zu veganen Alternativen. Empfehlung: Angebot am Frühstücksbuffet sichtbarer kennzeichnen.', 'low', false, now() - interval '1 day'),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'guest_context', 'Jubiläum: Julia Wagner', 'Frau Wagner feiert heute ihren 4. Jahrestag. Möchten Sie ihr beim Check-in gratulieren?', 'high', false, now()),
(gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'alert', 'WLAN Beschwerden', 'Das Keyword "WLAN" wurde in 2 aktuellen Bewertungen negativ erwähnt. Handlungsbedarf im 2. OG.', 'medium', true, now() - interval '3 days')
ON CONFLICT DO NOTHING;