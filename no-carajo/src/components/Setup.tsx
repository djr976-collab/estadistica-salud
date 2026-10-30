"use client";

import { useEffect, useState } from "react";
import { MODULES } from "@/data/modules";
import { PERSONALITIES } from "@/lib/personality";
import { spicyAvailable } from "@/lib/settings";
import { sttSupported } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import type { GameConfig, GameMode, Level } from "@/lib/types";

const MODES: { id: GameMode; name: string; icon: string; desc: string }[] = [
  { id: "duelo", name: "Duelo con el profesor", icon: "⚔️", desc: "Preguntas consecutivas con puntaje y racha." },
  { id: "guardia", name: "Guardia de enfermería", icon: "🌙", desc: "Caso clínico con decisiones progresivas." },
  { id: "codigo-rojo", name: "Código rojo", icon: "⏱️", desc: "Contrarreloj de urgencias y seguridad." },
  { id: "examen", name: "Examen final", icon: "🎓", desc: "Integrador, sin pistas ni segundo intento." },
  { id: "revancha", name: "Revancha", icon: "🥊", desc: "Tus errores, reformulados." },
];

const LEVELS: { id: Level; name: string }[] = [
  { id: "basico", name: "Básico" },
  { id: "intermedio", name: "Intermedio" },
  { id: "avanzado", name: "Avanzado" },
];

export default function Setup({
  initial,
  pendingRevancha,
  onStart,
}: {
  initial: GameConfig;
  pendingRevancha: number;
  onStart: (c: GameConfig) => void;
}) {
  const [cfg, setCfg] = useState<GameConfig>(initial);
  const [adultOk, setAdultOk] = useState(false);
  const [spicyOn, setSpicyOn] = useState(true);
  const [micOk, setMicOk] = useState(true);

  useEffect(() => {
    setSpicyOn(spicyAvailable());
    setMicOk(sttSupported());
    if (initial.personality === "sinfiltro") setCfg((c) => ({ ...c, personality: "ironico" }));
  }, [initial.personality]);

  const set = (patch: Partial<GameConfig>) => {
    sfx.click();
    setCfg((c) => ({ ...c, ...patch }));
  };

  const needsModule = cfg.mode === "duelo";
  const canStart =
    (cfg.mode !== "revancha" || pendingRevancha > 0) && (cfg.personality !== "sinfiltro" || (adultOk && spicyOn));

  return (
    <section className="rise flex flex-col gap-5">
      <Block title="1 · Modalidad">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODES.map((m) => {
            const disabled = m.id === "revancha" && pendingRevancha === 0;
            return (
              <button
                key={m.id}
                disabled={disabled}
                onClick={() => set({ mode: m.id, count: m.id === "revancha" ? Math.min(10, pendingRevancha) : cfg.count })}
                className={`card flex items-start gap-3 text-left transition disabled:opacity-40 ${
                  cfg.mode === m.id ? "border-neon-cyan shadow-neon" : "hover:border-white/30"
                }`}
              >
                <span className="text-2xl">{m.icon}</span>
                <span>
                  <span className="block font-bold">{m.name}</span>
                  <span className="text-sm text-white/60">
                    {disabled ? "Todavía no tenés errores para revisar." : m.id === "revancha" ? `${m.desc} (${pendingRevancha})` : m.desc}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Block>

      {needsModule && (
        <Block title="2 · Módulo">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ModuleBtn active={cfg.moduleId === "todos"} onClick={() => set({ moduleId: "todos" })} icon="🎲" label="Mixto (todos)" color="#ffffff" />
            {MODULES.map((m) => (
              <ModuleBtn
                key={m.id}
                active={cfg.moduleId === m.id}
                onClick={() => set({ moduleId: m.id })}
                icon={m.icon}
                label={`${m.number}. ${m.short}`}
                color={m.color}
                title={m.title}
              />
            ))}
          </div>
        </Block>
      )}

      <Block title={`${needsModule ? 3 : 2} · Personalidad del Jefe`}>
        <div className="grid gap-2">
          {PERSONALITIES.map((p) => {
            const locked = p.adult && !spicyOn;
            return (
              <button
                key={p.id}
                disabled={locked}
                onClick={() => set({ personality: p.id })}
                className={`card text-left transition ${cfg.personality === p.id ? (p.adult ? "border-guardia shadow-rojo" : "border-neon-cyan shadow-neon") : "hover:border-white/30"}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{p.name}</span>
                  {p.adult && <span className="chip border-guardia/60 text-guardia">+18</span>}
                </div>
                <p className="text-sm text-white/60">{locked ? "Desactivado por el equipo docente." : p.desc}</p>
                <p className="mt-1 text-sm italic text-white/80">{p.sample}</p>
              </button>
            );
          })}
        </div>
        {cfg.personality === "sinfiltro" && (
          <label className="mt-3 flex items-start gap-3 rounded-xl border border-guardia/40 bg-guardia/10 p-3 text-sm">
            <input type="checkbox" className="mt-1 h-5 w-5 accent-guardia" checked={adultOk} onChange={(e) => setAdultOk(e.target.checked)} />
            <span>
              Soy mayor de 18 años y elijo voluntariamente el lenguaje fuerte. Sé que puedo desactivarlo en cualquier momento y que
              en los errores graves el Jefe siempre habla en tono profesional.
            </span>
          </label>
        )}
      </Block>

      <Block title={`${needsModule ? 4 : 3} · Ajustes`}>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="mb-2 text-sm text-white/60">Dificultad</p>
            <Segmented options={LEVELS.map((l) => ({ id: l.id, label: l.name }))} value={cfg.level} onChange={(v) => set({ level: v as Level })} />
          </div>
          <div>
            <p className="mb-2 text-sm text-white/60">Preguntas</p>
            <Segmented
              options={[5, 10, 15].map((n) => ({ id: String(n), label: String(n) }))}
              value={String(cfg.count)}
              onChange={(v) => set({ count: Number(v) })}
              disabled={cfg.mode === "guardia"}
            />
          </div>
          <div>
            <p className="mb-2 text-sm text-white/60">Respuesta</p>
            <Segmented
              options={[
                { id: "escrita", label: "✍️ Escrita" },
                { id: "oral", label: "🎙️ Oral" },
              ]}
              value={cfg.answerMode}
              onChange={(v) => set({ answerMode: v as GameConfig["answerMode"] })}
            />
            {cfg.answerMode === "oral" && !micOk && (
              <p className="mt-1 text-xs text-amber-300">Tu navegador no soporta dictado: vas a poder responder escribiendo o con botones.</p>
            )}
          </div>
        </div>
      </Block>

      <button className="btn-primary sticky bottom-4 text-lg" disabled={!canStart} onClick={() => onStart(cfg)}>
        🚑 ¡A la guardia!
      </button>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 font-display text-sm uppercase tracking-widest text-neon-cyan">{title}</h2>
      {children}
    </div>
  );
}

function ModuleBtn({ active, onClick, icon, label, color, title }: { active: boolean; onClick: () => void; icon: string; label: string; color: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex min-h-[56px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
        active ? "bg-white/10" : "border-white/10 bg-noche-900/70 hover:border-white/30"
      }`}
      style={active ? { borderColor: color, boxShadow: `0 0 14px ${color}66` } : undefined}
    >
      <span className="text-xl">{icon}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function Segmented({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex rounded-xl border border-white/10 bg-noche-950/60 p-1 ${disabled ? "opacity-40" : ""}`}>
      {options.map((o) => (
        <button
          key={o.id}
          disabled={disabled}
          onClick={() => onChange(o.id)}
          className={`min-h-[40px] flex-1 rounded-lg px-2 text-sm font-semibold transition ${value === o.id ? "bg-guardia text-white" : "text-white/70"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
