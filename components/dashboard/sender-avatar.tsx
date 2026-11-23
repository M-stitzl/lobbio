import React from 'react';
import { getInitials } from '@/lib/message-display';

// Gemeinsame Avatar-Darstellung für Nachrichten mit bekanntem/unbekanntem
// Absender, verwendet auf der Dashboard-Übersicht und der Nachrichten-Seite:
// farbig bei verifiziertem Gast, grau bei nur extrahiertem (unverifiziertem)
// Namen, neutral mit Fallback-Icon, wenn gar kein Name vorliegt. Kanal-Icon
// als kleines Eck-Badge.
export function SenderAvatar({
  name,
  verified,
  hasName,
  ChannelIcon,
  fallbackIcon,
  showChannelBadge = true,
}: {
  name: string;
  verified: boolean;
  hasName: boolean;
  ChannelIcon: React.ElementType;
  fallbackIcon: React.ReactNode;
  // Auf der Dashboard-Übersicht steht das Kanal-Icon nicht mehr als
  // Eck-Badge am Avatar, sondern eigenständig zentriert in der unteren
  // Kartenzeile (siehe dortiges Layout) – dort wird die Ecke ausgeblendet.
  showChannelBadge?: boolean;
}) {
  return (
    <div className="relative shrink-0 mt-0.5">
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
          verified
            ? 'bg-emerald-100 text-emerald-700'
            : hasName
              ? 'bg-slate-200 text-slate-500'
              : 'bg-slate-100 text-slate-400'
        }`}
      >
        {hasName ? getInitials(name) : fallbackIcon}
      </div>
      {showChannelBadge && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center">
          <ChannelIcon size={9} className="text-slate-500" />
        </div>
      )}
    </div>
  );
}

// Dezentes "Nicht zugeordnet"-Badge für Namen, die zwar extrahiert, aber
// keinem Gast-Datensatz zugeordnet werden konnten.
export function UnassignedBadge() {
  return (
    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border bg-slate-100 text-slate-500 border-slate-200">
      Nicht zugeordnet
    </span>
  );
}
