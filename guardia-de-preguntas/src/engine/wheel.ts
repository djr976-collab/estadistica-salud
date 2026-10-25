// Geometría de la ruleta. El resultado se decide antes de animar y la
// rotación final se calcula para que el puntero (arriba) quede dentro del
// sector elegido.

import type { Rng } from './rng';

/** Ángulo central (grados, sentido horario desde arriba) del sector i. */
export function sectorCenter(index: number, sectors: number): number {
  const size = 360 / sectors;
  return index * size + size / 2;
}

const mod = (a: number, n: number) => ((a % n) + n) % n;

/**
 * Sector que queda bajo el puntero superior cuando la ruleta está rotada
 * `rotation` grados en sentido horario.
 */
export function sectorAtPointer(rotation: number, sectors: number): number {
  const size = 360 / sectors;
  const angleUnderPointer = mod(-rotation, 360);
  return Math.floor(angleUnderPointer / size) % sectors;
}

/**
 * Rotación final (siempre mayor que la actual) que deja el sector `index`
 * bajo el puntero, con varias vueltas completas y un desvío aleatorio que
 * nunca se acerca a los bordes del sector.
 */
export function targetRotation(current: number, index: number, sectors: number, rng: Rng, turns = 5): number {
  const size = 360 / sectors;
  const maxJitter = size * 0.35;
  const jitter = (rng.next() * 2 - 1) * maxJitter;
  const desired = mod(-(sectorCenter(index, sectors) + jitter), 360);
  const base = current - mod(current, 360);
  let target = base + turns * 360 + desired;
  if (target - current < turns * 360) target += 360;
  return target;
}
