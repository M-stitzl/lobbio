import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import SessionProviderWrapper from '@/component/SessionProviderWrapper';
import './globals.css';

// Einzige Schriftart der gesamten App (Dashboard + Website), einmalig hier im
// Root-Layout eingebunden. `variable` legt die CSS-Variable --font-inter an,
// die in globals.css von --font-sans/--font-serif referenziert wird – damit
// gilt Inter automatisch überall, wo bisher schon die Tailwind-Klasse
// `font-sans` verwendet wird, ohne next/fonts eigene generierte Klasse
// zusätzlich anwenden zu müssen. `display: 'swap'` verhindert unsichtbaren
// Text während des Ladens; nur das `latin`-Subset, da die App rein deutsch ist.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Lobbio',
  description: 'Lobbio bündelt Gästenachrichten und Bewertungen für familiengeführte Hotels im Chiemgau.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body className="bg-slate-50 text-slate-800 font-sans">
        {/* SessionProvider bleibt am Root, da /login (NextAuth-Google-Connect) und
            das Dashboard beide useSession() brauchen. Das bisherige Dashboard-Shell
            (Sidebar/KI-Empfehlungen/feste Höhe+Overflow) ist jetzt in
            app/dashboard/layout.tsx, damit die Landingpage normal scrollen kann. */}
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
