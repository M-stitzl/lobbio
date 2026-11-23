"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { label: 'Funktionen', href: '#funktionen' },
  { label: 'Über uns', href: '#ueber-uns' },
  { label: 'Kontakt', href: '#kontakt' },
];

export default function LandingHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeHref, setActiveHref] = useState<string | null>(null);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Scrollspy: markiert den Nav-Link zum Abschnitt, der sich gerade im
  // vertikalen Zentrum des Viewports befindet. rootMargin "-40%/-40%" spannt
  // einen schmalen Streifen um die Bildschirmmitte auf, statt bei jedem
  // Antippen des oberen/unteren Bildschirmrands umzuspringen.
  useEffect(() => {
    const sections = NAV_LINKS.map((link) => document.querySelector(link.href)).filter(
      (el): el is Element => el !== null
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHref(`#${entry.target.id}`);
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: 0 }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 bg-stone-50/95 backdrop-blur-sm border-b transition-all duration-200 ${
        scrolled ? 'shadow-sm border-stone-200' : 'border-transparent'
      }`}
    >
      <div
        className={`max-w-6xl mx-auto px-4 md:px-6 flex items-center justify-between transition-all duration-200 ${
          scrolled ? 'h-14' : 'h-16'
        }`}
      >
        <Link href="/" className="text-xl font-bold text-emerald-800">
          Lobbio
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors duration-200 ${
                activeHref === link.href
                  ? 'font-semibold text-emerald-700'
                  : 'text-stone-600 hover:text-emerald-700'
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors">
            Anmelden
          </Link>
          {/* Ruhige Buttons: reine Farb-/Deckkraft-Übergänge statt Scale-Bounce
              auf Hover/Tap (siehe motion.tsx-Kommentar für die Gesamtbegründung). */}
          <a
            href="#kontakt"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 hover:bg-emerald-800 active:translate-y-px text-white transition-colors"
          >
            Gespräch vereinbaren
          </a>
        </div>

        <button
          className="md:hidden p-2 text-stone-600"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menü öffnen"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-stone-200 bg-stone-50 px-4 py-4 space-y-3">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm text-stone-600 py-1"
            >
              {link.label}
            </a>
          ))}
          <Link href="/login" onClick={() => setMobileOpen(false)} className="block text-sm text-stone-600 py-1">
            Anmelden
          </Link>
          <a
            href="#kontakt"
            onClick={() => setMobileOpen(false)}
            className="block px-4 py-2 text-sm font-medium rounded-lg bg-emerald-700 text-white text-center mt-2"
          >
            Gespräch vereinbaren
          </a>
        </div>
      )}
    </header>
  );
}
