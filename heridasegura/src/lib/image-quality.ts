// Control de calidad de imagen — HEURÍSTICAS LOCALES DETERMINISTAS (no es IA).
// Se ejecuta en el dispositivo; la imagen no se envía a terceros.

import type { PhotoQuality } from './types';

export const QUALITY_THRESHOLDS = {
  minShortSide: 720,      // px
  minBrightness: 60,      // 0–255
  maxBrightness: 215,
  minSharpness: 60,       // varianza del laplaciano sobre imagen reducida
  minContrast: 25,        // desvío estándar de luminancia
};

/** Analiza una imagen RGBA (ImageData.data) ya reducida. width/height: tamaño original. */
export function analyzePixels(
  data: Uint8ClampedArray, w: number, h: number, originalW: number, originalH: number,
): PhotoQuality {
  const n = w * h;
  const lum = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const y = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    lum[i] = y; sum += y;
  }
  const mean = sum / n;
  let varSum = 0;
  for (let i = 0; i < n; i++) varSum += (lum[i] - mean) ** 2;
  const contrast = Math.sqrt(varSum / n);
  // Laplaciano 4-vecinos
  let lapSum = 0, lapSq = 0, cnt = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = lum[i - 1] + lum[i + 1] + lum[i - w] + lum[i + w] - 4 * lum[i];
      lapSum += l; lapSq += l * l; cnt++;
    }
  }
  const lapMean = cnt ? lapSum / cnt : 0;
  const sharpness = cnt ? lapSq / cnt - lapMean * lapMean : 0;

  const T = QUALITY_THRESHOLDS;
  const warnings: string[] = [];
  if (Math.min(originalW, originalH) < T.minShortSide) warnings.push(`Resolución baja (${originalW}×${originalH} px).`);
  if (mean < T.minBrightness) warnings.push('Imagen subexpuesta (oscura). Mejore la iluminación sin flash directo.');
  if (mean > T.maxBrightness) warnings.push('Imagen sobreexpuesta o con reflejos. Evite el flash directo.');
  if (sharpness < T.minSharpness) warnings.push('Posible falta de nitidez (movimiento o foco). Repita la toma.');
  if (contrast < T.minContrast) warnings.push('Contraste bajo: verifique encuadre y fondo neutro.');
  return {
    width: originalW, height: originalH,
    brightness: Math.round(mean), sharpness: Math.round(sharpness), contrast: Math.round(contrast),
    warnings, acceptable: warnings.length === 0,
  };
}

/** Píxeles por centímetro a partir de dos puntos marcados sobre una referencia de escala conocida. */
export function calibrate(p1: { x: number; y: number }, p2: { x: number; y: number }, knownCm: number): number | null {
  if (!(knownCm > 0)) return null;
  const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  if (d < 20) return null; // referencia demasiado corta para calibrar con fiabilidad
  return d / knownCm;
}

export function pxToCm(px: number, pxPerCm: number | null): number | null {
  if (!pxPerCm || pxPerCm <= 0) return null; // sin calibración no se infieren centímetros
  return Math.round((px / pxPerCm) * 10) / 10;
}
