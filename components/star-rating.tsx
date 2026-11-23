import React from 'react';
import { Star } from 'lucide-react';

/**
 * Sternebewertung wie bei Google Maps: 5 Sterne, anteilig gefüllt entsprechend
 * `value` (z.B. 3.9 → 3 volle Sterne, ein Stern ~90% gefüllt, ein Stern leer).
 * Wiederverwendbar auf /analytics, /reviews und der Übersichtsseite.
 */
export default function StarRating({
  value,
  size = 16,
  showValue = true,
  className = '',
}: {
  value: number;
  size?: number;
  showValue?: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const fraction = Math.max(0, Math.min(1, clamped - i));
          return (
            <div key={i} className="relative" style={{ width: size, height: size }}>
              {/* Leerer Stern als Basis */}
              <Star size={size} className="absolute inset-0 text-slate-200 fill-slate-200" />
              {/* Gefüllter Stern, anteilig per Breite abgeschnitten */}
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${fraction * 100}%` }}>
                <Star size={size} className="text-amber-400 fill-amber-400" />
              </div>
            </div>
          );
        })}
      </div>
      {showValue && (
        <span className="text-sm font-semibold text-slate-700">{clamped.toFixed(1).replace('.', ',')}</span>
      )}
    </div>
  );
}
