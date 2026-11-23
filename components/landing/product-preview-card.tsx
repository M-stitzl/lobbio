import { Sparkles, type LucideIcon } from 'lucide-react';

export type PreviewField = {
  label: string;
  value: string;
  icon: LucideIcon;
  iconClassName?: string;
};

export type PreviewTabContent = {
  eyebrow: string;
  // Exakt 6 Felder, im 2-spaltigen Grid gerendert (Gast/Erkannt durch, Kanal/
  // Kategorie, Nachricht/Antwortentwurf – bzw. das jeweilige Pendant je Tab).
  fields: [PreviewField, PreviewField, PreviewField, PreviewField, PreviewField, PreviewField];
};

export default function ProductPreviewCard({ content }: { content: PreviewTabContent }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1.5 mb-3 text-emerald-700">
        <Sparkles size={15} />
        <span className="text-xs font-semibold uppercase tracking-wider">Lobbio Dashboard</span>
      </div>

      {/* Gleicher Card-Stil wie im Dashboard: bg-white, rounded-xl, border-slate-200, shadow-sm.
          Bei Hover nur ein dezenter Schatten-Zuwachs, kein Anheben – die Karte
          ist der zentrale Blickfang und soll ruhig wirken. */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100">
          <p className="text-sm font-medium text-stone-700">{content.eyebrow}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-stone-100">
          {content.fields.map((field, i) => {
            const Icon = field.icon;
            // Rahmen zwischen den beiden Spalten + zwischen den Zeilen, im
            // selben dezenten slate-100-Ton wie sonst im Dashboard.
            const isLeftColumn = i % 2 === 0;
            return (
              <div
                key={field.label}
                className={`px-5 py-4 ${isLeftColumn ? 'sm:border-r border-stone-100' : ''} ${
                  i >= 2 ? 'sm:border-t border-stone-100' : ''
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-400 mb-1.5">{field.label}</p>
                <div className="flex items-start gap-2">
                  <Icon size={15} className={`shrink-0 mt-0.5 ${field.iconClassName ?? 'text-emerald-600'}`} />
                  <p className="text-sm text-stone-700 leading-snug">{field.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
