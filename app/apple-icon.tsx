import { ImageResponse } from 'next/og';

// TODO: Durch finales Markenicon ersetzen. Platzhalter: grüner Hintergrund
// (Lobbio-Akzentfarbe emerald-700) mit weißem "L", 180x180 – deckt die von
// iOS/iPadOS beim Laden angefragten apple-touch-icon-Größen automatisch ab
// (Next.js bindet diese Datei-Konvention ohne zusätzliche <link>-Tags ein).
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#047857',
          color: 'white',
          fontSize: 108,
          fontWeight: 700,
          fontFamily: 'sans-serif',
        }}
      >
        L
      </div>
    ),
    { ...size }
  );
}
