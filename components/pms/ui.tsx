'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

// Gemeinsame Bausteine der PMS-Seiten – gleiche Sprache wie das bestehende
// Dashboard (Slate-Neutrals, Emerald als Aktionsfarbe, rounded-xl Panels).

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 shrink-0">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-slate-800 text-balance">{title}</h1>
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className = '', bodyClassName = '' }: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col min-w-0 ${className}`}>
      {(title || actions) && (
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          {title && <h2 className="text-base font-bold text-slate-800">{title}</h2>}
          {actions}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANT: Record<Variant, string> = {
  primary: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-white text-red-700 border border-red-200 hover:bg-red-50',
};

export function Button({ variant = 'secondary', loading, children, className = '', size = 'md', ...props }:
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; size?: 'sm' | 'md' }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600
        disabled:opacity-50 disabled:cursor-not-allowed
        ${size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${VARIANT[variant]} ${className}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className = '' }: {
  label: string; hint?: string; error?: string | null; children: React.ReactNode; className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${className}`}>
      <span className="font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="text-xs text-slate-500">{hint}</span>}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </label>
  );
}

export const inputClass =
  'min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 disabled:bg-slate-50 disabled:text-slate-500';

export function Chip({ tone = 'slate', children }: { tone?: 'slate' | 'emerald' | 'amber' | 'red' | 'sky' | 'violet'; children: React.ReactNode }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200',
    amber: 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200',
    red: 'bg-red-50 text-red-800 ring-1 ring-inset ring-red-200',
    sky: 'bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200',
    violet: 'bg-violet-50 text-violet-800 ring-1 ring-inset ring-violet-200',
  } as const;
  return <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 gap-2">
      <div className="text-slate-300">{icon}</div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {children && <div className="text-sm text-slate-500 max-w-sm">{children}</div>}
    </div>
  );
}

export function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-100" aria-busy="true" aria-label="Wird geladen">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-4 flex gap-3 items-center">
          <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-slate-100 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Notice({ tone, children }: { tone: 'error' | 'success' | 'info'; children: React.ReactNode }) {
  const cls = {
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    info: 'bg-sky-50 border-sky-200 text-sky-800',
  }[tone];
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>;
}

/** Seitliches Detailpanel (statt Modal) – bleibt neben der Liste sichtbar. */
export function Drawer({ open, onClose, title, children, footer }: {
  open: boolean; onClose: () => void; title: React.ReactNode; children: React.ReactNode; footer?: React.ReactNode;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside role="dialog" aria-modal="true" className="relative h-full w-full max-w-xl bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0 text-lg font-bold text-slate-800">{title}</div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100" aria-label="Schließen">Schließen</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap justify-end gap-2">{footer}</div>}
      </aside>
    </div>
  );
}
