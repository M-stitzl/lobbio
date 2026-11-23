-- Korrektur: Pflichtfelder sind laut Vorgabe nur Name/Hotelname/E-Mail –
-- "Nachricht" ist optional und darf daher nicht NOT NULL sein.
ALTER TABLE contact_requests ALTER COLUMN message DROP NOT NULL;
