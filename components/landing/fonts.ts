import { Source_Serif_4 } from 'next/font/google';

// Nur für die öffentliche Startseite (nicht das Dashboard): editorialer
// Serifen-Kontrast zu Inter, ausschließlich für große Überschriften. Eigene
// CSS-Variable statt globalem --font-serif-Token in globals.css, damit die
// Änderung strikt auf die Landingpage begrenzt bleibt und Inter im Rest der
// App (Dashboard) unangetastet bleibt.
export const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-serif-display',
  display: 'swap',
});
