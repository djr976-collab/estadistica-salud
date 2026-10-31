// Íconos SVG en línea (sin dependencias). Siempre acompañar con texto visible o aria-label.
const P: Record<string, string> = {
  home: 'M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z',
  bed: 'M3 18v-7a2 2 0 0 1 2-2h5v5h11v4M3 14h18M7 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4M3 18v2M21 18v2',
  users: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  file: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6m7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.2-1.3L14.3 3h-4l-.4 2.4a7.5 7.5 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.5 7.5 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m10 2-4.3-4.3',
  plus: 'M12 5v14M5 12h14',
  camera: 'M3 8a2 2 0 0 1 2-2h2l2-2h6l2 2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0',
  check: 'm5 13 4 4L19 7',
  x: 'M18 6 6 18M6 6l12 12',
  chevron: 'm9 18 6-6-6-6',
  back: 'm15 18-6-6 6-6',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  wifiOff: 'm2 2 20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.6a10 10 0 0 1 5.2-2.6M19 12.6a10 10 0 0 0-2.2-1.6M2 8.8a15 15 0 0 1 4.2-2.7M22 8.8A15 15 0 0 0 10.7 5M12 20h.01',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  rotate: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5',
  crop: 'M6 2v14a2 2 0 0 0 2 2h14M18 22V8a2 2 0 0 0-2-2H2',
  ruler: 'M21.3 8.7 8.7 21.3a1 1 0 0 1-1.4 0l-4.6-4.6a1 1 0 0 1 0-1.4L15.3 2.7a1 1 0 0 1 1.4 0l4.6 4.6a1 1 0 0 1 0 1.4M7.5 10.5l2 2m1-5 2 2m1-5 2 2m-10 7 2 2',
  compare: 'M12 3v18M4 7h5v10H4zm11 0h5v10h-5z',
  download: 'M12 3v12m0 0-4-4m4 4 4-4M4 21h16',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-6v-4m0-4h.01',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10',
  move: 'M5 9 2 12l3 3M9 5l3-3 3 3m0 14-3 3-3-3m10-10 3 3-3 3M2 12h20M12 2v20',
  exit: 'M10 17 15 12l-5-5M15 12H3m9-9h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20m0-15v5l3 3',
  heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8',
  menu: 'M3 6h18M3 12h18M3 18h18',
  zoom: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16m10 2-4.3-4.3M11 8v6m-3-3h6',
};
export type IconName = keyof typeof P;
export function Icon({ name, className = 'h-5 w-5', label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden={label ? undefined : true} role={label ? 'img' : undefined} aria-label={label}>
      <path d={P[name]} />
    </svg>
  );
}
