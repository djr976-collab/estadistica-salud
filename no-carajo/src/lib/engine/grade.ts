import type { GradeResult, PlayableQuestion } from "../types";
import { fuzzyIncludes, normalize, parseSpanishNumber } from "./text.ts";

const LETTERS = ["a", "b", "c", "d", "e"];
const ORDINALS = ["primera", "segunda", "tercera", "cuarta", "quinta"];

/** Interpreta qué opción eligió el estudiante a partir de texto o voz. */
/** Cómo suelen transcribirse las letras habladas en español. */
const SPOKEN_LETTERS: Record<string, string> = { a: "a", be: "b", ve: "b", ce: "c", se: "c", de: "d", e: "e" };

export function parseChoice(input: string, options: string[]): number | null {
  const t = normalize(input).replace(/\b(be|ve|ce|se|de)\b$/, (w) => SPOKEN_LETTERS[w]);
  if (!t) return null;
  const m = t.match(/^(?:la |opcion |letra |es la |respuesta )*([a-e])$/) ?? t.match(/\b(?:opcion|letra|la)\s+([a-e])\b/);
  if (m) {
    const i = LETTERS.indexOf(m[1]);
    if (i >= 0 && i < options.length) return i;
  }
  const n = t.match(/^(?:la |opcion )?([1-5])$/);
  if (n) {
    const i = parseInt(n[1], 10) - 1;
    if (i < options.length) return i;
  }
  const o = ORDINALS.findIndex((w) => t.includes(w));
  if (o >= 0 && o < options.length) return o;
  // Coincidencia por contenido: la opción con más palabras significativas en común.
  let best = -1;
  let bestScore = 0;
  options.forEach((opt, i) => {
    const words = normalize(opt).split(" ").filter((w) => w.length > 3);
    const score = words.filter((w) => t.includes(w)).length / Math.max(words.length, 1);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  return bestScore >= 0.5 ? best : null;
}

export function parseTrueFalse(input: string): boolean | null {
  const t = normalize(input);
  if (/\b(verdadero|verdad|cierto|correcto|si|v|true)\b/.test(t) && !/\bno es (verdad|cierto|verdadero)\b/.test(t)) return true;
  if (/\b(falso|mentira|incorrecto|no|f|false)\b/.test(t)) return false;
  return null;
}

export interface StudentAnswer {
  choice?: number; // botón mcq
  tf?: boolean; // botón v/f
  text?: string; // escrito u oral
  viaVoice?: boolean;
}

/** Corrección determinista local. Para preguntas abiertas puede refinarse con IA. */
export function gradeLocal(q: PlayableQuestion, a: StudentAnswer): GradeResult {
  switch (q.type) {
    case "mcq": {
      const options = q.options ?? [];
      const choice = a.choice ?? (a.text ? parseChoice(a.text, options) : null);
      if (choice === null)
        return {
          verdict: "incorrecta",
          score: 0,
          feedback: "No pude identificar qué opción elegiste. Decí la letra (A, B, C o D) o tocá un botón.",
          expressionIssue: true,
          source: "local",
        };
      if (q.critical?.options?.includes(choice))
        return { verdict: "grave", score: 0, feedback: q.critical.risk, source: "local" };
      const ok = choice === q.answer;
      return { verdict: ok ? "correcta" : "incorrecta", score: ok ? 1 : 0, feedback: q.explanation, source: "local" };
    }
    case "tf": {
      const v = a.tf ?? (a.text ? parseTrueFalse(a.text) : null);
      if (v === null)
        return {
          verdict: "incorrecta",
          score: 0,
          feedback: "No entendí si dijiste verdadero o falso. Probá de nuevo.",
          expressionIssue: true,
          source: "local",
        };
      if (q.critical && q.critical.tfValue === v)
        return { verdict: "grave", score: 0, feedback: q.critical.risk, source: "local" };
      const ok = v === q.tfAnswer;
      return { verdict: ok ? "correcta" : "incorrecta", score: ok ? 1 : 0, feedback: q.explanation, source: "local" };
    }
    case "calc": {
      const sol = q.calcSolved!;
      const n = a.text ? parseSpanishNumber(a.text) : null;
      if (n === null)
        return {
          verdict: "incorrecta",
          score: 0,
          feedback: `No encontré un número en tu respuesta. El resultado es ${sol.value} ${sol.unit}.\n${sol.steps.join("\n")}`,
          expressionIssue: true,
          source: "local",
        };
      const diff = Math.abs(n - sol.value);
      if (diff <= sol.tolerance + 1e-9)
        return { verdict: "correcta", score: 1, feedback: `Exacto: ${sol.value} ${sol.unit}.\n${sol.steps.join("\n")}`, source: "local" };
      const ratio = n / sol.value;
      const unitSlip = [10, 100, 1000, 60, 3, 20].some((f) => Math.abs(ratio - f) < 0.02 || Math.abs(ratio - 1 / f) < 0.002);
      const close = diff / sol.value <= 0.05;
      return {
        verdict: close ? "parcial" : "incorrecta",
        score: close ? 0.5 : 0,
        feedback:
          (close
            ? `Muy cerca (${n}), pero revisá el redondeo: el resultado es ${sol.value} ${sol.unit}.`
            : unitSlip
              ? `Respondiste ${n}: eso huele a error de unidades o de conversión (horas↔minutos, mg↔g, factor de goteo). El resultado es ${sol.value} ${sol.unit}.`
              : `Respondiste ${n}, pero el resultado es ${sol.value} ${sol.unit}.`) + `\n${sol.steps.join("\n")}`,
        source: "local",
      };
    }
    case "open": {
      const text = a.text ?? "";
      const concepts = q.keyConcepts ?? [];
      const matched: string[] = [];
      const missing: string[] = [];
      let fuzzy = false;
      for (const c of concepts) {
        const hit = c.synonyms.map((s) => fuzzyIncludes(text, s)).find((r) => r.hit);
        if (hit) {
          matched.push(c.label);
          fuzzy ||= hit.fuzzy;
        } else missing.push(c.label);
      }
      const min = q.minConcepts ?? concepts.length;
      const verdict = matched.length >= min ? "correcta" : matched.length > 0 ? "parcial" : "incorrecta";
      const score = verdict === "correcta" ? 1 : Math.min(0.9, matched.length / Math.max(min, 1));
      return {
        verdict,
        score,
        matchedConcepts: matched,
        missingConcepts: missing,
        expressionIssue: fuzzy && a.viaVoice,
        feedback:
          (matched.length ? `Identificaste: ${matched.join("; ")}.` : "No identifiqué conceptos clave en tu respuesta.") +
          (verdict !== "correcta" && missing.length ? ` Te faltó: ${missing.join("; ")}.` : "") +
          `\n${q.explanation}`,
        source: "local",
      };
    }
  }
}
