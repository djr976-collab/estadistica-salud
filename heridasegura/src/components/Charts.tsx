'use client';
// Gráficos SVG livianos y accesibles (incluyen tabla/texto alternativo).

export interface Point { x: Date; y: number | null; label?: string; comparable?: boolean }

export function LineChart({ points, unit, title, height = 200, yMin, yMax, bands }: {
  points: Point[]; unit: string; title: string; height?: number; yMin?: number; yMax?: number;
  bands?: { from: number; to: number; label: string; cls: string }[];
}) {
  const valid = points.filter((p) => p.y != null) as (Point & { y: number })[];
  if (valid.length === 0) return <p className="text-sm text-slate-500">Sin datos medibles para graficar.</p>;
  const W = 640, H = height, P = { l: 44, r: 16, t: 14, b: 34 };
  const xs = valid.map((p) => p.x.getTime());
  const x0 = Math.min(...xs), x1 = Math.max(...xs) === x0 ? x0 + 86_400_000 : Math.max(...xs);
  const lo = yMin ?? Math.min(0, ...valid.map((p) => p.y));
  const hi = yMax ?? (Math.max(...valid.map((p) => p.y)) * 1.15 || 1);
  const X = (t: number) => P.l + ((t - x0) / (x1 - x0)) * (W - P.l - P.r);
  const Y = (v: number) => H - P.b - ((v - lo) / (hi - lo)) * (H - P.t - P.b);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + ((hi - lo) * i) / 4);
  const path = valid.map((p, i) => `${i ? 'L' : 'M'}${X(p.x.getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join(' ');
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${valid.map((p) => `${p.x.toLocaleDateString('es-AR')} ${p.y} ${unit}`).join('; ')}`}>
        {bands?.map((b) => <rect key={b.label} x={P.l} width={W - P.l - P.r} y={Y(Math.min(b.to, hi))} height={Math.max(0, Y(Math.max(b.from, lo)) - Y(Math.min(b.to, hi)))} className={b.cls} />)}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} className="stroke-slate-200 dark:stroke-petrol-800" />
            <text x={P.l - 6} y={Y(t) + 4} textAnchor="end" className="fill-slate-500 text-[11px]">{Math.round(t * 10) / 10}</text>
          </g>
        ))}
        <path d={path} fill="none" className="stroke-petrol-600 dark:stroke-turq-400" strokeWidth={3} />
        {valid.map((p, i) => (
          <g key={i}>
            {p.comparable === false
              ? <rect x={X(p.x.getTime()) - 6} y={Y(p.y) - 6} width={12} height={12} className="fill-amber-400 stroke-amber-800" strokeWidth={1.5}><title>Medición no comparable con la anterior</title></rect>
              : <circle cx={X(p.x.getTime())} cy={Y(p.y)} r={6} className="fill-white stroke-petrol-700 dark:fill-petrol-950 dark:stroke-turq-300" strokeWidth={3} />}
            <text x={X(p.x.getTime())} y={H - 12} textAnchor="middle" className="fill-slate-500 text-[11px]">{p.x.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</text>
          </g>
        ))}
        <text x={4} y={12} className="fill-slate-500 text-[11px]">{unit}</text>
      </svg>
      {valid.some((p) => p.comparable === false) && <figcaption className="text-xs text-amber-800 dark:text-amber-300">■ Punto cuadrado: medición obtenida con un método distinto; no comparable con la anterior.</figcaption>}
    </figure>
  );
}

export function BarList({ data, labels, total }: { data: Record<string, number>; labels?: Record<string, string>; total?: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <p className="text-sm text-slate-500">Sin datos.</p>;
  const max = Math.max(...entries.map((e) => e[1]));
  return (
    <ul className="space-y-2">
      {entries.map(([k, v]) => (
        <li key={k}>
          <div className="flex justify-between gap-2 text-sm"><span className="truncate">{labels?.[k] ?? k}</span><span className="font-bold tabular-nums">{v}{total ? ` (${Math.round((v / total) * 100)} %)` : ''}</span></div>
          <div className="mt-1 h-3 rounded-full bg-slate-100 dark:bg-petrol-800"><div className="h-3 rounded-full bg-petrol-600 dark:bg-turq-500" style={{ width: `${(v / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
