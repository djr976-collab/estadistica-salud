"use client";

import { MODULES } from "@/data/modules";
import type { AnswerRecord, Level, Verdict } from "./types";
import { load, save } from "./storage";

const KEY = "nc.progress.v1";

export interface Progress {
  xp: number;
  bestStreak: number;
  sessions: number;
  history: AnswerRecord[];
  /** id de pregunta → cantidad de errores pendientes de revancha */
  wrong: Record<string, number>;
  badges: string[];
  graveCount: number;
}

const EMPTY: Progress = { xp: 0, bestStreak: 0, sessions: 0, history: [], wrong: {}, badges: [], graveCount: 0 };

export const getProgress = (): Progress => ({ ...EMPTY, ...load<Progress>(KEY, EMPTY) });
export const setProgress = (p: Progress) => save(KEY, { ...p, history: p.history.slice(-1000) });
export const resetProgress = () => save(KEY, EMPTY);

export const RANKS = [
  { min: 0, name: "Estudiante de 1.er año" },
  { min: 150, name: "Practicante de sala" },
  { min: 400, name: "Enfermero/a de piso" },
  { min: 800, name: "Referente de servicio" },
  { min: 1400, name: "Supervisor/a de turno" },
  { min: 2200, name: "Jefe/a de Guardia" },
];

export function rankFor(xp: number) {
  let idx = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.min) idx = i;
  });
  const next = RANKS[idx + 1];
  return {
    level: idx + 1,
    name: RANKS[idx].name,
    next: next?.min ?? null,
    pct: next ? (xp - RANKS[idx].min) / (next.min - RANKS[idx].min) : 1,
  };
}

const BASE_XP: Record<Level, number> = { basico: 10, intermedio: 15, avanzado: 20 };

/**
 * XP: premia el razonamiento (respuestas abiertas completas y cálculos valen más)
 * y la consistencia (racha). La velocidad sólo suma un mínimo en Código Rojo.
 */
export function xpFor(opts: { verdict: Verdict; level: Level; type: string; streak: number; fast?: boolean; retry?: boolean }) {
  if (opts.verdict === "grave" || opts.verdict === "incorrecta") return 0;
  let xp = BASE_XP[opts.level];
  if (opts.type === "open" || opts.type === "calc") xp += 5; // razonamiento explícito
  if (opts.verdict === "parcial") xp = Math.round(xp * 0.4);
  if (opts.retry) xp = Math.round(xp * 0.5);
  xp += Math.min(opts.streak, 5) * 2;
  if (opts.fast) xp += 2;
  return xp;
}

export const BADGES: { id: string; name: string; icon: string; desc: string; test: (p: Progress) => boolean }[] = [
  { id: "primera", name: "Primera guardia", icon: "🌙", desc: "Completaste tu primera sesión.", test: (p) => p.sessions >= 1 },
  { id: "racha5", name: "Racha x5", icon: "🔥", desc: "Cinco respuestas correctas seguidas.", test: (p) => p.bestStreak >= 5 },
  { id: "racha10", name: "Imparable", icon: "⚡", desc: "Diez correctas seguidas.", test: (p) => p.bestStreak >= 10 },
  { id: "manos", name: "Manos limpias", icon: "🧼", desc: "5 aciertos en Bioseguridad.", test: (p) => okIn(p, "bioseguridad") >= 5 },
  { id: "calcu", name: "Calculadora humana", icon: "🧮", desc: "5 cálculos correctos.", test: (p) => okIn(p, "calculos") >= 5 },
  { id: "farmaco", name: "Cinco correctos", icon: "💊", desc: "5 aciertos en Farmacología.", test: (p) => okIn(p, "farmaco") >= 5 },
  { id: "vital", name: "Ojo clínico", icon: "📈", desc: "5 aciertos en Signos vitales.", test: (p) => okIn(p, "signos") >= 5 },
  { id: "rcp", name: "Manos que salvan", icon: "🚑", desc: "5 aciertos en Urgencias.", test: (p) => okIn(p, "urgencias") >= 5 },
  { id: "revancha", name: "Revancha cumplida", icon: "🥊", desc: "Corregiste 5 errores previos.", test: (p) => p.history.filter((h) => h.revanchaOk).length >= 5 },
  { id: "xp1000", name: "Mil batallas", icon: "🏅", desc: "Alcanzaste 1000 XP.", test: (p) => p.xp >= 1000 },
];

function okIn(p: Progress, moduleId: string) {
  return p.history.filter((h) => h.moduleId === moduleId && h.verdict === "correcta").length;
}

export function newBadges(p: Progress): string[] {
  return BADGES.filter((b) => !p.badges.includes(b.id) && b.test(p)).map((b) => b.id);
}

export function moduleStats(p: Progress) {
  return MODULES.map((m) => {
    const rows = p.history.filter((h) => h.moduleId === m.id);
    const score = rows.reduce((s, r) => s + r.score, 0);
    return { module: m, total: rows.length, pct: rows.length ? score / rows.length : null };
  });
}

/** Recomendaciones simples: módulos con desempeño < 70% o errores graves recientes. */
export function recommendations(p: Progress): string[] {
  const out: string[] = [];
  const stats = moduleStats(p).filter((s) => s.total >= 2 && s.pct !== null && s.pct < 0.7);
  stats.sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));
  for (const s of stats.slice(0, 3))
    out.push(`Reforzá «${s.module.title}» (${Math.round((s.pct ?? 0) * 100)}% de desempeño).`);
  const pending = Object.keys(p.wrong).length;
  if (pending) out.push(`Tenés ${pending} pregunta(s) para la Revancha: es la mejor forma de fijar lo aprendido.`);
  const graves = p.history.slice(-30).filter((h) => h.verdict === "grave").length;
  if (graves) out.push(`Hubo ${graves} error(es) grave(s) de seguridad recientes: repasá Seguridad del paciente y Farmacología.`);
  if (!out.length && p.history.length) out.push("Buen equilibrio. Probá el Examen final o subí la dificultad.");
  return out;
}
