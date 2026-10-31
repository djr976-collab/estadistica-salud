'use client';
import Link from 'next/link';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Icon, type IconName } from '../Icon';
import type { DisplayStatus } from '@/lib/types';

export function PageHeader({ title, subtitle, back, actions }: { title: ReactNode; subtitle?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start gap-3">
      {back && (
        <Link href={back} className="btn-ghost -ml-2 px-2" aria-label="Volver">
          <Icon name="back" className="h-6 w-6" />
        </Link>
      )}
      <div className="min-w-[12rem] flex-1">
        <h1 className="h1 break-words">{title}</h1>
        {subtitle && <div className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '', title, actions }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode }) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="h2">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-slate-500">
      <span className="h-6 w-6 animate-spin rounded-full border-4 border-petrol-200 border-t-petrol-600" />
      <span>{label}</span>
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl border-2 border-red-300 bg-red-50 p-3 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
      <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="flex-1">{error}</p>
      {onRetry && <button className="btn-secondary min-h-[40px]" onClick={onRetry}>Reintentar</button>}
    </div>
  );
}

export function Notice({ tone = 'info', children, icon }: { tone?: 'info' | 'warn' | 'ok' | 'ai'; children: ReactNode; icon?: IconName }) {
  const cls = {
    info: 'border-petrol-200 bg-petrol-50 text-petrol-900 dark:border-petrol-700 dark:bg-petrol-900 dark:text-petrol-50',
    warn: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50',
    ok: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50',
    ai: 'border-violet-300 bg-violet-50 text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-50',
  }[tone];
  const ic: IconName = icon ?? (tone === 'warn' ? 'alert' : tone === 'ok' ? 'check' : tone === 'ai' ? 'shield' : 'info');
  return (
    <div className={`flex gap-3 rounded-xl border p-3 text-sm ${cls}`}>
      <Icon name={ic} className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="flex-1 space-y-1">{children}</div>
    </div>
  );
}

export function Empty({ title, children, icon = 'info' }: { title: string; children?: ReactNode; icon?: IconName }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-600 dark:border-petrol-700 dark:text-slate-300">
      <Icon name={icon} className="h-8 w-8 text-petrol-400" />
      <p className="font-semibold">{title}</p>
      {children}
    </div>
  );
}

export function Field({ label, hint, error, children, required }: { label: string; hint?: ReactNode; error?: string; children: (id: string) => ReactNode; required?: boolean }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}{required && <span className="text-red-700" aria-hidden> *</span>}</label>
      {children(id)}
      {hint && <p className="hint">{hint}</p>}
      {error && <p className="mt-1 text-sm font-semibold text-red-700">{error}</p>}
    </div>
  );
}

export function Select<T extends string>({ id, value, onChange, options, placeholder, required }: {
  id?: string; value: T | ''; onChange: (v: T) => void; options: Record<string, string> | string[][]; placeholder?: string; required?: boolean;
}) {
  const entries = Array.isArray(options) ? options : Object.entries(options);
  return (
    <select id={id} className="input" value={value} required={required} onChange={(e) => onChange(e.target.value as T)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {entries.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([k, v]) => (
        <button key={k} type="button" role="radio" aria-checked={value === k}
          className={`min-h-[44px] rounded-xl border px-3 text-sm font-semibold ${value === k ? 'border-petrol-700 bg-petrol-700 text-white dark:border-turq-500 dark:bg-turq-600' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-petrol-700 dark:bg-petrol-950 dark:text-slate-200'}`}
          onClick={() => onChange(k)}>
          {value === k && <span aria-hidden>✓ </span>}{v}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose}
      className="m-auto w-[min(640px,calc(100vw-1rem))] rounded-2xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-petrol-950/60 dark:border-petrol-700 dark:bg-petrol-900 dark:text-slate-100">
      {open && (
        <div className="flex max-h-[90vh] flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 p-4 dark:border-petrol-700">
            <h2 className="h2">{title}</h2>
            <button className="btn-ghost px-2" onClick={onClose} aria-label="Cerrar"><Icon name="x" /></button>
          </div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">{children}</div>
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 p-4 dark:border-petrol-700">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

const STATUS_META: Record<DisplayStatus, { label: string; cls: string; symbol: string }> = {
  libre: { label: 'Libre', cls: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800', symbol: '○' },
  ocupada: { label: 'Ocupada', cls: 'bg-petrol-100 text-petrol-900 border-petrol-300 dark:bg-petrol-800 dark:text-white dark:border-petrol-600', symbol: '●' },
  bloqueada: { label: 'Bloqueada', cls: 'bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950 dark:text-amber-100 dark:border-amber-800', symbol: '⊘' },
  fuera_servicio: { label: 'Fuera de servicio', cls: 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600', symbol: '✕' },
};
export function StatusPill({ status }: { status: DisplayStatus }) {
  const m = STATUS_META[status];
  return <span className={`chip border ${m.cls}`}><span aria-hidden>{m.symbol}</span>{m.label}</span>;
}
export const statusMeta = STATUS_META;

export function AlertChip({ level, children }: { level: 'alta' | 'media'; children: ReactNode }) {
  return (
    <span className={`chip border ${level === 'alta' ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100' : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100'}`}>
      <span aria-hidden>{level === 'alta' ? '▲' : '◆'}</span>{children}
    </span>
  );
}

export function Stat({ label, value, sub, tone = 'default' }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'default' | 'warn' | 'ok' }) {
  return (
    <div className={`card p-4 ${tone === 'warn' ? 'border-amber-300 dark:border-amber-700' : tone === 'ok' ? 'border-emerald-300 dark:border-emerald-800' : ''}`}>
      <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums text-petrol-900 dark:text-white">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</div>}
    </div>
  );
}

export function KV({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{k}</dt>
          <dd className="break-words">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export const fmtDateTime = (s: string | null | undefined) => s ? new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
export const fmtDate = (s: string | null | undefined) => s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString('es-AR') : '—';
/** Valor para <input type="datetime-local"> en hora local. */
export const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
export const fromLocalInput = (s: string) => new Date(s).toISOString();
