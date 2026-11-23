"use client";

// Robuster Ersatz für ein einfaches <Image>: solange unter
// public/images/gruender-foto.jpg noch kein echtes Foto liegt (oder das Bild
// aus einem anderen Grund nicht lädt), wird ein neutraler Platzhalter
// (grauer Kreis + Personen-Icon) angezeigt, statt eines kaputten Bild-Icons
// und Konsolenfehlern. Sobald die echte Datei unter genau diesem Pfad
// abgelegt wird, übernimmt die Komponente sie automatisch – ohne Code-Änderung.

import { useState } from 'react';
import Image from 'next/image';
import { User } from 'lucide-react';

const SIZE_CLASSES = 'w-40 h-40 md:w-48 md:h-48';

export default function FounderPhoto() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${SIZE_CLASSES} rounded-full mx-auto bg-stone-200 border border-stone-200 flex items-center justify-center`}
        role="img"
        aria-label="Platzhalter für Gründerfoto"
      >
        <User size={64} className="text-stone-400" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <Image
      src="/images/gruender-foto.jpg"
      alt="Gründer von Lobbio"
      width={192}
      height={192}
      onError={() => setFailed(true)}
      className={`${SIZE_CLASSES} rounded-full object-cover mx-auto bg-stone-200 border border-stone-200`}
    />
  );
}
