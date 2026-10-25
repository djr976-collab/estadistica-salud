// Validación del banco de contenidos. Se ejecuta en las pruebas y antes de
// compilar (npm run validate:content). Los errores bloquean; las advertencias
// orientan la revisión docente.

import type { Bank } from './bank';
import type { Question } from '../types';
import { recomputeNumeric } from '../engine/evaluate';

export interface ValidationReport {
  errors: string[];
  warnings: string[];
}

const BANNED = [/todas las anteriores/i, /ninguna de las anteriores/i, /ninguna es correcta/i];

/** `requireFinal`: el banco de PP2 debe traer el desafío final; las materias no. */
export function validateBank(bank: Bank, opts: { requireFinal?: boolean } = { requireFinal: true }): ValidationReport {
  const areaIds = bank.categories.map((c) => c.id);
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set<string>();

  for (const q of bank.questions) {
    const where = `[${q.id}]`;
    if (ids.has(q.id)) errors.push(`${where} id duplicado`);
    ids.add(q.id);
    if (!areaIds.includes(q.category)) errors.push(`${where} categoría inválida: ${q.category}`);
    if (!q.stem.trim()) errors.push(`${where} consigna vacía`);
    if (!q.rationale.trim()) errors.push(`${where} sin fundamento`);
    if (!q.transferPrinciple?.trim()) errors.push(`${where} sin principio trasladable`);
    if (!q.competency.trim()) errors.push(`${where} sin competencia`);
    if (q.sources.length === 0) errors.push(`${where} sin fuentes`);
    for (const s of q.sources) if (!bank.sources.has(s.ref)) errors.push(`${where} fuente inexistente: ${s.ref}`);
    if (!['draft', 'reviewed', 'approved'].includes(q.reviewStatus)) errors.push(`${where} reviewStatus inválido`);
    if (q.criticalSafety && !q.riskNote) errors.push(`${where} crítica sin riskNote`);
    if (q.criticalSafety && !q.isRecoveryVariant && !q.recoveryQuestionId) errors.push(`${where} crítica sin variante de recuperación`);
    if (q.recoveryQuestionId) {
      const r = bank.byId.get(q.recoveryQuestionId);
      if (!r) errors.push(`${where} recoveryQuestionId inexistente: ${q.recoveryQuestionId}`);
      else {
        if (r.conceptId !== q.conceptId) errors.push(`${where} la variante ${r.id} no comparte conceptId`);
        if (r.stem === q.stem) errors.push(`${where} la variante ${r.id} repite la consigna`);
      }
    }
    for (const re of BANNED) {
      const texts = [q.stem, ...q.options.map((o) => o.text)];
      if (texts.some((t) => re.test(t))) errors.push(`${where} contiene una fórmula prohibida (${re})`);
    }

    if (q.type === 'single_choice') validateChoice(q, errors, warnings);
    else if (q.type === 'numeric') validateNumeric(q, errors);
    else warnings.push(`${where} tipo ${q.type} todavía sin interfaz: no se usa en la partida`);
  }

  // Cobertura y distribución.
  const base = bank.questions.filter((q) => !q.isRecoveryVariant && !q.finalChallenge);
  for (const c of areaIds) {
    const inCat = base.filter((q) => q.category === c);
    if (inCat.length < bank.config.completion.distinctResolved) errors.push(`Categoría ${c}: menos preguntas que las necesarias para la insignia`);
    if (!inCat.some((q) => q.difficulty !== 'conceptual')) errors.push(`Categoría ${c}: no tiene preguntas de aplicación`);
    if (!inCat.some((q) => q.format === 'error_seguridad' || q.criticalSafety)) warnings.push(`Categoría ${c}: sin situación de seguridad`);
  }
  if (opts.requireFinal) {
    for (const id of bank.final.stepQuestionIds) if (!bank.byId.get(id)?.finalChallenge) errors.push(`Paso final ${id} inexistente`);
    if (bank.final.stepQuestionIds.length !== 3) errors.push('El desafío final debe tener tres decisiones');
  }

  // Pista sistemática: si la correcta suele ser la más larga, el jugador aprende a elegir por extensión.
  const choice = bank.questions.filter((q) => q.type === 'single_choice');
  const longest = choice.filter((q) => {
    const max = Math.max(...q.options.map((o) => o.text.length));
    return q.options.find((o) => o.id === q.correctOptionId)?.text.length === max;
  });
  if (choice.length > 0 && longest.length / choice.length > 0.4) {
    errors.push(`La opción correcta es la más larga en ${longest.length} de ${choice.length} preguntas (máximo admitido: 40 %)`);
  }
  // La pista inversa también existe: si la correcta suele ser la más breve.
  const shortest = choice.filter((q) => {
    const min = Math.min(...q.options.map((o) => o.text.length));
    return q.options.find((o) => o.id === q.correctOptionId)?.text.length === min;
  });
  if (choice.length > 0 && shortest.length / choice.length > 0.4) {
    errors.push(`La opción correcta es la más corta en ${shortest.length} de ${choice.length} preguntas (máximo admitido: 40 %)`);
  }
  return { errors, warnings };
}

function validateChoice(q: Question, errors: string[], warnings: string[]) {
  const where = `[${q.id}]`;
  if (q.options.length < 3) errors.push(`${where} menos de 3 opciones`);
  const optIds = new Set(q.options.map((o) => o.id));
  if (optIds.size !== q.options.length) errors.push(`${where} ids de opción duplicados`);
  if (!q.correctOptionId || !optIds.has(q.correctOptionId)) errors.push(`${where} correctOptionId no corresponde a ninguna opción`);
  for (const o of q.options) {
    if (!o.text.trim()) errors.push(`${where} opción ${o.id} vacía`);
    if (!o.feedback.trim()) errors.push(`${where} opción ${o.id} sin devolución específica`);
  }
  const texts = q.options.map((o) => o.text.trim().toLowerCase());
  if (new Set(texts).size !== texts.length) errors.push(`${where} opciones con texto repetido`);
  // Pista por extensión: la correcta no debería destacarse por ser mucho más larga.
  const correct = q.options.find((o) => o.id === q.correctOptionId);
  if (correct) {
    const others = q.options.filter((o) => o !== correct).map((o) => o.text.length);
    const maxOther = Math.max(...others);
    if (correct.text.length > maxOther * 1.45) warnings.push(`${where} la opción correcta es bastante más larga que las demás (${correct.text.length} vs ${maxOther})`);
  }
}

function validateNumeric(q: Question, errors: string[]) {
  const where = `[${q.id}]`;
  if (q.numericAnswer === null || !Number.isFinite(q.numericAnswer)) errors.push(`${where} sin numericAnswer`);
  if (!q.unit) errors.push(`${where} sin unidad explícita`);
  if (q.tolerance === null || q.tolerance < 0) errors.push(`${where} sin tolerancia definida`);
  if (!q.rounding) errors.push(`${where} sin regla de redondeo`);
  if (!q.numericCheck) errors.push(`${where} sin datos para el cálculo independiente`);
  if (q.options.length > 0) errors.push(`${where} numérica con opciones`);
  const r = recomputeNumeric(q);
  if (r === null) errors.push(`${where} no se pudo recalcular`);
  else if (q.numericAnswer !== null && Math.abs(r - q.numericAnswer) > Math.max(q.tolerance ?? 0, 0.01)) {
    errors.push(`${where} el cálculo independiente da ${r} y el banco dice ${q.numericAnswer}`);
  }
}
