import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeProgress } from "./merge.ts";

const base = { xp: 0, bestStreak: 0, sessions: 0, graveCount: 0, badges: [] as string[], wrong: {} as Record<string, number> };

test("conserva lo mejor de cada dispositivo", () => {
  const local = { ...base, xp: 120, bestStreak: 3, badges: ["primera"], wrong: { a: 1 }, updatedAt: 100, history: [1] };
  const remote = { ...base, xp: 90, bestStreak: 7, sessions: 4, badges: ["racha5"], wrong: { b: 2 }, updatedAt: 200 };
  const m = mergeProgress(local, remote);
  assert.equal(m.xp, 120);
  assert.equal(m.bestStreak, 7);
  assert.equal(m.sessions, 4);
  assert.deepEqual(m.badges.sort(), ["primera", "racha5"]);
  assert.deepEqual(m.wrong, { b: 2 }); // la nube es más reciente
  assert.deepEqual(m.history, [1]); // el historial local se mantiene
});

test("si lo local es más reciente, su lista de Revancha gana", () => {
  const m = mergeProgress({ ...base, wrong: {}, updatedAt: 300 }, { ...base, wrong: { x: 1 }, updatedAt: 200 });
  assert.deepEqual(m.wrong, {});
});
