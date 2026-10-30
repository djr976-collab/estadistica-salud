"use client";

import { useEffect, useState } from "react";
import Jefe from "./Jefe";
import type { SessionResult } from "./Play";
import { moduleById } from "@/data/modules";
import { BADGES, getProgress, rankFor, recommendations } from "@/lib/progress";
import { effectivePersonality, line } from "@/lib/personality";
import { spicyAvailable } from "@/lib/settings";
import type { GameConfig } from "@/lib/types";

export default function Summary({
  result,
  config,
  say,
  onRetry,
  onRevancha,
  onHome,
  onStats,
}: {
  result: SessionResult;
  config: GameConfig;
  say: (t: string) => void;
  onRetry: () => void;
  onRevancha: (n: number) => void;
  onHome: () => void;
  onStats: () => void;
}) {
  const total = result.items.length;
  const score = result.items.reduce((s, i) => s + i.grade.score, 0);
  const pct = total ? Math.round((score / total) * 100) : 0;
  const good = pct >= 70 && result.graves === 0;
  const [closing, setClosing] = useState("");
  const [recs, setRecs] = useState<string[]>([]);
  const [pending, setPending] = useState(0);
  const before = rankFor(result.xpBefore);
  const after = rankFor(result.xpAfter);

  useEffect(() => {
    const p = effectivePersonality(config.personality, spicyAvailable());
    const l = line(p, good ? "cierreBueno" : "cierreMalo");
    setClosing(l);
    say(`${l} Obtuviste ${pct} por ciento.`);
    const prog = getProgress();
    setRecs(recommendations(prog));
    setPending(Object.keys(prog.wrong).length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="rise flex flex-col gap-4">
      <div className="card flex flex-col items-center gap-2 text-center">
        <Jefe mood={good ? "happy" : result.graves ? "alarm" : "wrong"} size={150} />
        <p className="font-semibold text-white/80">{closing}</p>
        <p className={`font-display text-6xl ${pct >= 70 ? "text-neon-lima" : pct >= 50 ? "text-amber-300" : "text-guardia"}`}>{pct}%</p>
        <div className="flex flex-wrap justify-center gap-2 text-sm">
          <span className="chip">✅ {result.items.filter((i) => i.grade.verdict === "correcta").length}/{total}</span>
          <span className="chip">⭐ +{result.xp} XP</span>
          <span className="chip">🔥 Racha máx. {result.bestStreak}</span>
          {result.graves > 0 && <span className="chip border-guardia/60 text-guardia">⚠ {result.graves} error(es) grave(s)</span>}
        </div>
        <div className="mt-2 w-full max-w-sm">
          <div className="flex justify-between text-xs text-white/60">
            <span>
              Nivel {after.level}: {after.name}
            </span>
            {after.next && <span>{result.xpAfter}/{after.next} XP</span>}
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full bg-gradient-to-r from-neon-cyan to-neon-lima" style={{ width: `${Math.round(after.pct * 100)}%` }} />
          </div>
          {after.level > before.level && <p className="mt-2 font-display text-neon-lima">⬆ ¡Subiste de nivel!</p>}
        </div>
      </div>

      {result.newBadges.length > 0 && (
        <div className="card">
          <p className="font-display text-sm text-neon-cyan">INSIGNIAS NUEVAS</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {result.newBadges.map((id) => {
              const b = BADGES.find((x) => x.id === id)!;
              return (
                <span key={id} className="rise chip border-neon-lima/50 py-2 text-sm text-neon-lima">
                  {b.icon} {b.name}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div className="card">
          <p className="font-display text-sm text-neon-cyan">RECOMENDACIONES DEL JEFE</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/85">
            {recs.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card">
        <p className="font-display text-sm text-neon-cyan">REPASO PREGUNTA POR PREGUNTA</p>
        <div className="mt-2 flex flex-col gap-2">
          {result.items.map((it, i) => (
            <details key={i} className="rounded-xl border border-white/10 bg-white/[.03] p-3">
              <summary className="cursor-pointer list-none">
                <span className="mr-2">{icon(it.grade.verdict)}</span>
                <span className="text-sm">
                  {moduleById(it.q.moduleId)?.icon} {it.q.renderedPrompt}
                </span>
                {it.retried && <span className="chip ml-2">2.º intento</span>}
              </summary>
              <p className="mt-2 text-sm text-white/60">Tu respuesta: {it.answer || "—"}</p>
              <p className="mt-2 whitespace-pre-line text-sm text-white/85">{it.grade.feedback}</p>
            </details>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {pending > 0 && (
          <button className="btn-neon" onClick={() => onRevancha(pending)}>
            🥊 Revancha ({pending})
          </button>
        )}
        <button className="btn-primary" onClick={onRetry}>
          🔁 Otra guardia
        </button>
        <button className="btn-ghost" onClick={onStats}>
          📊 Mi progreso
        </button>
        <button className="btn-ghost" onClick={onHome}>
          🏠 Inicio
        </button>
      </div>
    </section>
  );
}

function icon(v: string) {
  return v === "correcta" ? "✅" : v === "parcial" ? "🟡" : v === "grave" ? "⚠️" : "❌";
}
