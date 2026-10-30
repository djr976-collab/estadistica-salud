import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeLocal, parseChoice, parseTrueFalse } from "./grade.ts";
import type { PlayableQuestion } from "../types.ts";

const opts = ["Bronquios principales", "Alvéolos pulmonares", "Tráquea", "Pleura visceral"];
test("elige opción por letra o contenido hablado", () => {
  assert.equal(parseChoice("la be", opts), 1);
  assert.equal(parseChoice("opción de", opts), 3);
  assert.equal(parseChoice("la b", opts), 1);
  assert.equal(parseChoice("opción C", opts), 2);
  assert.equal(parseChoice("en los alveolos pulmonares", opts), 1);
  assert.equal(parseChoice("segunda", opts), 1);
});
test("verdadero/falso hablado", () => {
  assert.equal(parseTrueFalse("es falso"), false);
  assert.equal(parseTrueFalse("Verdadero"), true);
  assert.equal(parseTrueFalse("sí"), true);
});
test("error grave se detecta", () => {
  const q = { id: "x", moduleId: "m", level: "basico", type: "mcq", prompt: "", renderedPrompt: "", options: opts, answer: 1, explanation: "", critical: { options: [0], risk: "riesgo", recovery: { prompt: "", options: [], answer: 0, explanation: "" } } } as PlayableQuestion;
  assert.equal(gradeLocal(q, { choice: 0 }).verdict, "grave");
  assert.equal(gradeLocal(q, { choice: 1 }).verdict, "correcta");
});
test("pregunta abierta parcial y completa", () => {
  const q = { id: "y", moduleId: "m", level: "basico", type: "open", prompt: "", renderedPrompt: "", explanation: "", minConcepts: 2,
    keyConcepts: [{ label: "sangre", synonyms: ["sangre"] }, { label: "tejidos", synonyms: ["tejidos"] }] } as PlayableQuestion;
  assert.equal(gradeLocal(q, { text: "poco oxigeno en sangre" }).verdict, "parcial");
  assert.equal(gradeLocal(q, { text: "en sangre y en los tejidos" }).verdict, "correcta");
});
test("cálculo con error de unidades", () => {
  const q = { id: "z", moduleId: "m", level: "basico", type: "calc", prompt: "", renderedPrompt: "", explanation: "",
    calcSolved: { value: 42, unit: "gotas/min", tolerance: 1, steps: [] } } as unknown as PlayableQuestion;
  assert.equal(gradeLocal(q, { text: "cuarenta y uno" }).verdict, "correcta");
  assert.equal(gradeLocal(q, { text: "2500" }).verdict, "incorrecta");
});
