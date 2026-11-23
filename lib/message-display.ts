// Gemeinsame Anzeige-Logik für Absendernamen, verwendet sowohl von der
// Dashboard-Übersicht ("Heute eingegangene Anfragen") als auch von der
// Nachrichten-Seite. Zuvor lokal auf beiden Seiten dupliziert – das führte
// dazu, dass die Übersichtsseite die extracted_sender_name-Logik aus dem
// vorherigen Prompt nicht mitbekam. Jetzt eine einzige Quelle.
export type SenderDisplay = {
  name: string;
  verified: boolean;
  hasName: boolean;
};

export function resolveSenderDisplay(msg: {
  guests: { name: string } | null;
  extracted_sender_name: string | null;
  external_sender_email: string | null;
}): SenderDisplay {
  if (msg.guests?.name) return { name: msg.guests.name, verified: true, hasName: true };
  if (msg.extracted_sender_name) return { name: msg.extracted_sender_name, verified: false, hasName: true };
  return { name: msg.external_sender_email ?? 'Unbekannter Absender', verified: false, hasName: false };
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
