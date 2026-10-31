'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getRepo } from '@/lib/data';
import type { Repo } from '@/lib/data/repo';
import { DEFAULT_SETTINGS } from '@/lib/data/repo';
import type { Profile, Settings } from '@/lib/types';

interface Toast { id: number; text: string; tone: 'ok' | 'error' | 'info' }
interface Ctx {
  repo: Repo; profile: Profile | null; settings: Settings; ready: boolean; online: boolean;
  setProfile: (p: Profile | null) => void; refreshSettings: () => Promise<void>;
  toast: (text: string, tone?: Toast['tone']) => void;
  theme: 'light' | 'dark'; toggleTheme: () => void;
}
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp fuera de AppProvider');
  return c;
};

const PUBLIC = ['/login'];
const IDLE_MS = 20 * 60_000; // cierre de sesión por inactividad

export function AppProvider({ children }: { children: ReactNode }) {
  const [repo] = useState<Repo>(() => getRepo());
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const [online, setOnline] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();
  const path = usePathname();

  const toast = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === 'error' ? 7000 : 4000);
  }, []);

  const refreshSettings = useCallback(async () => {
    try { setSettings(await repo.getSettings()); } catch { /* conserva valores por defecto */ }
  }, [repo]);

  useEffect(() => {
    let saved: string | null = null;
    try { saved = localStorage.getItem('hs-theme'); } catch { /* noop */ }
    const t = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    setTheme(t);
    setOnline(navigator.onLine);
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    repo.getSession().then(async (p) => {
      setProfile(p);
      if (p) await refreshSettings();
    }).catch(() => setProfile(null)).finally(() => setReady(true));
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [repo, refreshSettings]);

  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark'); }, [theme]);

  useEffect(() => {
    if (!ready) return;
    if (!profile && !PUBLIC.includes(path)) router.replace('/login');
    if (profile && path === '/login') router.replace('/');
  }, [ready, profile, path, router]);

  // Cierre automático de sesión por inactividad (equipos compartidos)
  useEffect(() => {
    if (!profile) return;
    let timer = setTimeout(expire, IDLE_MS);
    function expire() {
      repo.signOut().finally(() => {
        try { sessionStorage.clear(); } catch { /* noop */ }
        setProfile(null); toast('Sesión cerrada por inactividad.', 'info');
      });
    }
    const reset = () => { clearTimeout(timer); timer = setTimeout(expire, IDLE_MS); };
    const evs = ['pointerdown', 'keydown', 'scroll'];
    evs.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(timer); evs.forEach((e) => window.removeEventListener(e, reset)); };
  }, [profile, repo, toast]);

  const value = useMemo<Ctx>(() => ({
    repo, profile, settings, ready, online, setProfile, refreshSettings, toast, theme,
    toggleTheme: () => setTheme((t) => {
      const n = t === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('hs-theme', n); } catch { /* noop */ }
      return n;
    }),
  }), [repo, profile, settings, ready, online, refreshSettings, toast, theme]);

  return (
    <AppCtx.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6">
        {toasts.map((t) => (
          <div key={t.id} role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-md rounded-xl px-4 py-3 text-sm font-semibold shadow-lg ${t.tone === 'error' ? 'bg-red-700 text-white' : t.tone === 'info' ? 'bg-petrol-800 text-white' : 'bg-emerald-700 text-white'}`}>
            {t.tone === 'error' ? '⚠ ' : t.tone === 'ok' ? '✓ ' : ''}{t.text}
          </div>
        ))}
      </div>
    </AppCtx.Provider>
  );
}
