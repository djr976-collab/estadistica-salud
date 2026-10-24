// Resumen de aprendizaje con denominadores explícitos.

import { DIFFICULTY_LABEL, type Bank } from '../content/bank';
import type { CategoryId, GameState } from '../types';
import { categoryStats, totalPoints } from './game';

export interface Ratio {
  num: number;
  den: number;
}

export interface Summary {
  alias: string;
  contentMode: GameState['contentMode'];
  categoriesWorked: Ratio;
  badges: Ratio;
  /** Preguntas distintas presentadas y respondidas al menos una vez. */
  distinctAnswered: number;
  totalAttempts: number;
  firstTryCorrect: Ratio;
  recoveries: Ratio;
  pendingConcepts: { conceptId: string; category: CategoryId; competency: string; critical: boolean }[];
  criticalErrors: { conceptId: string; competency: string; resolved: boolean }[];
  recommendations: string[];
  points: number;
  finalStatus: GameState['final']['status'];
  perCategory: {
    category: CategoryId;
    name: string;
    resolved: number;
    presented: number;
    pending: number;
    pendingCritical: number;
    badge: boolean;
  }[];
}

export function pct(r: Ratio): string {
  if (r.den === 0) return 'sin datos';
  return `${Math.round((r.num / r.den) * 100)} %`;
}

export function ratioText(r: Ratio): string {
  return `${r.num} de ${r.den}${r.den > 0 ? ` (${pct(r)})` : ''}`;
}

export function buildSummary(state: GameState, bank: Bank): Summary {
  const answered = new Set(state.attempts.map((a) => a.questionId));
  const firstAttempts = state.attempts.filter((a) => a.firstOnConcept);
  const concepts = Object.values(state.concepts);
  const withError = concepts.filter((c) => c.errorCount > 0);
  const recovered = withError.filter((c) => c.status === 'recovered');
  const competencyOf = (originId: string) => bank.byId.get(originId)?.competency ?? originId;

  const perCategory = bank.categories.map((c) => {
    const st = categoryStats(state, bank, c.id);
    return {
      category: c.id,
      name: c.name,
      resolved: st.resolved,
      presented: st.presented,
      pending: st.pending,
      pendingCritical: st.pendingCritical,
      badge: st.badge,
    };
  });

  const pendingConcepts = concepts
    .filter((c) => c.status === 'pending' || c.status === 'pending_critical')
    .map((c) => ({
      conceptId: c.conceptId,
      category: c.category,
      competency: competencyOf(c.originQuestionId),
      critical: c.status === 'pending_critical',
    }));

  const criticalErrors = concepts
    .filter((c) => c.hadCriticalError)
    .map((c) => ({ conceptId: c.conceptId, competency: competencyOf(c.originQuestionId), resolved: c.status !== 'pending_critical' }));

  return {
    alias: state.player.alias,
    contentMode: state.contentMode,
    categoriesWorked: { num: perCategory.filter((p) => p.presented > 0).length, den: bank.categories.length },
    badges: { num: state.badges.length, den: bank.categories.length },
    distinctAnswered: answered.size,
    totalAttempts: state.attempts.length,
    firstTryCorrect: { num: firstAttempts.filter((a) => a.correct).length, den: firstAttempts.length },
    recoveries: { num: recovered.length, den: withError.length },
    pendingConcepts,
    criticalErrors,
    recommendations: buildRecommendations(state, bank),
    points: totalPoints(state),
    finalStatus: state.final.status,
    perCategory,
  };
}

/** Recomendaciones basadas en los errores observados (no en el puntaje). */
export function buildRecommendations(state: GameState, bank: Bank): string[] {
  const recs: string[] = [];
  const concepts = Object.values(state.concepts);
  for (const c of concepts.filter((x) => x.status === 'pending_critical')) {
    const q = bank.byId.get(c.originQuestionId);
    if (q) recs.push(`Prioridad: resolvé la recuperación crítica de «${q.competency}». Principio para repasar: ${q.transferPrinciple}`);
  }
  for (const c of concepts.filter((x) => x.status === 'pending')) {
    const q = bank.byId.get(c.originQuestionId);
    if (q) recs.push(`Repasá «${q.competency}» (${bank.categoryById[q.category].shortName}). ${q.transferPrinciple}`);
  }
  // Categorías con más errores en primer intento.
  const errorsByCat = new Map<CategoryId, number>();
  for (const a of state.attempts) if (a.firstOnConcept && !a.correct) errorsByCat.set(a.category, (errorsByCat.get(a.category) ?? 0) + 1);
  const worst = [...errorsByCat.entries()].sort((a, b) => b[1] - a[1]).filter(([, n]) => n >= 2);
  for (const [cat, n] of worst) {
    recs.push(`En ${bank.categoryById[cat].name} tuviste ${n} errores en primer intento: conviene releer las fuentes citadas en las devoluciones.`);
  }
  // Nivel de dificultad con más dificultades.
  const byDiff = new Map<string, { ok: number; total: number }>();
  for (const a of state.attempts.filter((x) => x.firstOnConcept)) {
    const e = byDiff.get(a.difficulty) ?? { ok: 0, total: 0 };
    e.total += 1;
    if (a.correct) e.ok += 1;
    byDiff.set(a.difficulty, e);
  }
  for (const [d, e] of byDiff) {
    if (e.total >= 3 && e.ok / e.total < 0.5) {
      recs.push(`Las preguntas de ${DIFFICULTY_LABEL[d as keyof typeof DIFFICULTY_LABEL].toLowerCase()} te costaron más (${e.ok} de ${e.total} en primer intento).`);
    }
  }
  if (recs.length === 0 && state.attempts.length > 0) {
    recs.push('No hay conceptos pendientes. Para seguir aprendiendo, explicale a un compañero el fundamento de una decisión que tomaste en la guardia.');
  }
  return recs;
}

export function summaryToText(s: Summary, bank: Bank, generatedAt = new Date()): string {
  const lines: string[] = [];
  lines.push('GUARDIA DE PREGUNTAS — Resumen de aprendizaje');
  lines.push(`Práctica Profesional II · Generado: ${generatedAt.toLocaleString('es-AR')}`);
  lines.push(`Alias: ${s.alias || '(sin alias)'} · Modo: ${s.contentMode === 'academic' ? 'académico (solo preguntas aprobadas)' : 'demostración (incluye borradores)'}`);
  lines.push('');
  lines.push(`Categorías trabajadas: ${s.categoriesWorked.num} de ${s.categoriesWorked.den}`);
  lines.push(`Insignias obtenidas: ${s.badges.num} de ${s.badges.den}`);
  lines.push(`Preguntas distintas respondidas: ${s.distinctAnswered} (intentos totales: ${s.totalAttempts})`);
  lines.push(`Aciertos en primer intento: ${ratioText(s.firstTryCorrect)} — denominador: conceptos respondidos por primera vez`);
  lines.push(`Recuperaciones completadas: ${ratioText(s.recoveries)} — denominador: conceptos con al menos un error`);
  lines.push(`Desafío final: ${finalLabel(s.finalStatus)}`);
  lines.push('');
  lines.push('Por categoría (resueltas / presentadas):');
  for (const c of s.perCategory) {
    const extra = [c.badge ? 'insignia' : null, c.pending ? `${c.pending} pendiente(s)` : null, c.pendingCritical ? `${c.pendingCritical} crítica(s) pendiente(s)` : null]
      .filter(Boolean)
      .join(', ');
    lines.push(`- ${c.name}: ${c.resolved} / ${c.presented}${extra ? ` · ${extra}` : ''}`);
  }
  lines.push('');
  lines.push('Errores críticos detectados:');
  if (s.criticalErrors.length === 0) lines.push('- Ninguno');
  for (const e of s.criticalErrors) lines.push(`- ${e.competency}: ${e.resolved ? 'recuperado' : 'PENDIENTE'}`);
  lines.push('');
  lines.push('Conceptos pendientes:');
  if (s.pendingConcepts.length === 0) lines.push('- Ninguno');
  for (const p of s.pendingConcepts) lines.push(`- ${p.competency} (${bank.categoryById[p.category].shortName})${p.critical ? ' · crítico' : ''}`);
  lines.push('');
  lines.push('Recomendaciones de repaso:');
  for (const r of s.recommendations) lines.push(`- ${r}`);
  lines.push('');
  lines.push(`Puntos de juego: ${s.points}. Los puntos y las insignias reconocen logros dentro del juego: no son una nota académica ni certifican competencia clínica.`);
  if (s.contentMode === 'demo') lines.push('Contenido en borrador, pendiente de revisión docente.');
  return lines.join('\n');
}

export function finalLabel(status: GameState['final']['status']): string {
  return { locked: 'bloqueado', available: 'habilitado, sin iniciar', in_progress: 'en curso', completed: 'completado' }[status];
}
