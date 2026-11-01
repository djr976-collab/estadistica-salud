import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS } from "../../data/questions.ts";
import { solveCalc } from "./calc.ts";
import { listCases } from "./session.ts";
import { gradeLocal } from "./grade.ts";
import type { PlayableQuestion } from "../types.ts";

test("ids únicos", () => {
  const ids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("cada pregunta es coherente", () => {
  for (const q of QUESTIONS) {
    assert.ok(q.explanation.length > 20, `${q.id}: explicación muy corta`);
    if (q.type === "mcq") {
      assert.ok(q.options && q.options.length >= 2, `${q.id}: opciones`);
      assert.ok(q.answer! >= 0 && q.answer! < q.options!.length, `${q.id}: respuesta fuera de rango`);
      assert.ok(!q.critical?.options?.includes(q.answer!), `${q.id}: la correcta está marcada como grave`);
      q.critical?.options?.forEach((o) => assert.ok(o < q.options!.length, `${q.id}: opción crítica inexistente`));
    }
    if (q.type === "tf") assert.equal(typeof q.tfAnswer, "boolean", `${q.id}: V/F sin respuesta`);
    if (q.type === "open") {
      assert.ok(q.keyConcepts?.length, `${q.id}: sin conceptos`);
      assert.ok((q.minConcepts ?? 0) <= q.keyConcepts!.length, `${q.id}: minConcepts > conceptos`);
    }
    if (q.type === "calc") {
      for (const spec of [q.calc!.base, ...(q.calc!.variants ?? [])]) assert.ok(Number.isFinite(solveCalc(spec).value), `${q.id}: cálculo`);
    }
    if (q.critical) {
      const r = q.critical.recovery;
      assert.ok(r.answer >= 0 && r.answer < r.options.length, `${q.id}: recuperación fuera de rango`);
      assert.ok(q.critical.risk.length > 20, `${q.id}: riesgo sin describir`);
    }
  }
});

test("la respuesta correcta nunca se califica como error grave y la crítica sí", () => {
  for (const q of QUESTIONS.filter((x) => x.type === "mcq")) {
    const p = { ...q, renderedPrompt: q.prompt } as PlayableQuestion;
    assert.equal(gradeLocal(p, { choice: q.answer }).verdict, "correcta", q.id);
    for (const c of q.critical?.options ?? []) assert.equal(gradeLocal(p, { choice: c }).verdict, "grave", q.id);
  }
});

test("casos clínicos: pasos 1..N consecutivos y con título", () => {
  const cases = listCases(QUESTIONS);
  assert.ok(cases.length >= 7, `hay ${cases.length} casos`);
  for (const c of cases) {
    const steps = QUESTIONS.filter((q) => q.caseId === c.caseId).map((q) => q.caseStep).sort((a, b) => a! - b!);
    assert.deepEqual(steps, steps.map((_, i) => i + 1), `${c.caseId}: pasos no consecutivos`);
    assert.notEqual(c.title, c.caseId, `${c.caseId}: sin título`);
    const first = QUESTIONS.find((q) => q.caseId === c.caseId && q.caseStep === 1)!;
    assert.ok(first.caseIntro, `${c.caseId}: el paso 1 necesita situación inicial`);
  }
});

test("abiertas: la explicación modelo se califica como correcta (sinónimos bien elegidos)", () => {
  const fails: string[] = [];
  for (const q of QUESTIONS.filter((x) => x.type === "open")) {
    const g = gradeLocal({ ...q, renderedPrompt: q.prompt } as PlayableQuestion, { text: q.explanation });
    if (g.verdict !== "correcta") fails.push(`${q.id} (${g.missingConcepts?.join(" | ")})`);
  }
  assert.deepEqual(fails, []);
});

test("abiertas: una respuesta vacía de contenido no se califica como correcta", () => {
  for (const q of QUESTIONS.filter((x) => x.type === "open")) {
    const g = gradeLocal({ ...q, renderedPrompt: q.prompt } as PlayableQuestion, { text: "no sé, la verdad no me acuerdo" });
    assert.notEqual(g.verdict, "correcta", q.id);
  }
});
