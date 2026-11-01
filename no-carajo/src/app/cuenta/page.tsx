"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { pendingCount } from "@/lib/cloud";

const ROLE_LABEL = { admin: "Administrador/a", docente: "Docente", estudiante: "Estudiante" } as const;

export default function CuentaPage() {
  const auth = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (!auth.loading && !auth.session && !auth.recovery) router.replace("/ingresar");
  }, [auth.loading, auth.session, auth.recovery, router]);
  useEffect(() => {
    if (auth.profile) setName(auth.profile.full_name);
    setPending(pendingCount());
  }, [auth.profile]);

  const done = (err: string | null, ok: string) => setMsg(err ? { ok: false, text: err } : { ok: true, text: ok });

  if (auth.loading || (!auth.profile && !auth.recovery)) return <main className="p-8 text-center text-white/60">Cargando…</main>;

  if (auth.recovery) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3 px-4">
        <h1 className="font-display text-xl text-guardia">Nueva contraseña</h1>
        <input className="input" type="password" placeholder="Contraseña nueva (mín. 8)" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
        <button
          className="btn-primary"
          disabled={pwd.length < 8}
          onClick={async () => done(await auth.setNewPassword(pwd), "Contraseña actualizada.")}
        >
          Guardar
        </button>
        {msg && <p className={`text-sm ${msg.ok ? "text-neon-lima" : "text-guardia"}`}>{msg.text}</p>}
        {msg?.ok && (
          <Link href="/" className="btn-ghost">
            Ir al juego
          </Link>
        )}
      </main>
    );
  }

  const p = auth.profile!;
  const staff = p.role === "docente" || p.role === "admin";

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-xl text-guardia">Mi cuenta</h1>
        <Link href="/" className="chip">
          ← Juego
        </Link>
      </header>

      <div className="card flex flex-col gap-2">
        <p className="text-sm text-white/60">{auth.session?.user.email}</p>
        <span className="chip w-fit border-neon-cyan/50 text-neon-cyan">{ROLE_LABEL[p.role]}</span>
        <label className="mt-2 text-xs uppercase tracking-wider text-white/50">Nombre y apellido</label>
        <div className="flex gap-2">
          <input className="input" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} />
          <button className="btn-ghost" disabled={name.trim().length < 3 || name === p.full_name} onClick={async () => done(await auth.updateName(name), "Nombre actualizado.")}>
            Guardar
          </button>
        </div>
      </div>

      <div className="card flex flex-col gap-2">
        <p className="font-display text-sm text-neon-cyan">CURSO</p>
        {p.course ? (
          <p>
            <strong>{p.course.name}</strong> {p.course.year ? `(${p.course.year})` : ""}
            <br />
            <span className="text-xs text-white/50">Tus resultados los ve sólo el docente de este curso.</span>
          </p>
        ) : (
          <p className="text-sm text-white/70">Todavía no estás inscripto/a en un curso.</p>
        )}
        <div className="flex gap-2">
          <input className="input uppercase" placeholder="Código de curso" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button
            className="btn-neon"
            disabled={code.length < 6}
            onClick={async () => {
              done(await auth.joinCourse(code), "¡Inscripción confirmada!");
              setCode("");
            }}
          >
            {p.course ? "Cambiar" : "Unirme"}
          </button>
        </div>
      </div>

      {msg && <p className={`text-sm ${msg.ok ? "text-neon-lima" : "text-guardia"}`}>{msg.text}</p>}
      {pending > 0 && <p className="text-xs text-amber-300">Hay {pending} respuesta(s) guardadas en este dispositivo esperando conexión para sincronizarse.</p>}

      {staff && (
        <Link href="/docente" className="btn-neon">
          🧑‍🏫 Panel docente
        </Link>
      )}
      <button
        className="btn-ghost text-guardia"
        onClick={async () => {
          await auth.signOut();
          router.replace("/");
        }}
      >
        Cerrar sesión
      </button>
    </main>
  );
}
