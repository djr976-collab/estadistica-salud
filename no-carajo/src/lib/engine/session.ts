import type { GameConfig, PlayableQuestion, Question } from "../types";
import { renderCalcTemplate, solveCalc } from "./calc.ts";

function shuffle<T>(arr: T[], rnd = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LEVEL_ORDER = { basico: 0, intermedio: 1, avanzado: 2 } as const;

/** Prepara una pregunta: instancia cálculos y, si se pide, reformula (Revancha). */
export function toPlayable(q: Question, reformulate = false): PlayableQuestion {
  if (q.type === "calc" && q.calc) {
    const pool = reformulate && q.calc.variants?.length ? q.calc.variants : [q.calc.base, ...(q.calc.variants ?? [])];
    const spec = reformulate ? pool[Math.floor(Math.random() * pool.length)] : q.calc.base;
    return { ...q, renderedPrompt: renderCalcTemplate(q.calc.template, spec), calcSolved: solveCalc(spec) };
  }
  if (q.type === "mcq" && q.options && reformulate) {
    const order = shuffle(q.options.map((_, i) => i));
    return {
      ...q,
      renderedPrompt: q.altPrompt ?? q.prompt,
      options: order.map((i) => q.options![i]),
      answer: order.indexOf(q.answer!),
      critical: q.critical && {
        ...q.critical,
        options: q.critical.options?.map((c) => order.indexOf(c)),
      },
      shuffledFrom: order,
    };
  }
  return { ...q, renderedPrompt: reformulate && q.altPrompt ? q.altPrompt : q.prompt };
}

export interface BuildOptions {
  bank: Question[];
  wrongIds?: string[];
}

/** Arma la secuencia de preguntas según modo, módulo y nivel. */
export function buildSession(cfg: GameConfig, { bank, wrongIds = [] }: BuildOptions): PlayableQuestion[] {
  const active = bank.filter((q) => q.active !== false);
  const maxLevel = LEVEL_ORDER[cfg.level];

  if (cfg.mode === "guardia") {
    const cases = [...new Set(active.filter((q) => q.caseId).map((q) => q.caseId!))];
    const caseId = shuffle(cases)[0];
    return active
      .filter((q) => q.caseId === caseId)
      .sort((a, b) => (a.caseStep ?? 0) - (b.caseStep ?? 0))
      .map((q) => toPlayable(q));
  }

  if (cfg.mode === "revancha") {
    const pool = active.filter((q) => wrongIds.includes(q.id));
    return shuffle(pool).slice(0, cfg.count).map((q) => toPlayable(q, true));
  }

  let pool = active.filter((q) => !q.caseId || cfg.mode === "examen");
  if (cfg.mode === "codigo-rojo") {
    // Contrarreloj: urgencias, seguridad y signos vitales; sin abiertas (exigen reflexión, no velocidad).
    pool = pool.filter((q) => ["urgencias", "seguridad", "signos", "farmaco", "bioseguridad"].includes(q.moduleId) && q.type !== "open");
  } else if (cfg.moduleId !== "todos" && cfg.mode !== "examen") {
    pool = pool.filter((q) => q.moduleId === cfg.moduleId);
  }
  const atLevel = pool.filter((q) => LEVEL_ORDER[q.level] <= maxLevel);
  const chosen = shuffle(atLevel.length >= cfg.count ? atLevel : pool).slice(0, cfg.count);
  // Si el módulo tiene pocas preguntas, se completa con otras del banco al mismo nivel.
  if (chosen.length < cfg.count && cfg.mode !== "codigo-rojo") {
    const extra = shuffle(active.filter((q) => !q.caseId && !chosen.includes(q) && LEVEL_ORDER[q.level] <= maxLevel));
    chosen.push(...extra.slice(0, cfg.count - chosen.length));
  }
  return chosen.map((q) => toPlayable(q));
}
