// Generador pseudoaleatorio con estado serializable (mulberry32).
// Guardar el estado en la partida evita "re-sortear" al recargar la página.

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  readonly state: number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  return {
    next() {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(maxExclusive: number) {
      return Math.floor(this.next() * maxExclusive);
    },
    get state() {
      return s;
    },
  };
}

export function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 2 ** 32);
}

/** Mezcla de Fisher-Yates que no modifica el arreglo original. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Elección ponderada. Devuelve -1 si ningún peso es positivo. */
export function weightedPick(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, w) => a + (w > 0 ? w : 0), 0);
  if (total <= 0) return -1;
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    if (weights[i] <= 0) continue;
    r -= weights[i];
    if (r < 0) return i;
  }
  for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
  return -1;
}
