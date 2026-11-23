import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// HINWEIS: In dieser Next.js-Version (16) heißt die frühere "Middleware"-Datei-
// Konvention "Proxy" (middleware.ts -> proxy.ts, export function middleware ->
// export function proxy). Siehe node_modules/next/dist/docs/.../proxy.md.
// Verhalten ist identisch zur klassischen Next.js-Middleware.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // createServerClient (nicht der Browser-Client aus lib/supabase.ts) liest/schreibt
  // die Session über Cookies, die der Proxy server-seitig sehen kann.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // getUser() statt getSession(): validiert den Token gegen Supabase, statt dem
  // (potenziell manipulierbaren) lokal gespeicherten Wert blind zu vertrauen.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname === '/' || pathname === '/login';
  const isDashboardRoute = pathname.startsWith('/dashboard') || pathname.startsWith('/rechnung');

  if (user && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (!user && isDashboardRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    // /impressum und /datenschutz bewusst ausgeschlossen: bleiben für alle ohne
    // Redirect-Prüfung erreichbar. /api handhabt Auth selbst (Bearer-Token statt
    // Cookie), _next/Static-Assets brauchen keine Session-Prüfung.
    '/((?!api|_next/static|_next/image|favicon.ico|impressum|datenschutz).*)',
  ],
};
