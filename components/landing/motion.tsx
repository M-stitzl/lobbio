"use client";

// Gemeinsame, dezente Scroll-Reveal- und Stagger-Bausteine für die
// Landingpage (Vorbild Stripe/Linear/Vercel: kurz, ruhig, ohne Effekthascherei).
// `useReducedMotion` wird über `MotionConfig reducedMotion="user"` in
// `motion-config.tsx` global respektiert – hier keine zusätzliche Logik nötig.

import { motion, type Variants, type HTMLMotionProps } from 'framer-motion';
import type { ReactNode } from 'react';

// MOTION_INTENSITY: 4 (ruhig/editorial) – kleinerer y-Versatz, etwas
// längere Dauer als zuvor, kein Bounce/Spring. Bewegung dient hier nur der
// Reihenfolge des Erscheinens (Storytelling-Hierarchie), nicht der Show.
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

type RevealProps = HTMLMotionProps<'div'> & { children: ReactNode; delay?: number };

/** Blendet einen einzelnen Block beim Scrollen sanft ein (einmalig). */
export function Reveal({ children, delay = 0, ...props }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.25 }}
      variants={{
        hidden: fadeUp.hidden,
        visible: { ...(fadeUp.visible as object), transition: { duration: 0.5, ease: 'easeOut', delay } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Container für mehrere Kinder, die leicht versetzt nacheinander erscheinen. */
export function StaggerGroup({ children, ...props }: HTMLMotionProps<'div'> & { children: ReactNode }) {
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={staggerContainer} {...props}>
      {children}
    </motion.div>
  );
}

/** Einzelnes Kind innerhalb einer StaggerGroup. */
export function StaggerItem({ children, ...props }: HTMLMotionProps<'div'> & { children: ReactNode }) {
  return (
    <motion.div variants={fadeUp} {...props}>
      {children}
    </motion.div>
  );
}
