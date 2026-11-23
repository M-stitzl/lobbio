"use client";

// Aktiviert `prefers-reduced-motion` für alle framer-motion-Animationen der
// Landingpage: Nutzer mit reduzierten Bewegungseinstellungen im Betriebssystem
// sehen automatisch keine (bzw. stark verkürzte) Animationen. Pflicht laut
// Vorgabe, kein Nice-to-have.

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

export default function LandingMotionConfig({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
