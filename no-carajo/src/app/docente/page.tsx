"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MODULES, moduleById } from "@/data/modules";
import { QUESTIONS } from "@/data/questions";
import {
  getCustomQuestions,
  getDisabledOfficial,
  getPendingAI,
  getSettings,
  setCustomQuestions,
  setDisabledOfficial,
  setPendingAI,
  setSettings,
  type TeacherSettings,
} from "@/lib/settings";
import { getAIStatus, aiGenerate } from "@/lib/ai-client";
import { CSV_EXAMPLE, importQuestions, toCSV } from "@/lib/csv";
import { getProgress, moduleStats } from "@/lib/progress";
import type { Level, Question, QuestionType } from "@/lib/types";

type Tab = "banco" | "editar" | "importar" | "ia" | "resultados" | "config";

const PIN = process.env.NEXT_PUBLIC_DEMO_ADMIN_PIN || "1234";

export default function DocentePage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [tab, setTab] = useState<Tab>("banco");
  const [custom, setCustom] = useState<Question[]>([]);
  const [pending, setPending] = useState<Question[]>([]);
  const [disabled, setDisabled] = useState<string[]>([]);
  const [settings, setS] = useState<TeacherSettings>({ spicyAllowed: true });
  const [editing, setEditing] = useState<Question | null>(null);

  useEffect(() => {
    setCustom(getCustomQuestions());
    setPending(getPendingAI());
    setDisabled(getDisabledOfficial());
    setS(getSettings());
    setUnlocked(sessionStorage.getItem("nc.docente") === "1");
  }, []);

  const saveCustom = (q: Question[]) => {
    setCustom(q);
    setCustomQuestions(q);
  };
  const savePending = (q: Question[]) => {
    setPending(q);
    setPendingAI(q);
  };

  if (!unlocked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
        <h1 className="font-display text-2xl text-guardia">Panel docente</h1>
        <p className="text-sm text-white/60">Acceso de demostración. En la versión con cuentas se usa autenticación con rol docente.</p>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (pin === PIN) {
              sessionStorage.setItem("nc.docente", "1");
              setUnlocked(true);
            } else alert("PIN incorrecto");
          }}
        >
          <input className="input" type="password" inputMode="numeric" placeholder="PIN docente" value={pin} onChange={(e) => setPin(e.target.value)} />
          <button className="btn-primary">Ingresar</button>
        </form>
        <Link href="/" className="text-center text-sm text-white/50 underline">
          Volver al juego
        </Link>
      </main>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "banco", label: "📚 Banco" },
    { id: "editar", label: editing ? "✏️ Editar" : "➕ Nueva" },
    { id: "importar", label: "📥 CSV/Excel" },
    { id: "ia", label: `🤖 IA${pending.length ? ` (${pending.length})` : ""}` },
    { id: "resultados", label: "📊 Resultados" },
    { id: "config", label: "⚙️ Config" },
  ];

  return (
    <main className="mx-auto max-w-4xl px-4 pb-16 pt-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-xl text-guardia">Panel docente</h1>
        <Link href="/" className="chip">
          ← Juego
        </Link>
      </header>
      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`chip whitespace-nowrap py-2 text-sm ${tab === t.id ? "border-neon-cyan text-neon-cyan" : ""}`}>
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "banco" && (
        <Bank
          custom={custom}
          disabled={disabled}
          onToggleOfficial={(id) => {
            const next = disabled.includes(id) ? disabled.filter((x) => x !== id) : [...disabled, id];
            setDisabled(next);
            setDisabledOfficial(next);
          }}
          onToggleCustom={(id) => saveCustom(custom.map((q) => (q.id === id ? { ...q, active: q.active === false } : q)))}
          onEdit={(q) => {
            setEditing(q);
            setTab("editar");
          }}
          onDelete={(id) => confirm("¿Eliminar la pregunta?") && saveCustom(custom.filter((q) => q.id !== id))}
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
          onSave={(q) => {
            const exists = custom.some((c) => c.id === q.id);
            saveCustom(exists ? custom.map((c) => (c.id === q.id ? q : c)) : [...custom, q]);
            setEditing(null);
            setTab("banco");
          }}
        />
      )}

      {tab === "importar" && <Importer onImport={(qs) => saveCustom([...custom, ...qs])} />}

      {tab === "ia" && (
        <AIReview
          pending={pending}
          onAdd={(qs) => savePending([...pending, ...qs])}
          onApprove={(q) => {
            saveCustom([...custom, { ...q, origin: "ia-aprobada", active: true }]);
            savePending(pending.filter((p) => p.id !== q.id));
          }}
          onEdit={(q) => {
            savePending(pending.filter((p) => p.id !== q.id));
            setEditing({ ...q, origin: "ia-aprobada" });
            setTab("editar");
          }}
          onDiscard={(id) => savePending(pending.filter((p) => p.id !== id))}
        />
      )}

      {tab === "resultados" && <Results />}

      {tab === "config" && (
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
          <p className="text-xs text-white/40">
            Prototipo: esta configuración se guarda en este navegador. En la fase 2 se guarda en Supabase y aplica a todo el curso.
          </p>
        </div>
      )}
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
  onToggleCustom: (id: string) => void;
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
                ["id", "origen", "activa", "modulo", "nivel", "tipo", "enunciado", "explicacion", "referencia"],
                ...all.map((q) => [q.id, q.origin ?? "", q.active === false ? "no" : "sí", q.moduleId, q.level, q.type, q.prompt, q.explanation, q.reference ?? ""]),
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
            {q.caseId && <span className="chip">caso {q.caseStep}</span>}
          </div>
          <p className="mt-2 font-semibold">{q.calc ? q.calc.template : q.prompt}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="chip py-1.5" onClick={() => (q.origin === "oficial" ? onToggleOfficial(q.id) : onToggleCustom(q.id))}>
              {q.active === false ? "Activar" : "Desactivar"}
            </button>
            {q.origin === "oficial" ? (
              <button className="chip py-1.5" onClick={() => onEdit({ ...q, id: `doc-${Date.now()}`, origin: "docente", calc: undefined })} disabled={q.type === "calc"}>
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
function Editor({ initial, onSave, onCancel }: { initial: Question | null; onSave: (q: Question) => void; onCancel: () => void }) {
  const [q, setQ] = useState<Question>(
    initial ?? { id: `doc-${Date.now()}`, moduleId: "bioseguridad", level: "basico", type: "mcq", prompt: "", options: ["", "", "", ""], answer: 0, explanation: "", origin: "docente", active: true },
  );
  const [concepts, setConcepts] = useState(
    (initial?.keyConcepts ?? []).map((c) => [c.label, ...c.synonyms.filter((s) => s !== c.label)].join(" | ")).join("\n"),
  );
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
      <Field label="Enunciado">
        <textarea className="input min-h-[80px]" value={q.prompt} onChange={(e) => set({ prompt: e.target.value })} />
      </Field>

      {q.type === "mcq" && (
        <Field label="Opciones (marcá la correcta; ⚠ = error grave de seguridad)">
          {(q.options ?? []).map((o, i) => (
            <div key={i} className="mb-2 flex items-center gap-2">
              <input type="radio" name="ans" className="h-5 w-5 accent-neon-lima" checked={q.answer === i} onChange={() => set({ answer: i })} />
              <input
                className="input"
                value={o}
                placeholder={`Opción ${"ABCD"[i]}`}
                onChange={(e) => set({ options: q.options!.map((x, j) => (j === i ? e.target.value : x)) })}
              />
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
                        ? {
                            options: [...opts],
                            risk: crit?.risk ?? "",
                            recovery: crit?.recovery ?? { prompt: "", options: ["", ""], answer: 0, explanation: "" },
                          }
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
            <textarea className="input min-h-[100px] font-mono text-sm" value={concepts} onChange={(e) => setConcepts(e.target.value)} placeholder={"paciente correcto | paciente | identificación\ndosis correcta | dosis"} />
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
        conceptos_clave (abiertas: grupos con «;» y sinónimos con «|»). Módulos: {MODULES.map((m) => m.id).join(", ")}.
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
            <button className="chip py-1.5 text-neon-lima" onClick={() => onApprove(q)} disabled={Boolean(q.critical)} title={q.critical ? "Tiene opciones críticas: editá el riesgo antes de aprobar" : ""}>
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

/* ───────── Resultados ───────── */
function Results() {
  const [p] = useState(() => getProgress());
  const stats = moduleStats(p);
  return (
    <div className="flex flex-col gap-3" id="reporte">
      <div className="card">
        <p className="text-sm text-amber-300">
          Prototipo: muestra los resultados guardados en <strong>este dispositivo</strong>. Las estadísticas grupales por curso requieren la fase 2 (Supabase), ya
          prevista en <code>supabase/schema.sql</code>.
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
