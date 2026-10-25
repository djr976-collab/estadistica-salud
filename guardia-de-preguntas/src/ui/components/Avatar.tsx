// Avatares de estudiantes: chaqueta de ambo blanca, pantalón rojo, calzado
// cerrado, sin cofia y con un espacio reemplazable para el emblema
// institucional autorizado (config.json → emblem.src).

import { bank } from '../../content/bank';

export interface AvatarDef {
  id: string;
  label: string;
  skin: string;
  hair: string;
  style: 'corto' | 'rodete' | 'rulos' | 'lacio';
}

export const AVATARS: AvatarDef[] = [
  { id: 'a1', label: 'Avatar 1: pelo corto oscuro', skin: '#F2C9A6', hair: '#2E2420', style: 'corto' },
  { id: 'a2', label: 'Avatar 2: pelo recogido en rodete', skin: '#C98B5B', hair: '#3B2416', style: 'rodete' },
  { id: 'a3', label: 'Avatar 3: pelo con rulos', skin: '#8A5532', hair: '#1D1411', style: 'rulos' },
  { id: 'a4', label: 'Avatar 4: pelo lacio por los hombros', skin: '#E6B583', hair: '#6B4226', style: 'lacio' },
];

export function avatarById(id: string): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

function Hair({ a }: { a: AvatarDef }) {
  switch (a.style) {
    case 'corto':
      return <path d="M44 34c0-11 8-17 16-17s16 6 16 17c-3-5-9-8-16-8s-13 3-16 8z" fill={a.hair} />;
    case 'rodete':
      return (
        <>
          <circle cx="60" cy="13" r="7" fill={a.hair} />
          <path d="M43 36c0-12 8-19 17-19s17 7 17 19c-2-6-9-10-17-10s-15 4-17 10z" fill={a.hair} />
        </>
      );
    case 'rulos':
      return (
        <g fill={a.hair}>
          {[
            [46, 28],
            [52, 21],
            [60, 18],
            [68, 21],
            [74, 28],
            [44, 36],
            [76, 36],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="7" />
          ))}
        </g>
      );
    case 'lacio':
      return <path d="M42 50V35c0-11 8-18 18-18s18 7 18 18v15h-5V36c-4-5-8-7-13-7s-9 2-13 7v14z" fill={a.hair} />;
  }
}

export function Avatar({ id, size = 96, decorative = false }: { id: string; size?: number; decorative?: boolean }) {
  const a = avatarById(id);
  const emblem = bank.config.emblem;
  return (
    <svg
      width={size}
      height={(size * 160) / 120}
      viewBox="0 0 120 160"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : a.label}
      className="avatar"
    >
      {/* Calzado cerrado */}
      <rect x="38" y="146" width="20" height="9" rx="4" fill="#2B2F36" />
      <rect x="62" y="146" width="20" height="9" rx="4" fill="#2B2F36" />
      {/* Pantalón rojo */}
      <path d="M41 100h38l-2 48H63l-3-34-3 34H43z" fill="#C4202F" />
      {/* Brazos */}
      <rect x="25" y="66" width="11" height="36" rx="5.5" fill={a.skin} />
      <rect x="84" y="66" width="11" height="36" rx="5.5" fill={a.skin} />
      {/* Chaqueta de ambo blanca (mangas cortas) */}
      <path d="M38 58h44l12 10-6 9-6-4v33H38V73l-6 4-6-9z" fill="#FFFFFF" stroke="#C9D1DC" strokeWidth="1.5" />
      <path d="M52 58l8 12 8-12" fill="none" stroke="#C9D1DC" strokeWidth="1.5" />
      <rect x="44" y="88" width="10" height="9" rx="1.5" fill="none" stroke="#C9D1DC" strokeWidth="1.2" />
      {/* Espacio para emblema institucional */}
      {emblem.src ? (
        <image href={emblem.src} x="67" y="74" width="12" height="12" />
      ) : (
        <circle cx="73" cy="80" r="5.5" fill="none" stroke="#9AA6B5" strokeWidth="1.2" strokeDasharray="2 1.6" />
      )}
      {/* Cuello y cabeza */}
      <rect x="55" y="50" width="10" height="10" rx="3" fill={a.skin} />
      <circle cx="60" cy="37" r="16" fill={a.skin} />
      <Hair a={a} />
      <circle cx="54.5" cy="39" r="1.8" fill="#26211E" />
      <circle cx="65.5" cy="39" r="1.8" fill="#26211E" />
      <path d="M55 45.5c3 2.4 7 2.4 10 0" fill="none" stroke="#26211E" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Docente guardián provisional: emblema abstracto, sin rasgos de una persona real. */
export function GuardianEmblem({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 72 72" role="img" aria-label="Emblema del docente guardián (provisional)">
      <defs>
        <linearGradient id="gd-g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#123B6D" />
          <stop offset="1" stopColor="#1E6FB8" />
        </linearGradient>
      </defs>
      <path d="M36 4l26 10v18c0 17-11 28-26 36C21 60 10 49 10 32V14z" fill="url(#gd-g)" />
      {/* Lámpara: símbolo del cuidado */}
      <path d="M24 44h24c-2 5-7 8-12 8s-10-3-12-8z" fill="#FFD27A" />
      <path d="M44 44c3-1 6-3 7-6" fill="none" stroke="#FFD27A" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M36 40c-4-3-4-8 0-14 4 6 4 11 0 14z" fill="#FFFFFF" />
    </svg>
  );
}
