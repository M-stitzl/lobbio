import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Erlaubt den Zugriff auf den Dev-Server über die lokale Netzwerk-Adresse
  // (z. B. zum Testen auf einem iPad/Handy im selben WLAN). Next.js blockiert
  // das im Entwicklungsmodus sonst standardmäßig aus Sicherheitsgründen.
  // Die Adresse kommt aus DEV_ALLOWED_ORIGIN in .env.local (z. B. 192.168.0.10).
  allowedDevOrigins: process.env.DEV_ALLOWED_ORIGIN ? [process.env.DEV_ALLOWED_ORIGIN] : [],
  // Next.js 16 lehnt next/image-Anfragen mit einer `quality`, die hier nicht
  // gelistet ist, ab ("failed to pipe response") statt sie nur zu warnen.
  // 90 wird für den Dashboard-Screenshot im Funktionsüberblick verwendet.
  images: {
    qualities: [75, 90],
  },
};

export default nextConfig;
