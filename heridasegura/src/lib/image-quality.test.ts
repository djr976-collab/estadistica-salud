import { describe, expect, it } from 'vitest';
import { analyzePixels, calibrate, pxToCm } from './image-quality';

function img(w: number, h: number, fn: (x: number, y: number) => number) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = fn(x, y); const i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  return d;
}

describe('Calidad de imagen (heurística)', () => {
  it('detecta imagen oscura y sin nitidez', () => {
    const q = analyzePixels(img(64, 64, () => 20), 64, 64, 1920, 1080);
    expect(q.acceptable).toBe(false);
    expect(q.warnings.join()).toMatch(/subexpuesta/);
    expect(q.warnings.join()).toMatch(/nitidez/);
  });
  it('acepta imagen con detalle y exposición correcta', () => {
    const q = analyzePixels(img(64, 64, (x, y) => ((x + y) % 2 ? 190 : 60)), 64, 64, 1920, 1080);
    expect(q.acceptable).toBe(true);
  });
  it('advierte baja resolución', () => {
    const q = analyzePixels(img(64, 64, (x, y) => ((x + y) % 2 ? 190 : 60)), 64, 64, 640, 480);
    expect(q.warnings.join()).toMatch(/Resolución/);
  });
});

describe('Calibración', () => {
  it('no infiere centímetros sin calibración', () => expect(pxToCm(200, null)).toBeNull());
  it('calcula px/cm con referencia conocida', () => {
    const k = calibrate({ x: 0, y: 0 }, { x: 300, y: 0 }, 3)!;
    expect(k).toBe(100);
    expect(pxToCm(250, k)).toBe(2.5);
  });
  it('rechaza referencias demasiado cortas', () => expect(calibrate({ x: 0, y: 0 }, { x: 5, y: 0 }, 1)).toBeNull());
});

import { polygonAreaCm2, polygonAreaPx } from './image-quality';
describe('Planimetría por trazado', () => {
  const square = [{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }, { x: 0, y: 100 }];
  it('área en px² independiente del sentido del trazado', () => {
    expect(polygonAreaPx(square)).toBe(20000);
    expect(polygonAreaPx([...square].reverse())).toBe(20000);
  });
  it('convierte a cm² solo con calibración', () => {
    expect(polygonAreaCm2(square, 100)).toBe(2);
    expect(polygonAreaCm2(square, null)).toBeNull();
  });
  it('requiere al menos 3 puntos', () => expect(polygonAreaCm2(square.slice(0, 2), 100)).toBeNull());
});
