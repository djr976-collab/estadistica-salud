"use client";

import { useEffect, useState } from "react";
import { BADGES, getProgress, moduleStats, rankFor, recommendations, resetProgress, type Progress } from "@/lib/progress";
import { getBank } from "@/lib/settings";

export default function Stats({ onBack }: { onBack: () => void }) {
  const [p, setP] = useState<Progress | null>(null);
  useEffect(() => setP(getProgress()), []);
  if (!p) return null;

  const rank = rankFor(p.xp);
  const bank = getBank();
  const frequent = Object.entries(p.wrong)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, n]) => ({ q: bank.find((x) => x.id === id), n }))
    .filter((x) => x.q);

  return (
    <section className="rise flex flex-col gap-4">
      <div className="card">
        <p className="text-sm text-white/60">Nivel {rank.level}</p>
        <p className="font-display text-2xl text-neon-cyan">{rank.name}</p>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-lima" style={{ width: `${Math.round(rank.pct * 100)}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Kpi label="XP total" value={p.xp} />
          <Kpi label="Mejor racha" value={p.bestStreak} />
          <Kpi label="Sesiones" value={p.sessions} />
        </div>
      </div>

      <div className="card">
        <p className="font-display text-sm text-neon-cyan">DESEMPEÑO POR MÓDULO</p>
        <div className="mt-3 flex flex-col gap-2">
          {moduleStats(p).map(({ module, total, pct }) => (
            <div key={module.id} className="text-sm">
              <div className="flex justify-between">
                <span>
                  {module.icon} {module.short}
                </span>
                <span className="text-white/60">{pct === null ? "sin datos" : `${Math.round(pct * 100)}% · ${total} resp.`}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.round((pct ?? 0) * 100)}%`, background: pct !== null && pct < 0.7 ? "#ff2e4d" : module.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <p className="font-display text-sm text-neon-cyan">INSIGNIAS</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {BADGES.map((b) => {
            const has = p.badges.includes(b.id);
            return (
              <div key={b.id} className={`rounded-xl border p-3 text-sm ${has ? "border-neon-lima/50 bg-neon-lima/10" : "border-white/10 opacity-50 grayscale"}`}>
                <span className="text-2xl">{b.icon}</span>
                <p className="font-bold">{b.name}</p>
                <p className="text-xs text-white/60">{b.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {frequent.length > 0 && (
        <div className="card">
          <p className="font-display text-sm text-neon-cyan">ERRORES FRECUENTES (PENDIENTES DE REVANCHA)</p>
          <ul className="mt-2 space-y-2 text-sm">
            {frequent.map(({ q, n }) => (
              <li key={q!.id} className="flex justify-between gap-3 rounded-lg bg-white/5 p-2">
                <span>{q!.prompt}</span>
                <span className="shrink-0 text-guardia">×{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <p className="font-display text-sm text-neon-cyan">RECOMENDACIONES</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {(recommendations(p).length ? recommendations(p) : ["Jugá una guardia para empezar a medir tu progreso."]).map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button className="btn-ghost" onClick={onBack}>
          ← Volver
        </button>
        <button
          className="btn-ghost text-guardia"
          onClick={() => {
            if (confirm("¿Borrar todo tu progreso de este dispositivo?")) {
              resetProgress();
              setP(getProgress());
            }
          }}
        >
          Reiniciar progreso
        </button>
      </div>
      <p className="text-center text-xs text-white/40">En esta versión el progreso se guarda sólo en este dispositivo.</p>
    </section>
  );
}

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-2">
      <p className="font-display text-xl">{value}</p>
      <p className="text-xs text-white/60">{label}</p>
    </div>
  );
}
