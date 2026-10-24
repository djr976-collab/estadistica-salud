// Evaluación de respuestas. La clave correcta se vincula siempre a un ID de
// opción, nunca a la posición en pantalla.

import type { Question } from '../types';

export type NumericParse =
  | { ok: true; value: number }
  | { ok: false; reason: 'empty' | 'not_number' | 'has_unit' };

/**
 * Interpreta un número escrito con coma o punto decimal.
 * Acepta signo (+/-) y espacios alrededor. Rechaza vacíos, letras y
 * expresiones. No admite separador de miles: "1.000" se lee como 1.
 */
export function parseNumericInput(raw: string): NumericParse {
  const text = raw.trim().replace(/\s+/g, '');
  if (text === '') return { ok: false, reason: 'empty' };
  if (/^[+-]?\d+([.,]\d+)?[a-zA-Zµ/%°]+.*$/.test(text)) return { ok: false, reason: 'has_unit' };
  if (!/^[+-]?(\d+([.,]\d+)?|[.,]\d+)$/.test(text)) return { ok: false, reason: 'not_number' };
  const value = Number(text.replace(',', '.'));
  if (!Number.isFinite(value)) return { ok: false, reason: 'not_number' };
  return { ok: true, value };
}

export const NUMERIC_ERROR_MESSAGE: Record<'empty' | 'not_number' | 'has_unit', string> = {
  empty: 'Escribí un número antes de confirmar.',
  not_number: 'Escribí solo un número, con coma o punto decimal (por ejemplo, 1,5 o 1.5).',
  has_unit: 'Escribí solo el número: la unidad ya está indicada al lado del casillero.',
};

export function isNumericCorrect(q: Question, value: number): boolean {
  if (q.numericAnswer === null) return false;
  const tol = q.tolerance ?? 0;
  // Margen mínimo para errores de representación en coma flotante.
  return Math.abs(value - q.numericAnswer) <= tol + 1e-9;
}

export function isChoiceCorrect(q: Question, optionId: string): boolean {
  return q.correctOptionId !== null && optionId === q.correctOptionId;
}

/** Recalcula una respuesta numérica a partir de sus datos (verificación independiente). */
export function recomputeNumeric(q: Question): number | null {
  const c = q.numericCheck;
  if (!c) return null;
  const n = (k: string) => c.inputs[k] as number;
  const sum = (k: string) => (c.inputs[k] as number[]).reduce((a, b) => a + b, 0);
  switch (c.formula) {
    case 'volumen_dosis':
      return n('dosis_mg') / (n('presentacion_mg') / n('presentacion_ml'));
    case 'conversion_mg_mcg':
      return n('mg') * 1000;
    case 'goteo':
      return (n('volumen_ml') * n('factor_gotas_ml')) / (n('horas') * 60);
    case 'velocidad_bomba':
      return n('volumen_ml') / n('horas');
    case 'balance':
      return sum('ingresos') - sum('egresos');
    case 'pam':
      return (n('pas') + 2 * n('pad')) / 3;
    default:
      return null;
  }
}

/** Formato argentino: coma decimal. */
export function formatNumber(value: number, maxDecimals = 2): string {
  return value.toLocaleString('es-AR', { maximumFractionDigits: maxDecimals });
}
