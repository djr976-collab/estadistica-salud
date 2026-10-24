import { useEffect, useRef } from 'react';
import { bank, DIFFICULTY_LABEL, FORMAT_LABEL, REVIEW_STATUS_LABEL } from '../../content/bank';
import type { CategoryId, Question } from '../../types';
import { CategoryIcon, Icon } from './Icons';

/** Encabezado de pantalla que recibe el foco al montarse (navegación con teclado y lectores). */
export function ScreenTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <h1 ref={ref} tabIndex={-1} className={`screen-title ${className ?? ''}`}>
      {children}
    </h1>
  );
}

export function CategoryChip({ category, short = false }: { category: CategoryId; short?: boolean }) {
  const c = bank.categoryById[category];
  return (
    <span className="chip chip-cat" style={{ '--cat': c.color, '--cat-soft': c.colorSoft } as React.CSSProperties}>
      <CategoryIcon category={category} size={16} />
      {short ? c.shortName : c.name}
    </span>
  );
}

export function QuestionMeta({ q }: { q: Question }) {
  return (
    <div className="meta-row">
      <CategoryChip category={q.category} short />
      <span className="chip">{DIFFICULTY_LABEL[q.difficulty]}</span>
      <span className="chip">{FORMAT_LABEL[q.format]}</span>
      {q.criticalSafety ? (
        <span className="chip chip-critical">
          <Icon.Alert size={14} /> Riesgo crítico
        </span>
      ) : null}
    </div>
  );
}

export function ReviewStatusNote({ q }: { q: Question }) {
  return (
    <p className={`review-status review-${q.reviewStatus}`}>
      <Icon.Info size={14} /> {REVIEW_STATUS_LABEL[q.reviewStatus]}
    </p>
  );
}

export function BadgeMedal({ category, earned, size = 56 }: { category: CategoryId; earned: boolean; size?: number }) {
  const c = bank.categoryById[category];
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={`${c.badgeName}${earned ? ' (obtenida)' : ' (pendiente)'}`}>
      <path
        d="M32 3l7 5.5 8.8-.6 3 8.3 7.7 4.3-1.6 8.7 4 7.8-6 6.4-.2 8.8-8.5 2.3-4.8 7.4L32 58l-9.3 3.8-4.8-7.4-8.5-2.3-.2-8.8-6-6.4 4-7.8-1.6-8.7 7.7-4.3 3-8.3 8.8.6z"
        fill={earned ? c.color : '#DDE3EA'}
        stroke={earned ? '#0E2238' : '#B9C2CD'}
        strokeWidth="2"
      />
      <circle cx="32" cy="32" r="17" fill={earned ? '#FFFFFF' : '#EEF2F6'} />
      <g transform="translate(18 18)" color={earned ? c.color : '#A3ADBA'}>
        <CategoryIcon category={category} size={28} />
      </g>
    </svg>
  );
}

export function SourcesList({ q }: { q: Question }) {
  return (
    <ul className="sources">
      {q.sources.map((s) => {
        const src = bank.sources.get(s.ref);
        if (!src) return null;
        return (
          <li key={s.ref + s.section}>
            <span className="src-title">{src.title}</span>
            <span className="src-meta">
              {src.organization}
              {src.year ? ` (${src.year})` : ''} · Apartado: {s.section}
            </span>
            {src.url ? (
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="src-link">
                Abrir fuente (requiere conexión)
              </a>
            ) : (
              <span className="src-meta">Sin enlace: {src.verification}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
