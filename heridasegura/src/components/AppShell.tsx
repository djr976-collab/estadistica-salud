'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useApp } from './AppProvider';
import { Icon, type IconName } from './Icon';
import { Spinner } from './ui';

const NAV: { href: string; label: string; icon: IconName; roles?: string[] }[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/servicios', label: 'Camas', icon: 'bed' },
  { href: '/pacientes', label: 'Pacientes', icon: 'users' },
  { href: '/indicadores', label: 'Indicadores', icon: 'chart' },
  { href: '/reportes', label: 'Reportes', icon: 'file' },
  { href: '/guia', label: 'Guía clínica', icon: 'info' },
  { href: '/admin', label: 'Administración', icon: 'settings', roles: ['admin'] },
];
const MOBILE = ['/', '/servicios', '/pacientes', '/indicadores', '/mas'];

const ROLE_LABEL = { admin: 'Administración', supervisor: 'Supervisión', enfermero: 'Enfermería' } as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, ready, repo, setProfile, online, theme, toggleTheme, settings } = useApp();
  const path = usePathname();
  const router = useRouter();

  if (path === '/login') return <>{children}</>;
  if (!ready || !profile) return <Spinner label="Verificando sesión…" />;

  const items = NAV.filter((n) => !n.roles || n.roles.includes(profile.role));
  const active = (href: string) => (href === '/' ? path === '/' : path.startsWith(href));
  const logout = async () => {
    await repo.signOut();
    try { sessionStorage.clear(); } catch { /* noop */ }
    setProfile(null); router.replace('/login');
  };

  return (
    <div className="min-h-screen md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-2">Saltar al contenido</a>
      {/* Barra lateral (tablet/escritorio) */}
      <aside className="no-print hidden w-64 shrink-0 flex-col bg-petrol-900 text-white md:flex">
        <div className="flex items-center gap-3 px-5 py-5">
          <Logo />
          <div>
            <div className="text-lg font-bold leading-tight">HeridaSegura <span className="text-turq-300">IA</span></div>
            <div className="text-xs text-petrol-200">Valoración y seguimiento de heridas</div>
          </div>
        </div>
        <nav aria-label="Principal" className="flex-1 space-y-1 px-3">
          {items.map((n) => (
            <Link key={n.href} href={n.href} aria-current={active(n.href) ? 'page' : undefined}
              className={`flex min-h-[48px] items-center gap-3 rounded-xl px-3 font-semibold ${active(n.href) ? 'bg-turq-500 text-petrol-950' : 'text-petrol-100 hover:bg-petrol-800'}`}>
              <Icon name={n.icon} />{n.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-petrol-800 p-4 text-sm">
          <div className="font-semibold">{profile.full_name}</div>
          <div className="text-petrol-200">{ROLE_LABEL[profile.role]}</div>
          <button onClick={logout} className="mt-3 flex min-h-[44px] w-full items-center gap-2 rounded-xl px-3 font-semibold text-petrol-100 hover:bg-petrol-800">
            <Icon name="logout" />Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-petrol-800 dark:bg-petrol-900/95">
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="flex items-center gap-2 md:hidden"><Logo small /><span className="font-bold text-petrol-900 dark:text-white">HeridaSegura</span></div>
            <div className="hidden min-w-0 flex-1 truncate text-sm text-slate-600 dark:text-slate-300 md:block">{settings.hospital_name} · {settings.hospital_city}</div>
            <div className="flex-1 md:hidden" />
            {repo.mode === 'demo' && <span className="chip border border-amber-400 bg-amber-100 text-amber-950" title="Datos ficticios guardados solo en este navegador">DEMO · datos ficticios</span>}
            {!online && <span className="chip border border-red-300 bg-red-100 text-red-900"><Icon name="wifiOff" className="h-4 w-4" />Sin conexión</span>}
            <button className="btn-ghost px-2" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}>
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            </button>
          </div>
          {!online && (
            <div role="alert" className="bg-red-700 px-4 py-2 text-sm font-semibold text-white">
              Conexión interrumpida. No se guardarán registros hasta recuperar la conexión; los formularios en curso se conservan en esta pantalla.
            </div>
          )}
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-4 md:pb-10">{children}</main>
      </div>

      {/* Navegación inferior (celular) */}
      <nav aria-label="Principal móvil" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-petrol-800 dark:bg-petrol-900 md:hidden">
        {MOBILE.map((href) => {
          const n = href === '/mas' ? { href, label: 'Más', icon: 'menu' as IconName } : NAV.find((x) => x.href === href)!;
          const isActive = href === '/mas' ? ['/reportes', '/admin', '/guia', '/mas'].some((p) => path.startsWith(p)) : active(href);
          return (
            <Link key={href} href={href} aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-xs font-semibold ${isActive ? 'text-petrol-700 dark:text-turq-300' : 'text-slate-500 dark:text-slate-400'}`}>
              <span className={`rounded-full px-4 py-1 ${isActive ? 'bg-petrol-100 dark:bg-petrol-800' : ''}`}><Icon name={n.icon} className="h-6 w-6" /></span>
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Logo({ small }: { small?: boolean }) {
  const s = small ? 'h-8 w-8' : 'h-11 w-11';
  return (
    <svg viewBox="0 0 64 64" className={s} aria-hidden>
      <rect width="64" height="64" rx="16" fill="#0f3d48" />
      <path d="M32 50s-15-8.6-15-20.3A8.7 8.7 0 0 1 32 24a8.7 8.7 0 0 1 15 5.7C47 41.4 32 50 32 50z" fill="#2cc8b6" />
      <path d="M28 33h8m-4-4v8" stroke="#0f3d48" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
