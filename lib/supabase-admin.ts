import 'server-only';
import { createClient } from '@supabase/supabase-js';

// ACHTUNG: Nutzt den Service-Role-Key und umgeht damit Row Level Security.
// NIEMALS in Client Components importieren oder an den Browser ausliefern –
// nur in Server-only-Code (API-Routen, Cron-Jobs) verwenden, die selbst
// den hotel_id-Scope der jeweiligen Anfrage durchsetzen.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein.'
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
