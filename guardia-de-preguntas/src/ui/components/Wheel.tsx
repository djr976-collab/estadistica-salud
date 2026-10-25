import { useEffect, useRef } from 'react';
import type { CategoryDef, CategoryId } from '../../types';
import { CategoryIcon } from './Icons';

export const SPIN_MS = 3200;

interface Props {
  categories: CategoryDef[];
  rotation: number;
  animate: boolean;
  exhausted: Set<CategoryId>;
  highlight: CategoryId | null;
  onSpinEnd: () => void;
}

const R = 140;
function polar(angleDeg: number, r: number): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return [r * Math.sin(a), -r * Math.cos(a)];
}

export function Wheel({ categories, rotation, animate, exhausted, highlight, onSpinEnd }: Props) {
  const ended = useRef(false);
  const rotorRef = useRef<HTMLDivElement>(null);
  const n = categories.length;
  const size = 360 / n;

  useEffect(() => {
    if (!animate) return;
    ended.current = false;
    const finish = () => {
      if (ended.current) return;
      ended.current = true;
      onSpinEnd();
    };
    // Respaldo por si el navegador no emite transitionend (pestaña en segundo plano, etc.).
    const t = window.setTimeout(finish, SPIN_MS + 400);
    const el = rotorRef.current;
    const onEnd = (e: TransitionEvent) => {
      if (e.target === el) finish();
    };
    el?.addEventListener('transitionend', onEnd);
    return () => {
      window.clearTimeout(t);
      el?.removeEventListener('transitionend', onEnd);
    };
  }, [animate, rotation, onSpinEnd]);

  return (
    <div className="wheel" aria-hidden="true">
      <div
        ref={rotorRef}
        className="wheel-rotor"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animate ? `transform ${SPIN_MS}ms cubic-bezier(0.15, 0.7, 0.12, 1)` : 'none',
        }}
      >
        <svg viewBox="-150 -150 300 300" width="100%" height="100%">
          <defs>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#B8C0CC" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#9AA3B0" strokeWidth="4" />
            </pattern>
          </defs>
          <circle r="148" fill="#0E2238" />
          {categories.map((c, i) => {
            const a0 = i * size;
            const a1 = a0 + size;
            const [x0, y0] = polar(a0, R);
            const [x1, y1] = polar(a1, R);
            const [ix, iy] = polar(a0 + size / 2, R * 0.62);
            const [lx, ly] = polar(a0 + size / 2, R * 0.33);
            const off = exhausted.has(c.id);
            const dim = highlight !== null && highlight !== c.id;
            return (
              <g key={c.id} opacity={dim ? 0.45 : 1}>
                <path
                  d={`M0 0 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`}
                  fill={off ? 'url(#hatch)' : c.color}
                  stroke="#0E2238"
                  strokeWidth="3"
                />
                <g transform={`translate(${ix} ${iy}) rotate(${a0 + size / 2}) translate(-17 -17)`} color={off ? '#5B6573' : c.ink}>
                  <CategoryIcon category={c.id} size={34} />
                </g>
                <text
                  x={lx}
                  y={ly}
                  transform={`rotate(${a0 + size / 2} ${lx} ${ly})`}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="20"
                  fontWeight="800"
                  fill={off ? '#5B6573' : c.ink}
                >
                  {c.letter}
                </text>
              </g>
            );
          })}
          <circle r="22" fill="#FFFFFF" stroke="#0E2238" strokeWidth="4" />
          <circle r="7" fill="#0E2238" />
        </svg>
      </div>
      <svg className="wheel-pointer" viewBox="0 0 40 44" width="40" height="44">
        <path d="M20 42L4 8a16 16 0 0 1 32 0z" fill="#FFFFFF" stroke="#0E2238" strokeWidth="3" />
        <circle cx="20" cy="14" r="5" fill="#E8B10A" />
      </svg>
    </div>
  );
}
