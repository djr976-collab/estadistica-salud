// Exportación CSV compatible con planillas en español (separador «;»),
// con BOM UTF-8 para conservar las tildes, comillas escapadas, saltos de línea
// dentro de celdas y neutralización de fórmulas (inyección CSV).

import { DIFFICULTY_LABEL, REVIEW_STATUS_LABEL, type Bank } from '../content/bank';
import type { GameState } from '../types';

export const CSV_SEPARATOR = ';';
const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '""';
    // Los números van sin comillas y con coma decimal para planillas en es-AR.
    return String(value).replace('.', ',');
  }
  let text = typeof value === 'boolean' ? (value ? 'sí' : 'no') : value;
  if (FORMULA_START.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(rows: (string | number | boolean | null)[][]): string {
  return '﻿' + rows.map((r) => r.map(csvCell).join(CSV_SEPARATOR)).join('\r\n') + '\r\n';
}

const CONTEXT_LABEL = {
  guardia: 'Mi guardia',
  recuperacion_critica: 'Recuperación crítica',
  repaso: 'Repasar mis errores',
  final: 'Desafío final',
} as const;

export function attemptsToRows(state: GameState, bank: Bank): (string | number | boolean | null)[][] {
  const header = [
    'n',
    'fecha_hora',
    'alias',
    'modo_contenido',
    'contexto',
    'categoria',
    'competencia',
    'pregunta_id',
    'concepto_id',
    'dificultad',
    'consigna',
    'respuesta_elegida',
    'mejor_respuesta',
    'resultado',
    'primer_intento_del_concepto',
    'pregunta_repetida',
    'error_critico',
    'puntos_de_juego',
    'estado_revision',
    'version_contenido',
  ];
  const rows: (string | number | boolean | null)[][] = [header];
  for (const a of state.attempts) {
    const q = bank.byId.get(a.questionId);
    const chosen =
      a.chosenOptionId !== null
        ? q?.options.find((o) => o.id === a.chosenOptionId)?.text ?? a.chosenOptionId
        : a.numericInput !== null
          ? `${a.numericInput}${q?.unit ? ` ${q.unit}` : ''}`
          : '';
    const best = q
      ? q.type === 'numeric'
        ? `${String(q.numericAnswer).replace('.', ',')} ${q.unit ?? ''} (tolerancia ±${String(q.tolerance ?? 0).replace('.', ',')})`.trim()
        : q.options.find((o) => o.id === q.correctOptionId)?.text ?? ''
      : '';
    rows.push([
      a.n,
      a.at,
      state.player.alias,
      state.contentMode === 'academic' ? 'académico' : 'demostración',
      CONTEXT_LABEL[a.context],
      bank.categoryById[a.category]?.name ?? a.category,
      q?.competency ?? '',
      a.questionId,
      a.conceptId,
      DIFFICULTY_LABEL[a.difficulty],
      q?.stem ?? '',
      chosen,
      best,
      a.correct ? 'correcta' : 'incorrecta',
      a.firstOnConcept,
      a.isRepeat,
      a.critical,
      a.points,
      q ? REVIEW_STATUS_LABEL[q.reviewStatus] : '',
      q?.contentVersion ?? '',
    ]);
  }
  return rows;
}

export function exportFileName(state: GameState, date = new Date()): string {
  const d = date.toISOString().slice(0, 10);
  const alias = state.player.alias.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
  return `guardia-de-preguntas_${alias || 'sin-alias'}_${d}.csv`;
}
