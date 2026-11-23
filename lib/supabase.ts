import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// createBrowserClient (statt createClient aus @supabase/supabase-js) speichert die
// Session zusätzlich in Cookies (nicht nur localStorage) – nötig, damit proxy.ts
// (server-seitig, siehe Next.js "Proxy"-Konvention) die Login-Session überhaupt lesen
// und /dashboard/* schützen kann. API sonst identisch, keine Änderungen an
// bestehenden .from(...)-Aufrufen nötig.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
