'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Logo } from '@/components/AppShell';
import { ErrorBox, Notice } from '@/components/ui';
import { friendlyError } from '@/lib/data/repo';
import { DEMO_PASSWORD, DEMO_USERS } from '@/lib/data/demo-repo';
import { resetDemo } from '@/lib/data';

export default function LoginPage() {
  const { repo, setProfile, refreshSettings } = useApp();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e?: React.FormEvent, em = email, pw = password) {
    e?.preventDefault();
    setBusy(true); setError(null);
    try {
      const p = await repo.signIn(em, pw);
      setProfile(p); await refreshSettings();
      router.replace('/');
    } catch (err) { setError(friendlyError(err)); } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-petrol-900 via-petrol-800 to-turq-700 md:flex-row">
      <div className="flex flex-col justify-center gap-4 p-8 text-white md:w-1/2 md:p-16">
        <Logo />
        <h1 className="text-3xl font-bold md:text-4xl">HeridaSegura <span className="text-turq-300">IA</span></h1>
        <p className="max-w-md text-lg text-petrol-100">Valoración estructurada, registro fotográfico seguro y seguimiento longitudinal de heridas para enfermería hospitalaria.</p>
        <p className="text-sm text-petrol-200">Hospital Escuela General José Francisco de San Martín · Corrientes</p>
        <ul className="hidden space-y-2 text-sm text-petrol-100 md:block">
          <li>✓ El juicio clínico profesional es siempre la decisión final.</li>
          <li>✓ Fotografías en almacenamiento privado con acceso por sector.</li>
          <li>✓ Registros trazables: las correcciones se realizan por adenda.</li>
        </ul>
      </div>
      <div className="flex flex-1 items-center justify-center p-4 md:p-10">
        <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6" aria-labelledby="login-title">
          <h2 id="login-title" className="h1">Iniciar sesión</h2>
          {repo.mode === 'demo' && (
            <Notice tone="warn">
              <p><b>Modo demostración.</b> Sin conexión a Supabase: los datos son ficticios y se guardan solo en este navegador.</p>
            </Notice>
          )}
          <div>
            <label className="label" htmlFor="email">Correo institucional</label>
            <input id="email" className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pw">Contraseña</label>
            <input id="pw" className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <ErrorBox error={error} />}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar'}</button>
          {repo.mode === 'demo' && (
            <div className="space-y-2 border-t border-slate-200 pt-4 dark:border-petrol-700">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Ingresar con un usuario de demostración:</p>
              {DEMO_USERS.map((u) => (
                <button key={u.email} type="button" className="btn-secondary w-full justify-start" disabled={busy}
                  onClick={() => submit(undefined, u.email, DEMO_PASSWORD)}>
                  {u.label}
                </button>
              ))}
              <p className="hint">Contraseña de todos los usuarios demo: <code>{DEMO_PASSWORD}</code></p>
              <button type="button" className="btn-ghost w-full text-sm" onClick={() => { if (confirm('¿Restablecer los datos de demostración? Se perderán los registros ficticios creados.')) { resetDemo(); location.reload(); } }}>
                Restablecer datos de demostración
              </button>
            </div>
          )}
          <p className="text-xs text-slate-500">Uso exclusivo de personal autorizado. Los accesos quedan registrados (Ley 25.326 · Ley 26.529).</p>
        </form>
      </div>
    </div>
  );
}
