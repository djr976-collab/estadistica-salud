// Iconografía original en SVG (sin emojis). Trazos con currentColor para
// heredar el color del contexto.


type IconProps = { size?: number; className?: string; title?: string };

function Svg({ size = 24, className, title, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

const CATEGORY_PATHS: Record<string, React.ReactNode> = {
  // Corazón con trazo de pulso
  fisiologia: (
    <>
      <path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z" />
      <path d="M6 12.5h3l1.4-2.6 2.2 5 1.4-2.4H18" />
    </>
  ),
  // Frasco ampolla graduado
  farmacologia: (
    <>
      <rect x="8" y="2.8" width="8" height="3.2" rx="1" />
      <path d="M9 6v11.5a3 3 0 0 0 6 0V6" />
      <path d="M9 10.5h3.2M9 13.5h2" />
    </>
  ),
  // Sachet de infusión con goteo
  procedimientos: (
    <>
      <path d="M8 3h8v8.5a4 4 0 0 1-8 0V3z" />
      <path d="M10.3 6.5h3.4M10.3 9h2.2" />
      <path d="M12 15.5v2.2" />
      <path d="M12 19.2c.9 0 1.4.6 1.4 1.2a1.4 1.4 0 0 1-2.8 0c0-.6.5-1.2 1.4-1.2z" />
    </>
  ),
  // Lista de verificación quirúrgica
  quirurgicos: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V2.8h6V4" />
      <path d="M8.5 12.8l2.4 2.4 4.6-5" />
    </>
  ),
  // Escudo con cruz
  seguridad: (
    <>
      <path d="M12 2.8l7.2 3v5.8c0 4.6-3.1 7.8-7.2 9.6-4.1-1.8-7.2-5-7.2-9.6V5.8L12 2.8z" />
      <path d="M12 8.2v6.4M8.8 11.4h6.4" />
    </>
  ),
  // Globo de diálogo con líneas (comunicación y registro)
  valoracion: (
    <>
      <path d="M4 4.8h16v11H10l-4.8 3.6v-3.6H4z" />
      <path d="M7.8 8.6h8.4M7.8 11.8h5.2" />
    </>
  ),
  // Materias del repaso
  // Hueso
  'mat-anatomia': (
    <>
      <path d="M8.2 15.8l7.6-7.6" />
      <path d="M8.2 15.8a2.4 2.4 0 1 1-3.4 2.1 2.4 2.4 0 1 1 1.3-4.2" />
      <path d="M15.8 8.2a2.4 2.4 0 1 1 3.4-2.1 2.4 2.4 0 1 1-1.3 4.2" />
    </>
  ),
  // Molécula (hexágono con enlaces)
  'mat-bioquimica': (
    <>
      <path d="M12 4.5l5.2 3v6l-5.2 3-5.2-3v-6z" />
      <circle cx="12" cy="10.5" r="1.6" />
      <path d="M17.2 13.5l2.6 1.5M6.8 13.5L4.2 15M12 16.5v3" />
    </>
  ),
  // Microorganismo
  'mat-infectologia': (
    <>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3.5V7M12 17v3.5M3.5 12H7M17 12h3.5M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
      <circle cx="10.5" cy="11" r=".9" />
      <circle cx="13.5" cy="13.2" r=".9" />
    </>
  ),
  // Curva epidémica sobre ejes
  'mat-epidemiologia': (
    <>
      <path d="M4 4v16h16" />
      <path d="M6.5 17c2-6 3.5-9 5.5-9s3 4 6 9" />
    </>
  ),
  // Casa con corazón (comunidad)
  'mat-comunitaria': (
    <>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M12 17.2s-3-1.8-3-4a1.6 1.6 0 0 1 3-.9 1.6 1.6 0 0 1 3 .9c0 2.2-3 4-3 4z" />
    </>
  ),
  // Globo de diálogo con «EN»
  'mat-ingles': (
    <>
      <path d="M4 4.8h16v11H10l-4.8 3.6v-3.6H4z" />
      <path d="M7.5 8h2.8M7.5 10.3h2.4M7.5 12.6h2.8M7.5 8v4.6M13 12.6V8l3.4 4.6V8" />
    </>
  ),
};
CATEGORY_PATHS['mat-fisiologia'] = CATEGORY_PATHS.fisiologia;
CATEGORY_PATHS['mat-farmacologia'] = CATEGORY_PATHS.farmacologia;

export function CategoryIcon({ category, ...p }: IconProps & { category: string }) {
  return <Svg {...p}>{CATEGORY_PATHS[category] ?? CATEGORY_PATHS.valoracion}</Svg>;
}

export const Icon = {
  Pause: (p: IconProps) => (
    <Svg {...p}>
      <path d="M9 5v14M15 5v14" />
    </Svg>
  ),
  Play: (p: IconProps) => (
    <Svg {...p}>
      <path d="M8 5l11 7-11 7z" />
    </Svg>
  ),
  Check: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  ),
  Cross: (p: IconProps) => (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  Lock: (p: IconProps) => (
    <Svg {...p}>
      <rect x="5" y="10.5" width="14" height="10" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
    </Svg>
  ),
  Alert: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3.5l9 16H3z" />
      <path d="M12 10v4.5M12 17.3v.2" />
    </Svg>
  ),
  Stop: (p: IconProps) => (
    <Svg {...p}>
      <path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z" />
      <path d="M8.5 12h7" />
    </Svg>
  ),
  Repeat: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 11a8 8 0 0 1 14-5l2 2" />
      <path d="M20 4v4h-4" />
      <path d="M20 13a8 8 0 0 1-14 5l-2-2" />
      <path d="M4 20v-4h4" />
    </Svg>
  ),
  Spark: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </Svg>
  ),
  Book: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20" />
    </Svg>
  ),
  Home: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3.5 11L12 4l8.5 7" />
      <path d="M6 9.5V20h12V9.5" />
    </Svg>
  ),
  Sound: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />
    </Svg>
  ),
  Mute: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </Svg>
  ),
  Copy: (p: IconProps) => (
    <Svg {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8" />
    </Svg>
  ),
  Download: (p: IconProps) => (
    <Svg {...p}>
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </Svg>
  ),
  Wheel: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M4.6 7.8l14.8 8.4M4.6 16.2l14.8-8.4" />
    </Svg>
  ),
  Flag: (p: IconProps) => (
    <Svg {...p}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </Svg>
  ),
  Info: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6v.2" />
    </Svg>
  ),
};
