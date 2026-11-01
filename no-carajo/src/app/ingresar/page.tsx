"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Jefe from "@/components/Jefe";
import { useAuth } from "@/lib/auth";

type Tab = "ingresar" | "registro" | "recuperar";

export default function IngresarPage() {
  const auth = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ingresar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [code, setCode] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (auth.session && !auth.loading) router.replace("/");
  }, [auth.session, auth.loading, router]);

  if (!auth.cloud) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4 text-center">
        <p>Las cuentas todavía no están configuradas en este servidor. Podés jugar en modo demo.</p>
        <Link href="/" className="btn-primary">
          Volver al juego
        </Link>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setBusy(true);
    try {
      if (tab === "ingresar") {
        const err = await auth.signIn(email, password);
        if (err) setMsg({ ok: false, text: err });
      } else if (tab === "registro") {
        if (password.length < 8) return setMsg({ ok: false, text: "Usá una contraseña de al menos 8 caracteres." });
        if (password !== password2) return setMsg({ ok: false, text: "Las contraseñas no coinciden." });
        const r = await auth.signUp(name, email, password, code);
        if (r.error) setMsg({ ok: false, text: r.error });
        else if (r.needsConfirmation)
          setMsg({ ok: true, text: "¡Listo! Te enviamos un correo para confirmar la cuenta. Después de confirmar, ingresá desde acá." });
      } else {
        const err = await auth.sendReset(email);
        setMsg(err ? { ok: false, text: err } : { ok: true, text: "Si el correo está registrado, vas a recibir un enlace para crear una contraseña nueva." });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-8">
      <div className="flex items-center gap-3">
        <Jefe mood={msg && !msg.ok ? "wrong" : "idle"} size={96} />
        <div>
          <h1 className="font-display text-2xl text-guardia">¡NO, CARAJO!</h1>
          <p className="text-sm text-white/70">{tab === "registro" ? "Creá tu cuenta para guardar tu progreso." : tab === "recuperar" ? "Recuperá tu contraseña." : "Identificate para entrar a la guardia."}</p>
        </div>
      </div>

      <div className="flex rounded-xl border border-white/10 bg-noche-950/60 p-1">
        {(
          [
            ["ingresar", "Ingresar"],
            ["registro", "Crear cuenta"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => {
              setTab(id);
              setMsg(null);
            }}
            className={`min-h-[44px] flex-1 rounded-lg text-sm font-bold ${tab === id ? "bg-guardia text-white" : "text-white/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form className="card flex flex-col gap-3" onSubmit={submit}>
        {tab === "registro" && (
          <input className="input" required minLength={3} maxLength={120} placeholder="Nombre y apellido" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        )}
        <input className="input" type="email" required placeholder="Correo electrónico" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        {tab !== "recuperar" && (
          <input
            className="input"
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={tab === "registro" ? "new-password" : "current-password"}
          />
        )}
        {tab === "registro" && (
          <>
            <input className="input" type="password" required placeholder="Repetí la contraseña" value={password2} onChange={(e) => setPassword2(e.target.value)} autoComplete="new-password" />
            <input
              className="input uppercase"
              placeholder="Código de curso (opcional, te lo da tu docente)"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
            />
            <label className="flex items-start gap-2 text-xs text-white/70">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-guardia" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              <span>
                Acepto que mis respuestas y resultados se guarden con fines educativos. Son privados: sólo los ven los docentes de mi curso. No ingreses datos
                reales de pacientes.
              </span>
            </label>
          </>
        )}
        <button className="btn-primary" disabled={busy || (tab === "registro" && !consent)}>
          {busy ? "Un momento…" : tab === "ingresar" ? "Ingresar" : tab === "registro" ? "Crear cuenta" : "Enviar enlace"}
        </button>
        {msg && <p className={`text-sm ${msg.ok ? "text-neon-lima" : "text-guardia"}`}>{msg.text}</p>}
        {tab === "ingresar" && (
          <button type="button" className="text-sm text-white/60 underline" onClick={() => setTab("recuperar")}>
            Olvidé mi contraseña
          </button>
        )}
        {tab === "recuperar" && (
          <button type="button" className="text-sm text-white/60 underline" onClick={() => setTab("ingresar")}>
            Volver a ingresar
          </button>
        )}
      </form>
      <Link href="/" className="text-center text-sm text-white/50 underline">
        Volver
      </Link>
    </main>
  );
}
