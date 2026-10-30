import { test } from "node:test";
import assert from "node:assert/strict";
import { solveCalc } from "./calc.ts";
import { parseSpanishNumber } from "./text.ts";

test("goteo macrogotero 1000 mL / 8 h = 42 gotas/min", () => {
  assert.equal(solveCalc({ kind: "goteo", volumeMl: 1000, hours: 8, dropFactor: 20 }).value, 42);
});
test("microgotero: microgotas/min = mL/h", () => {
  assert.equal(solveCalc({ kind: "goteo", volumeMl: 500, hours: 24, dropFactor: 60 }).value, 21);
});
test("dosis 500 mg de 1 g/10 mL = 5 mL", () => {
  assert.equal(solveCalc({ kind: "dosis", orderedMg: 500, stockMg: 1000, stockMl: 10 }).value, 5);
});
test("bomba 100 mL en 30 min = 200 mL/h", () => {
  assert.equal(solveCalc({ kind: "mlh", volumeMl: 100, hours: 0.5 }).value, 200);
});
test("parsea números hablados y con coma", () => {
  assert.equal(parseSpanishNumber("cuarenta y dos gotas"), 42);
  assert.equal(parseSpanishNumber("41,7"), 41.7);
  assert.equal(parseSpanishNumber("veintiuno"), 21);
  assert.equal(parseSpanishNumber("cinco mililitros"), 5);
  assert.equal(parseSpanishNumber("ciento veinticinco"), 125);
  assert.equal(parseSpanishNumber("dos coma cinco"), 2.5);
  assert.equal(parseSpanishNumber("no sé"), null);
});
