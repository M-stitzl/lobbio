-- Kontaktformular der öffentlichen Landingpage.
CREATE TABLE contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS aktiv, aber bewusst OHNE Policies: Das Formular wird ausschließlich über
-- /api/contact mit dem Service-Role-Key beschrieben (siehe supabaseAdmin), nie
-- direkt vom Browser aus. Anon/authenticated haben dadurch weder Lese- noch
-- Schreibzugriff auf potenziell personenbezogene Kontaktanfragen.
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
