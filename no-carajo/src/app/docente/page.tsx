"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MODULES, moduleById } from "@/data/modules";
import { QUESTIONS } from "@/data/questions";
import { getSettings, setSettings, type TeacherSettings } from "@/lib/settings";
import { getAIStatus, aiGenerate } from "@/lib/ai-client";
import { CSV_EXAMPLE, importQuestions, toCSV } from "@/lib/csv";
import { getProgress, moduleStats } from "@/lib/progress";
import { useAuth } from "@/lib/auth";
import { cloudStore, localStore, type TeacherStore } from "@/lib/teacher-store";
import { teacherCloud, type AttemptRow, type ModuleStatRow, type StudentSummary } from "@/lib/cloud";
import type { Course, Profile, Role } from "@/lib/supabase";
import type { Level, Question, QuestionType, Vitals } from "@/lib/types";

type Tab = "banco" | "editar" | "importar" | "ia" | "resultados" | "cursos" | "usuarios" | "config";

const PIN = process.env.NEXT_PUBLIC_DEMO_ADMIN_PIN || "1234";

export default function DocentePage() {
  const auth = useAuth();
  const [pinOk, setPinOk] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => setPinOk(sessionStorage.getItem("nc.docente") === "1"), []);

  if (auth.cloud) {
    if (auth.loading) return <Center>Cargando…</Center>;
    if (!auth.session)
      return (
        <Center>
          <p>Ingresá con tu cuenta docente.</p>
          <Link href="/ingresar" className="btn-primary">
            Ingresar
          </Link>
        </Center>
      );
    if (auth.profile?.role !== "docente" && auth.profile?.role !== "admin")
      return (
        <Center>
          <p>Tu cuenta tiene rol de estudiante. Si sos docente, pedile a un administrador que te asigne el rol.</p>
          <Link href="/" className="btn-ghost">
            Volver al juego
          </Link>
        </Center>
      );
    return <Panel store={cloudStore} cloud isAdmin={auth.profile.role === "admin"} />;
  }

  if (!pinOk)
    return (
      <Center>
        <h1 className="font-display text-2xl text-guardia">Panel docente</h1>
        <p className="text-sm text-white/60">Acceso de demostración (sin cuentas configuradas).</p>
        <form
          className="flex w-full flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (pin === PIN) {
              sessionStorage.setItem("nc.docente", "1");
              setPinOk(true);
            } else alert("PIN incorrecto");
          }}
        >
          <input className="input" type="password" inputMode="numeric" placeholder="PIN docente" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn-primary">Ingresar</button>
        </form>
        <Link href="/" className="text-sm text-white/50 underline">
          Volver al juego
        </Link>
      </Center>
    );
  return <Panel store={localStore} cloud={false} isAdmin />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-4 px-4 text-center">{children}</main>;
}

/* ══════════════════════ Panel ══════════════════════ */
function Panel({ store, cloud, isAdmin }: { store: TeacherStore; cloud: boolean; isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("banco");
  const [custom, setCustom] = useState<Question[]>([]);
  const [pending, setPending] = useState<Question[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [editing, setEditing] = useState<Question | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const d = await store.load();
      setCustom(d.custom);
      setPending(d.pending);
      setDisabled(d.disabled);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [store]);
  useEffect(() => void reload(), [reload]);

  /** Ejecuta una operación del almacén mostrando errores y recargando. */
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const TABS: { id: Tab; label: string; show: boolean }[] = [
    { id: "banco", label: "📚 Banco", show: true },
    { id: "editar", label: editing ? "✏️ Editar" : "➕ Nueva", show: true },
    { id: "importar", label: "📥 CSV/Excel", show: true },
    { id: "ia", label: `🤖 IA${pending.length ? ` (${pending.length})` : ""}`, show: true },
    { id: "resultados", label: "📊 Resultados", show: true },
    { id: "cursos", label: "🏫 Cursos", show: cloud },
    { id: "usuarios", label: "👥 Usuarios", show: cloud && isAdmin },
    { id: "config", label: "⚙️ Config", show: !cloud },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-guardia">Panel docente</h1>
        <div className="flex gap-2">
          {cloud && (
            <Link href="/cuenta" className="chip">
              👤 Cuenta
            </Link>
          )}
          <Link href="/" className="chip">
            ← Juego
          </Link>
        </div>
      </header>
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.filter((t) => t.show).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip whitespace-nowrap py-2 text-sm ${tab === t.id ? "border-neon-cyan text-neon-cyan" : ""}`}>
            {t.label}
          </button>
        ))}
      </nav>
      {error && <p className="mb-3 rounded-lg bg-guardia/15 p-2 text-sm text-guardia">⚠ {error}</p>}
      {busy && <p className="mb-3 text-sm text-neon-cyan">Guardando…</p>}

      {tab === "banco" && (
        <Bank
          custom={custom}
          disabled={disabled}
          onToggleOfficial={(id) => run(() => store.setOfficialDisabled(id, !disabled.includes(id)))}
          onToggleCustom={(q) => run(() => store.setActive(q, q.active === false))}
          onEdit={(q) => {
            setEditing(q);
            setTab("editar");
          }}
          onDelete={(id) => confirm("¿Eliminar la pregunta?") && run(() => store.remove(id))}
        />
      )}

      {tab === "editar" && (
        <Editor
          key={editing?.id ?? "nueva"}
          initial={editing}
          onCancel={() => {
            setEditing(null);
            setTab("banco");
          }}
          onSave={(q) =>
            run(async () => {
              await store.save(q);
              if (!cloud && pending.some((p) => p.id === q.id)) await store.discard(q.id);
              setEditing(null);
              setTab("banco");
            })
          }
        />
      )}

      {tab === "importar" && <Importer onImport={(qs) => run(() => store.saveMany(qs))} />}

      {tab === "ia" && (
        <AIReview
          pending={pending}
          onAdd={(qs) => run(() => store.addPending(qs))}
          onApprove={(q) => run(() => store.approve(q))}
          onEdit={(q) => {
            setEditing({ ...q, origin: "ia-aprobada", active: true });
            setTab("editar");
          }}
          onDiscard={(id) => run(() => store.discard(id))}
        />
      )}

      {tab === "resultados" && (cloud ? <CloudResults bank={[...QUESTIONS, ...custom]} /> : <LocalResults />)}
      {tab === "cursos" && cloud && <Courses />}
      {tab === "usuarios" && cloud && isAdmin && <Users />}

      {tab === "config" && !cloud && <LocalConfig />}
    </main>
  );
}

/* ───────── Banco ───────── */
function Bank({
  custom,
  disabled,
  onToggleOfficial,
  onToggleCustom,
  onEdit,
  onDelete,
}: {
  custom: Question[];
  disabled: string[];
  onToggleOfficial: (id: string) => void;
  onToggleCustom: (q: Question) => void;
  onEdit: (q: Question) => void;
  onDelete: (id: string) => void;
}) {
  const [mod, setMod] = useState("todos");
  const all = useMemo(
    () => [...QUESTIONS.map((q) => ({ ...q, origin: "oficial" as const, active: !disabled.includes(q.id) })), ...custom],
    [custom, disabled],
  );
  const list = all.filter((q) => mod === "todos" || q.moduleId === mod);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input max-w-xs" value={mod} onChange={(e) => setMod(e.target.value)}>
          <option value="todos">Todos los módulos ({all.length})</option>
          {MODULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.number}. {m.title} ({all.filter((q) => q.moduleId === m.id).length})
            </option>
          ))}
        </select>
        <button
          className="btn-ghost text-sm"
          onClick={() =>
            download(
              "banco-preguntas.csv",
              toCSV([
                ["id", "origen", "activa", "modulo", "nivel", "tipo", "caso", "paso", "enunciado", "explicacion", "referencia"],
                ...all.map((q) => [
                  q.id,
                  q.origin ?? "",
                  q.active === false ? "no" : "sí",
                  q.moduleId,
                  q.level,
                  q.type,
                  q.caseId ?? "",
                  q.caseStep ?? "",
                  q.calc ? q.calc.template : q.prompt,
                  q.explanation,
                  q.reference ?? "",
                ]),
              ]),
            )
          }
        >
          ⬇ Exportar banco
        </button>
      </div>
      {list.map((q) => (
        <div key={q.id} className={`card ${q.active === false ? "opacity-50" : ""}`}>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="chip">{moduleById(q.moduleId)?.short}</span>
            <span className="chip">{q.level}</span>
            <span className="chip">{q.type}</span>
            <span className={`chip ${q.origin === "oficial" ? "text-neon-cyan" : q.origin === "ia-aprobada" ? "text-neon-rosa" : "text-neon-lima"}`}>{q.origin}</span>
            {q.critical && <span className="chip text-guardia">⚠ crítica</span>}
            {q.caseId && (
              <span className="chip">
                🧩 {q.caseTitle ?? q.caseId} · paso {q.caseStep}
              </span>
            )}
          </div>
          <p className="mt-2 font-semibold">{q.calc ? q.calc.template : q.prompt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="chip py-1.5" onClick={() => (q.origin === "oficial" ? onToggleOfficial(q.id) : onToggleCustom(q))}>
              {q.active === false ? "Activar" : "Desactivar"}
            </button>
            {q.origin === "oficial" ? (
              <button
                className="chip py-1.5"
                onClick={() => onEdit({ ...q, id: `doc-${Date.now()}`, origin: "docente", calc: undefined })}
                disabled={q.type === "calc"}
              >
                {q.type === "calc" ? "Cálculo (motor determinista)" : "Duplicar y editar"}
              </button>
            ) : (
              <>
                <button className="chip py-1.5" onClick={() => onEdit(q)}>
                  Editar
                </button>
                <button className="chip py-1.5 text-guardia" onClick={() => onDelete(q.id)}>
                  Eliminar
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Editor ───────── */
const VITAL_FIELDS: { key: keyof Vitals; label: string; numeric: boolean }[] = [
  { key: "pa", label: "PA", numeric: false },
  { key: "fc", label: "FC", numeric: true },
  { key: "fr", label: "FR", numeric: true },
  { key: "sat", label: "SatO₂ %", numeric: true },
  { key: "temp", label: "T °C", numeric: true },
  { key: "glu", label: "Glucemia", numeric: true },
  { key: "dolor", label: "Dolor /10", numeric: true },
  { key: "o2", label: "O₂", numeric: false },
  { key: "conciencia", label: "Conciencia", numeric: false },
];

function Editor({ initial, onSave, onCancel }: { initial: Question | null; onSave: (q: Question) => void; onCancel: () => void }) {
  const [q, setQ] = useState<Question>(
    initial ?? { id: `doc-${Date.now()}`, moduleId: "bioseguridad", level: "basico", type: "mcq", prompt: "", options: ["", "", "", ""], answer: 0, explanation: "", origin: "docente", active: true },
  );
  const [concepts, setConcepts] = useState(
    (initial?.keyConcepts ?? []).map((c) => [c.label, ...c.synonyms.filter((s) => s !== c.label)].join(" | ")).join("\n"),
  );
  const [isCase, setIsCase] = useState(Boolean(initial?.caseId));
  const set = (p: Partial<Question>) => setQ((x) => ({ ...x, ...p }));
  const crit = q.critical;

  const save = () => {
    if (!q.prompt.trim() || !q.explanation.trim()) return alert("Completá enunciado y explicación.");
    const out: Question = { ...q };
    if (q.type === "open") {
      const groups = concepts
        .split("\n")
        .map((l) => l.split("|").map((s) => s.trim()).filter(Boolean))
        .filter((g) => g.length);
      if (!groups.length) return alert("Las preguntas abiertas necesitan al menos un concepto clave.");
      out.keyConcepts = groups.map((g) => ({ label: g[0], synonyms: g }));
      out.minConcepts = Math.min(q.minConcepts ?? groups.length, groups.length);
      delete out.options;
    }
    if (q.type === "mcq") out.options = (q.options ?? []).filter((o) => o.trim());
    if (out.critical && !out.critical.risk.trim()) return alert("Si marcás opciones críticas, describí el riesgo.");
    if (isCase) {
      if (!q.caseId?.trim() || !q.caseStep) return alert("Para un caso clínico indicá identificador y número de paso.");
      out.caseId = q.caseId.trim();
      if (out.vitals) out.vitals = Object.fromEntries(Object.entries(out.vitals).filter(([, v]) => v !== "" && v !== undefined)) as Vitals;
    } else {
      delete out.caseId;
      delete out.caseStep;
      delete out.caseIntro;
      delete out.caseTitle;
      delete out.vitals;
    }
    onSave(out);
  };

  return (
    <div className="card flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Módulo">
          <select className="input" value={q.moduleId} onChange={(e) => set({ moduleId: e.target.value })}>
            {MODULES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.number}. {m.short}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nivel">
          <select className="input" value={q.level} onChange={(e) => set({ level: e.target.value as Level })}>
            <option value="basico">Básico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
        </Field>
        <Field label="Tipo">
          <select
            className="input"
            value={q.type}
            onChange={(e) => set({ type: e.target.value as QuestionType, options: q.options ?? ["", "", "", ""], answer: q.answer ?? 0, tfAnswer: q.tfAnswer ?? true })}
          >
            <option value="mcq">Opción múltiple</option>
            <option value="tf">Verdadero / Falso</option>
            <option value="open">Respuesta abierta</option>
          </select>
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-5 w-5 accent-neon-rosa" checked={isCase} onChange={(e) => setIsCase(e.target.checked)} />
        Es un paso de un caso clínico (modo Guardia)
      </label>
      {isCase && (
        <div className="rounded-xl border border-neon-rosa/30 bg-neon-rosa/5 p-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Identificador del caso">
              <input className="input" placeholder="ej.: hipoglucemia-1" value={q.caseId ?? ""} onChange={(e) => set({ caseId: e.target.value })} />
            </Field>
            <Field label="Paso n.º">
              <input className="input" type="number" min={1} value={q.caseStep ?? 1} onChange={(e) => set({ caseStep: Number(e.target.value) })} />
            </Field>
            <Field label="Título (en el paso 1)">
              <input className="input" value={q.caseTitle ?? ""} onChange={(e) => set({ caseTitle: e.target.value || undefined })} />
            </Field>
          </div>
          <Field label="Situación de este paso (lo que ve el estudiante antes de la pregunta)">
            <textarea className="input min-h-[70px]" value={q.caseIntro ?? ""} onChange={(e) => set({ caseIntro: e.target.value || undefined })} />
          </Field>
          <p className="mb-1 mt-2 text-xs font-semibold uppercase tracking-wider text-white/50">Monitor (opcional)</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {VITAL_FIELDS.map((f) => (
              <input
                key={f.key}
                className="input px-2 py-2 text-sm"
                placeholder={f.label}
                inputMode={f.numeric ? "decimal" : "text"}
                value={q.vitals?.[f.key] ?? ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  const v = f.numeric ? (raw === "" ? undefined : Number(raw.replace(",", "."))) : raw || undefined;
                  set({ vitals: { ...q.vitals, [f.key]: v } });
                }}
              />
            ))}
          </div>
        </div>
      )}

      <Field label="Enunciado / pregunta">
        <textarea className="input min-h-[80px]" value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} />
      </Field>

      {q.type === "mcq" && (
        <Field label="Opciones (marcá la correcta; ⚠ = error grave de seguridad)">
          {(q.options ?? []).map((o, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input type="radio" name="ans" className="h-5 w-5 accent-neon-lima" checked={q.answer === i} onChange={() => set({ answer: i })} />
              <input className="input" value={o} placeholder={`Opción ${"ABCD"[i]}`} onChange={(e) => set({ options: q.options!.map((x, j) => (j === i ? e.target.value : x)) })} />
              <label className="flex items-center gap-1 text-xs text-guardia" title="Error grave">
                <input
                  type="checkbox"
                  className="accent-guardia"
                  disabled={q.answer === i}
                  checked={crit?.options?.includes(i) ?? false}
                  onChange={(e) => {
                    const opts = new Set(crit?.options ?? []);
                    if (e.target.checked) opts.add(i);
                    else opts.delete(i);
                    set({
                      critical: opts.size
                        ? { options: [...opts], risk: crit?.risk ?? "", recovery: crit?.recovery ?? { prompt: "", options: ["", ""], answer: 0, explanation: "" } }
                        : undefined,
                    });
                  }}
                />
                ⚠
              </label>
            </div>
          ))}
        </Field>
      )}

      {q.type === "tf" && (
        <Field label="Respuesta correcta">
          <select className="input" value={q.tfAnswer ? "v" : "f"} onChange={(e) => set({ tfAnswer: e.target.value === "v" })}>
            <option value="v">Verdadero</option>
            <option value="f">Falso</option>
          </select>
        </Field>
      )}

      {q.type === "open" && (
        <>
          <Field label="Conceptos clave (uno por línea; sinónimos separados por | )">
            <textarea
              className="input min-h-[100px] font-mono text-sm"
              value={concepts}
              onChange={(e) => setConcepts(e.target.value)}
              placeholder={"paciente correcto | paciente | identificación\ndosis correcta | dosis"}
            />
          </Field>
          <Field label="Mínimo de conceptos para considerarla correcta">
            <input className="input" type="number" min={1} value={q.minConcepts ?? 1} onChange={(e) => set({ minConcepts: Number(e.target.value) })} />
          </Field>
        </>
      )}

      <Field label="Explicación científica (se muestra siempre)">
        <textarea className="input min-h-[90px]" value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} />
      </Field>
      <Field label="Referencia / bibliografía validada">
        <input className="input" value={q.reference ?? ""} onChange={(e) => set({ reference: e.target.value || undefined })} />
      </Field>

      {crit && (
        <div className="rounded-xl border border-guardia/40 bg-guardia/5 p-3">
          <p className="mb-2 font-bold text-guardia">Error grave: riesgo y recuperación obligatoria</p>
          <Field label="Riesgo para el paciente">
            <textarea className="input" value={crit.risk} onChange={(e) => set({ critical: { ...crit, risk: e.target.value } })} />
          </Field>
          <Field label="Pregunta de recuperación">
            <input className="input" value={crit.recovery.prompt} onChange={(e) => set({ critical: { ...crit, recovery: { ...crit.recovery, prompt: e.target.value } } })} />
          </Field>
          {crit.recovery.options.map((o, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input
                type="radio"
                name="rec"
                className="h-5 w-5 accent-neon-lima"
                checked={crit.recovery.answer === i}
                onChange={() => set({ critical: { ...crit, recovery: { ...crit.recovery, answer: i } } })}
              />
              <input
                className="input"
                value={o}
                onChange={(e) => set({ critical: { ...crit, recovery: { ...crit.recovery, options: crit.recovery.options.map((x, j) => (j === i ? e.target.value : x)) } } })}
              />
            </div>
          ))}
          <button className="chip mb-2" onClick={() => set({ critical: { ...crit, recovery: { ...crit.recovery, options: [...crit.recovery.options, ""] } } })}>
            + opción
          </button>
          <Field label="Explicación de la recuperación">
            <textarea className="input" value={crit.recovery.explanation} onChange={(e) => set({ critical: { ...crit, recovery: { ...crit.recovery, explanation: e.target.value } } })} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button className="btn-primary" onClick={save}>
          Guardar
        </button>
      </div>
    </div>
  );
}

/* ───────── Importar ───────── */
function Importer({ onImport }: { onImport: (q: Question[]) => void }) {
  const [msg, setMsg] = useState<{ ok: number; errors: string[] } | null>(null);
  return (
    <div className="card flex flex-col gap-3">
      <p className="text-sm text-white/80">
        Importá un banco desde <strong>CSV</strong>. Desde Excel: <em>Archivo → Guardar como → CSV UTF-8</em>. Se aceptan separadores «,» o «;».
      </p>
      <p className="text-xs text-white/50">
        Columnas: modulo · nivel (basico/intermedio/avanzado) · tipo (mcq/vf/abierta) · enunciado · opcion_a…d · correcta (A-D o V/F) · explicacion · referencia ·
        conceptos_clave (abiertas: grupos con «;» y sinónimos con «|») · opcionales para casos: caso_id · paso · titulo_caso · situacion. Módulos:{" "}
        {MODULES.map((m) => m.id).join(", ")}.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="btn-ghost text-sm" onClick={() => download("plantilla-preguntas.csv", toCSV(CSV_EXAMPLE))}>
          ⬇ Descargar plantilla
        </button>
        <label className="btn-neon cursor-pointer text-sm">
          📥 Elegir archivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const r = importQuestions(await f.text());
              if (r.ok.length) onImport(r.ok);
              setMsg({ ok: r.ok.length, errors: r.errors });
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {msg && (
        <div className="rounded-xl bg-white/5 p-3 text-sm">
          <p className="text-neon-lima">✔ {msg.ok} pregunta(s) importadas.</p>
          {msg.errors.map((e) => (
            <p key={e} className="text-guardia">
              ✘ {e}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────── IA: generar y revisar ───────── */
function AIReview({
  pending,
  onAdd,
  onApprove,
  onEdit,
  onDiscard,
}: {
  pending: Question[];
  onAdd: (q: Question[]) => void;
  onApprove: (q: Question) => void;
  onEdit: (q: Question) => void;
  onDiscard: (id: string) => void;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [mod, setMod] = useState(MODULES[1].id);
  const [level, setLevel] = useState<Level>("basico");
  const [count, setCount] = useState(3);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getAIStatus().then((s) => setEnabled(s.enabled));
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="card flex flex-col gap-3">
        <p className="font-bold">Generar preguntas con IA (requieren revisión docente)</p>
        {enabled === false && (
          <p className="rounded-lg bg-amber-400/10 p-2 text-sm text-amber-300">IA no configurada. Agregá ANTHROPIC_API_KEY en las variables de entorno del servidor.</p>
        )}
        <div className="grid gap-2 sm:grid-cols-3">
          <select className="input" value={mod} onChange={(e) => setMod(e.target.value)}>
            {MODULES.filter((m) => m.id !== "calculos").map((m) => (
              <option key={m.id} value={m.id}>
                {m.number}. {m.short}
              </option>
            ))}
          </select>
          <select className="input" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="basico">Básico</option>
            <option value="intermedio">Intermedio</option>
            <option value="avanzado">Avanzado</option>
          </select>
          <input className="input" type="number" min={1} max={5} value={count} onChange={(e) => setCount(Math.max(1, Math.min(5, Number(e.target.value))))} />
        </div>
        <textarea
          className="input min-h-[100px] text-sm"
          placeholder="Pegá aquí bibliografía o fragmentos del programa validados por la cátedra (recomendado). La IA la usará como fuente principal."
          value={ref}
          onChange={(e) => setRef(e.target.value)}
        />
        <button
          className="btn-primary"
          disabled={!enabled || busy}
          onClick={async () => {
            setBusy(true);
            setErr("");
            const r = await aiGenerate(moduleById(mod)!.title, mod, level, count, ref);
            setBusy(false);
            if (r.error) setErr(r.error);
            else onAdd(r.questions);
          }}
        >
          {busy ? "Generando…" : "🤖 Generar borradores"}
        </button>
        {err && <p className="text-sm text-guardia">{err}</p>}
        <p className="text-xs text-white/40">Los cálculos de dosis no se generan con IA: los resuelve el motor determinista.</p>
      </div>

      {pending.length === 0 && <p className="text-center text-sm text-white/50">No hay borradores pendientes de revisión.</p>}
      {pending.map((q) => (
        <div key={q.id} className="card border-neon-rosa/30">
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="chip text-neon-rosa">borrador IA</span>
            <span className="chip">{moduleById(q.moduleId)?.short}</span>
            <span className="chip">{q.level}</span>
            <span className="chip">{q.type}</span>
          </div>
          <p className="mt-2 font-semibold">{q.prompt}</p>
          {q.options && (
            <ol className="mt-2 list-[upper-alpha] space-y-1 pl-6 text-sm">
              {q.options.map((o, i) => (
                <li key={i} className={i === q.answer ? "text-neon-lima" : q.critical?.options?.includes(i) ? "text-guardia" : ""}>
                  {o}
                </li>
              ))}
            </ol>
          )}
          {q.type === "tf" && <p className="mt-2 text-sm text-neon-lima">Correcta: {q.tfAnswer ? "Verdadero" : "Falso"}</p>}
          <p className="mt-2 text-sm text-white/70">{q.explanation}</p>
          {q.reference && <p className="mt-1 text-xs text-amber-300">{q.reference}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="chip py-1.5 text-neon-lima"
              onClick={() => onApprove(q)}
              disabled={Boolean(q.critical)}
              title={q.critical ? "Tiene opciones críticas: editá el riesgo antes de aprobar" : ""}
            >
              ✔ Aprobar
            </button>
            <button className="chip py-1.5" onClick={() => onEdit(q)}>
              ✏️ Editar y aprobar
            </button>
            <button className="chip py-1.5 text-guardia" onClick={() => onDiscard(q.id)}>
              ✘ Descartar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ───────── Resultados (modo demo: este dispositivo) ───────── */
function LocalResults() {
  const [p] = useState(() => getProgress());
  const stats = moduleStats(p);
  return (
    <div className="flex flex-col gap-3">
      <div className="card">
        <p className="text-sm text-amber-300">
          Modo demo: muestra los resultados guardados en <strong>este dispositivo</strong>. Con cuentas (Supabase) se ven los resultados de cada curso.
        </p>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="py-1">Módulo</th>
              <th>Respuestas</th>
              <th>Desempeño</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.module.id} className="border-t border-white/10">
                <td className="py-1.5">
                  {s.module.icon} {s.module.title}
                </td>
                <td>{s.total}</td>
                <td className={s.pct !== null && s.pct < 0.7 ? "text-guardia" : ""}>{s.pct === null ? "—" : `${Math.round(s.pct * 100)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-sm">
          XP: {p.xp} · Sesiones: {p.sessions} · Errores graves: {p.graveCount}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        <button
          className="btn-ghost text-sm"
          onClick={() =>
            download(
              "resultados.csv",
              toCSV([
                ["fecha", "modulo", "pregunta", "resultado", "puntaje", "xp", "respuesta"],
                ...p.history.map((h) => [new Date(h.at).toLocaleString("es-AR"), h.moduleId, h.questionId, h.verdict, h.score, h.xp, h.answerText]),
              ]),
            )
          }
        >
          ⬇ Exportar a Excel (CSV)
        </button>
        <button className="btn-ghost text-sm" onClick={() => window.print()}>
          🖨 Exportar PDF (imprimir)
        </button>
      </div>
    </div>
  );
}

/* ───────── Resultados por curso (modo cuentas) ───────── */
function CloudResults({ bank }: { bank: Question[] }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [mods, setMods] = useState<ModuleStatRow[]>([]);
  const [selected, setSelected] = useState<StudentSummary | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    teacherCloud
      .listCourses()
      .then((c) => {
        setCourses(c);
        if (c[0]) setCourseId(c[0].id);
      })
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    if (!courseId) return;
    setSelected(null);
    Promise.all([teacherCloud.courseStudents(courseId), teacherCloud.moduleStats({ courseId })])
      .then(([s, m]) => {
        setStudents(s);
        setMods(m);
      })
      .catch((e) => setErr(e.message));
  }, [courseId]);

  useEffect(() => {
    if (!selected) return;
    teacherCloud.studentAttempts(selected.user_id).then(setAttempts).catch((e) => setErr(e.message));
  }, [selected]);

  const course = courses.find((c) => c.id === courseId);
  // Agregado por módulo para todo el curso (ponderado por cantidad de respuestas).
  const byModule = MODULES.map((m) => {
    const rows = mods.filter((r) => r.module_id === m.id);
    const answers = rows.reduce((s, r) => s + Number(r.answers), 0);
    const pct = answers ? Math.round(rows.reduce((s, r) => s + Number(r.pct) * Number(r.answers), 0) / answers) : null;
    return { m, answers, pct, graves: rows.reduce((s, r) => s + Number(r.grave_errors), 0) };
  });
  const promptOf = (id: string) => {
    const q = bank.find((x) => x.id === id);
    return q ? q.prompt : id;
  };

  if (err) return <p className="text-guardia">⚠ {err}</p>;
  if (!courses.length) return <p className="card text-sm">Todavía no tenés cursos. Creá uno en la pestaña «Cursos» y compartí el código con tus estudiantes.</p>;

  return (
    <div className="flex flex-col gap-3" id="reporte">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <select className="input max-w-xs" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.year ? `(${c.year})` : ""}
            </option>
          ))}
        </select>
        <button
          className="btn-ghost text-sm"
          onClick={() =>
            download(
              `resultados-${course?.name ?? "curso"}.csv`,
              toCSV([
                ["estudiante", "xp", "sesiones", "respuestas", "desempeño %", "errores graves", "última actividad"],
                ...students.map((s) => [s.full_name, s.xp, s.sessions, s.answers, s.pct ?? "", s.grave_count, s.last_activity ? new Date(s.last_activity).toLocaleString("es-AR") : ""]),
              ]),
            )
          }
        >
          ⬇ Excel (CSV) del curso
        </button>
        <button
          className="btn-ghost text-sm"
          onClick={async () => {
            const rows = await teacherCloud.courseAttempts(students.map((s) => s.user_id));
            const name = (id: string) => students.find((s) => s.user_id === id)?.full_name ?? id;
            download(
              `respuestas-${course?.name ?? "curso"}.csv`,
              toCSV([
                ["fecha", "estudiante", "módulo", "pregunta", "resultado", "puntaje", "respuesta"],
                ...rows.map((r) => [new Date(r.answered_at).toLocaleString("es-AR"), name(r.user_id), r.module_id, promptOf(r.question_id), r.verdict, r.score, r.answer_text ?? ""]),
              ]),
            );
          }}
        >
          ⬇ Todas las respuestas
        </button>
        <button className="btn-ghost text-sm" onClick={() => window.print()}>
          🖨 PDF
        </button>
      </div>

      <div className="card">
        <p className="font-display text-sm text-neon-cyan">
          {course?.name.toUpperCase()} · {students.length} ESTUDIANTE(S)
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <Kpi label="Respuestas" value={students.reduce((s, x) => s + Number(x.answers), 0)} />
          <Kpi label="Desempeño medio" value={avg(students.filter((s) => s.pct !== null).map((s) => Number(s.pct)))} suffix="%" />
          <Kpi label="Errores graves" value={students.reduce((s, x) => s + Number(x.grave_count), 0)} danger />
        </div>
      </div>

      <div className="card overflow-x-auto">
        <p className="mb-2 font-display text-sm text-neon-cyan">POR MÓDULO</p>
        <table className="w-full text-sm">
          <tbody>
            {byModule.map(({ m, answers, pct, graves }) => (
              <tr key={m.id} className="border-t border-white/10">
                <td className="py-1.5">
                  {m.icon} {m.short}
                </td>
                <td className="w-1/2">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full" style={{ width: `${pct ?? 0}%`, background: pct !== null && pct < 70 ? "#ff2e4d" : m.color }} />
                  </div>
                </td>
                <td className="pl-2 text-right">{pct === null ? "—" : `${pct}%`}</td>
                <td className="pl-2 text-right text-white/50">{answers}</td>
                <td className="pl-2 text-right text-guardia">{graves ? `⚠${graves}` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card overflow-x-auto">
        <p className="mb-2 font-display text-sm text-neon-cyan">ESTUDIANTES</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="py-1">Nombre</th>
              <th>XP</th>
              <th>Resp.</th>
              <th>%</th>
              <th>⚠</th>
              <th>Última</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.user_id} className={`cursor-pointer border-t border-white/10 hover:bg-white/5 ${selected?.user_id === s.user_id ? "bg-white/10" : ""}`} onClick={() => setSelected(s)}>
                <td className="py-1.5 underline decoration-white/20">{s.full_name || "(sin nombre)"}</td>
                <td>{s.xp}</td>
                <td>{s.answers}</td>
                <td className={s.pct !== null && Number(s.pct) < 70 ? "text-guardia" : ""}>{s.pct ?? "—"}</td>
                <td className="text-guardia">{Number(s.grave_count) || ""}</td>
                <td className="text-white/50">{s.last_activity ? new Date(s.last_activity).toLocaleDateString("es-AR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!students.length && <p className="text-sm text-white/50">Aún no hay estudiantes inscriptos. Código del curso: {course?.join_code}</p>}
      </div>

      {selected && <StudentDetail student={selected} attempts={attempts} promptOf={promptOf} />}
    </div>
  );
}

function StudentDetail({ student, attempts, promptOf }: { student: StudentSummary; attempts: AttemptRow[]; promptOf: (id: string) => string }) {
  const [mods, setMods] = useState<ModuleStatRow[]>([]);
  useEffect(() => {
    teacherCloud.moduleStats({ userId: student.user_id }).then(setMods).catch(() => setMods([]));
  }, [student.user_id]);
  const weak = mods.filter((m) => Number(m.answers) >= 2 && Number(m.pct) < 70);
  const errors = attempts.filter((a) => a.verdict !== "correcta");

  return (
    <div className="card">
      <p className="font-display text-sm text-neon-cyan">{student.full_name.toUpperCase()}</p>
      <p className="mt-1 text-sm text-white/70">
        XP {student.xp} · {student.sessions} sesiones · {student.answers} respuestas · {student.pct ?? "—"}% · {student.grave_count} errores graves
      </p>
      {weak.length > 0 && (
        <p className="mt-2 text-sm text-amber-300">Reforzar: {weak.map((w) => `${moduleById(w.module_id)?.short ?? w.module_id} (${w.pct}%)`).join(", ")}</p>
      )}
      <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-white/50">Últimos errores</p>
      <ul className="mt-1 space-y-1 text-sm">
        {errors.slice(0, 15).map((a, i) => (
          <li key={i} className="rounded-lg bg-white/5 p-2">
            <span className={a.verdict === "grave" ? "text-guardia" : a.verdict === "parcial" ? "text-amber-300" : "text-white/80"}>
              {a.verdict === "grave" ? "⚠" : a.verdict === "parcial" ? "🟡" : "❌"}
            </span>{" "}
            {promptOf(a.question_id)}
            {a.answer_text && <span className="block text-xs text-white/50">Respondió: {a.answer_text}</span>}
          </li>
        ))}
        {!errors.length && <li className="text-white/50">Sin errores registrados.</li>}
      </ul>
    </div>
  );
}

/* ───────── Cursos ───────── */
function Courses() {
  const auth = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [err, setErr] = useState("");
  const load = () => teacherCloud.listCourses().then(setCourses).catch((e) => setErr(e.message));
  useEffect(() => void load(), []);

  return (
    <div className="flex flex-col gap-3">
      <form
        className="card flex flex-wrap gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr("");
          try {
            await teacherCloud.createCourse(name.trim(), year ? Number(year) : null);
            setName("");
            await load();
          } catch (x) {
            setErr((x as Error).message);
          }
        }}
      >
        <input className="input flex-1" required minLength={3} placeholder="Nombre del curso (ej.: Enfermería 1.º A)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input w-28" type="number" placeholder="Año" value={year} onChange={(e) => setYear(e.target.value)} />
        <button className="btn-primary">Crear curso</button>
      </form>
      {err && <p className="text-sm text-guardia">⚠ {err}</p>}
      {courses.map((c) => (
        <div key={c.id} className="card flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold">
              {c.name} {c.year ? `(${c.year})` : ""}
              {c.teacher_id !== auth.session?.user.id && <span className="chip ml-2 text-xs">de otro docente</span>}
            </p>
            <button className="chip py-1.5" onClick={() => navigator.clipboard?.writeText(c.join_code)} title="Copiar código">
              Código: <span className="ml-1 font-display text-lg tracking-widest text-neon-lima">{c.join_code}</span> 📋
            </button>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-5 w-5 accent-guardia"
              checked={c.allow_spicy}
              onChange={async (e) => {
                try {
                  await teacherCloud.updateCourse(c.id, { allow_spicy: e.target.checked });
                  await load();
                } catch (x) {
                  setErr((x as Error).message);
                }
              }}
            />
            Permitir el modo «Profesor sin filtro» (+18) en este curso
          </label>
          <p className="text-xs text-white/50">Los estudiantes ingresan el código al crear la cuenta o desde «Mi cuenta».</p>
        </div>
      ))}
    </div>
  );
}

/* ───────── Usuarios (sólo admin) ───────── */
function Users() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState("");
  const [err, setErr] = useState("");
  const load = () =>
    Promise.all([teacherCloud.listUsers(), teacherCloud.listCourses()])
      .then(([u, c]) => {
        setUsers(u);
        setCourses(c);
      })
      .catch((e) => setErr(e.message));
  useEffect(() => void load(), []);
  const list = users.filter((u) => u.full_name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <input className="input" placeholder="Buscar por nombre…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      {err && <p className="text-sm text-guardia">⚠ {err}</p>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-white/60">
              <th className="py-1">Nombre</th>
              <th>Curso</th>
              <th>Rol</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id} className="border-t border-white/10">
                <td className="py-1.5">{u.full_name || "(sin nombre)"}</td>
                <td className="text-white/60">{courses.find((c) => c.id === u.course_id)?.name ?? "—"}</td>
                <td>
                  <select
                    className="rounded-lg border border-white/15 bg-noche-950 px-2 py-1"
                    value={u.role}
                    onChange={async (e) => {
                      if (!confirm(`¿Cambiar el rol de ${u.full_name} a ${e.target.value}?`)) return;
                      try {
                        await teacherCloud.setRole(u.id, e.target.value as Role);
                        await load();
                      } catch (x) {
                        setErr((x as Error).message);
                      }
                    }}
                  >
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ───────── Configuración (modo demo) ───────── */
function LocalConfig() {
  const [settings, setS] = useState<TeacherSettings>({ spicyAllowed: true });
  useEffect(() => setS(getSettings()), []);
  return (
    <div className="card flex flex-col gap-4">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-guardia"
          checked={settings.spicyAllowed}
          onChange={(e) => {
            const s = { ...settings, spicyAllowed: e.target.checked };
            setS(s);
            setSettings(s);
          }}
        />
        <span>
          <strong>Permitir el modo «Profesor sin filtro» (+18)</strong>
          <br />
          <span className="text-sm text-white/60">
            Si se desactiva, quienes lo tenían elegido pasan automáticamente al modo irónico sin palabrotas. En errores graves el tono es siempre profesional.
          </span>
        </span>
      </label>
      <p className="text-xs text-white/40">Modo demo: esta configuración se guarda en este navegador. Con cuentas se configura por curso.</p>
    </div>
  );
}

/* ───────── Utilidades ───────── */
function Kpi({ label, value, suffix = "", danger }: { label: string; value: number | null; suffix?: string; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <p className={`font-display text-xl ${danger && value ? "text-guardia" : ""}`}>{value === null ? "—" : `${value}${suffix}`}</p>
      <p className="text-xs text-white/60">{label}</p>
    </div>
  );
}

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/50">{label}</span>
      {children}
    </div>
  );
}

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
