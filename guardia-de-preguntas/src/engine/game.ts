// Motor de la partida. Funciones puras: reciben el estado y el banco y
// devuelven un estado nuevo. La interfaz solo llama a estas funciones.

import { isPlayable, type Bank } from '../content/bank';
import {
  type Attempt,
  type AttemptContext,
  type CategoryId,
  type ConceptRecord,
  type ContentMode,
  type GameState,
  type Presentation,
  type Question,
} from '../types';
import { isChoiceCorrect, isNumericCorrect, parseNumericInput, type NumericParse } from './evaluate';
import { createRng, randomSeed, shuffle, weightedPick, type Rng } from './rng';
import { targetRotation } from './wheel';

const nowIso = () => new Date().toISOString();

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `g-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function newGame(opts: { alias: string; avatarId: string; contentMode: ContentMode; seed?: number }): GameState {
  const t = nowIso();
  return {
    schemaVersion: 1,
    id: newId(),
    createdAt: t,
    updatedAt: t,
    contentMode: opts.contentMode,
    player: { alias: sanitizeAlias(opts.alias), avatarId: opts.avatarId },
    rngState: opts.seed ?? randomSeed(),
    wheelRotation: 0,
    spins: [],
    pendingSpin: null,
    attempts: [],
    concepts: {},
    presented: [],
    current: null,
    badges: [],
    final: { status: 'locked', step: 0, completedAt: null },
    celebration: null,
  };
}

/** Alias opcional: sin saltos de línea ni caracteres de control, máximo 24 caracteres. */
export function sanitizeAlias(alias: string): string {
  return alias.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 24);
}

function withRng<T>(state: GameState, fn: (rng: Rng) => T): [T, number] {
  const rng = createRng(state.rngState);
  const result = fn(rng);
  return [result, rng.state];
}

const touch = (s: GameState): GameState => ({ ...s, updatedAt: nowIso() });

// ───────────────────────── Consultas ─────────────────────────

/** Preguntas nuevas que pueden salir en la ruleta para una categoría. */
export function availableQuestions(state: GameState, bank: Bank, cat: CategoryId): Question[] {
  const presented = new Set(state.presented);
  return bank.questions.filter(
    (q) =>
      q.category === cat &&
      !q.isRecoveryVariant &&
      !q.finalChallenge &&
      isPlayable(q, state.contentMode) &&
      !presented.has(q.id) &&
      // Un concepto ya trabajado no vuelve por la ruleta: vuelve por el repaso.
      !state.concepts[q.conceptId],
  );
}

export interface CategoryStats {
  resolved: number;
  hasNonConceptual: boolean;
  pending: number;
  pendingCritical: number;
  presented: number;
  available: number;
  completed: boolean;
  badge: boolean;
}

const isResolved = (c: ConceptRecord) => c.status === 'first_try' || c.status === 'recovered';

export function categoryStats(state: GameState, bank: Bank, cat: CategoryId): CategoryStats {
  const concepts = Object.values(state.concepts).filter((c) => c.category === cat && !c.finalChallenge);
  const resolved = concepts.filter(isResolved);
  const hasNonConceptual = resolved.some((c) => c.resolvedDifficulty !== 'conceptual');
  const pendingCritical = concepts.filter((c) => c.status === 'pending_critical').length;
  const pending = concepts.filter((c) => c.status === 'pending').length;
  const cfg = bank.config.completion;
  const completed =
    resolved.length >= cfg.distinctResolved && (!cfg.requireNonConceptual || hasNonConceptual) && pendingCritical === 0;
  return {
    resolved: resolved.length,
    hasNonConceptual,
    pending,
    pendingCritical,
    presented: concepts.length,
    available: availableQuestions(state, bank, cat).length,
    completed,
    badge: state.badges.some((b) => b.category === cat),
  };
}

export function pendingCriticalConcepts(state: GameState): ConceptRecord[] {
  return Object.values(state.concepts).filter((c) => c.status === 'pending_critical');
}

/** El desafío final exige las seis insignias y ninguna recuperación crítica pendiente. */
export function finalUnlocked(state: GameState, bank: Bank): boolean {
  if (bank.final.stepQuestionIds.length === 0) return false;
  if (state.badges.length < bank.categories.length) return false;
  return pendingCriticalConcepts(state).filter((c) => !c.finalChallenge).length === 0;
}

export function totalPoints(state: GameState): number {
  return state.attempts.reduce((a, t) => a + t.points, 0);
}

// ───────────────────────── Ruleta ─────────────────────────

export function categoryWeights(state: GameState, bank: Bank): number[] {
  const maxRun = bank.config.maxSameCategoryInARow;
  const lastSpins = state.spins.slice(-maxRun).map((s) => s.category);
  const runCategory = lastSpins.length === maxRun && lastSpins.every((c) => c === lastSpins[0]) ? lastSpins[0] : null;
  return bank.categories.map((c) => {
    const st = categoryStats(state, bank, c.id);
    if (st.available === 0) return 0;
    if (c.id === runCategory) return 0;
    let w = 1 / (1 + st.presented);
    if (st.badge) w *= 0.25;
    return w;
  });
}

/** Sortea la categoría. Devuelve null si ninguna tiene preguntas nuevas. */
export function drawCategory(state: GameState, bank: Bank, rng: Rng): CategoryId | null {
  let weights = categoryWeights(state, bank);
  if (weights.every((w) => w <= 0)) {
    // Solo queda disponible la categoría que viene repitiéndose: se permite.
    weights = bank.categories.map((c) => (availableQuestions(state, bank, c.id).length > 0 ? 1 : 0));
  }
  const i = weightedPick(weights, rng);
  return i < 0 ? null : bank.categories[i].id;
}

export type SpinOutcome = { ok: true; state: GameState } | { ok: false; reason: 'busy' | 'exhausted' };

/**
 * Decide el resultado del giro ANTES de animar y lo guarda en el estado.
 * La interfaz anima hasta `pendingSpin.rotation` y luego llama a `presentFromSpin`.
 */
export function spin(state: GameState, bank: Bank, animated: boolean): SpinOutcome {
  if (state.pendingSpin || state.current) return { ok: false, reason: 'busy' };
  const [result, rngState] = withRng(state, (rng) => {
    const cat = drawCategory(state, bank, rng);
    if (!cat) return null;
    const index = bank.categories.findIndex((c) => c.id === cat);
    const rotation = targetRotation(state.wheelRotation, index, bank.categories.length, rng);
    return { cat, rotation };
  });
  if (!result) return { ok: false, reason: 'exhausted' };
  const record = { category: result.cat, at: nowIso(), animated, rotation: result.rotation };
  return {
    ok: true,
    state: touch({ ...state, rngState, pendingSpin: record, wheelRotation: result.rotation }),
  };
}

function difficultyWeight(q: Question, state: GameState, bank: Bank): number {
  const st = categoryStats(state, bank, q.category);
  const need = bank.config.completion;
  // Si la insignia necesita una pregunta de aplicación, se prioriza.
  if (need.requireNonConceptual && !st.hasNonConceptual && st.resolved >= need.distinctResolved - 1) {
    return q.difficulty === 'conceptual' ? 0.1 : 3;
  }
  // Progresión gradual: al comenzar la categoría pesan más las preguntas básicas.
  if (st.presented === 0) return q.difficulty === 'conceptual' ? 2 : q.difficulty === 'aplicacion' ? 1.5 : 0.7;
  if (st.presented === 1) return q.difficulty === 'integracion' ? 1 : 1.3;
  return 1;
}

export function selectQuestion(state: GameState, bank: Bank, cat: CategoryId, rng: Rng): Question | null {
  const candidates = availableQuestions(state, bank, cat);
  if (candidates.length === 0) return null;
  const i = weightedPick(candidates.map((q) => difficultyWeight(q, state, bank)), rng);
  return candidates[i] ?? null;
}

export type PresentOutcome = { ok: true; state: GameState } | { ok: false; reason: 'no_spin' | 'exhausted'; category?: CategoryId };

/** Presenta una pregunta de la categoría sorteada. Nunca cambia de categoría en silencio. */
export function presentFromSpin(state: GameState, bank: Bank): PresentOutcome {
  const sp = state.pendingSpin;
  if (!sp) return { ok: false, reason: 'no_spin' };
  const [q, rngState] = withRng(state, (rng) => selectQuestion(state, bank, sp.category, rng));
  if (!q) {
    // No debería ocurrir (las categorías agotadas no se sortean), pero se informa.
    return { ok: false, reason: 'exhausted', category: sp.category };
  }
  const s1 = { ...state, rngState, spins: [...state.spins, sp], pendingSpin: null };
  return { ok: true, state: present(s1, bank, q.id, 'guardia', null) };
}

/** Repaso por materia: presenta la próxima pregunta nueva del área, sin ruleta. */
export function presentNext(state: GameState, bank: Bank, cat: CategoryId): PresentOutcome {
  if (state.current) return { ok: false, reason: 'no_spin' };
  const [q, rngState] = withRng(state, (rng) => selectQuestion(state, bank, cat, rng));
  if (!q) return { ok: false, reason: 'exhausted', category: cat };
  return { ok: true, state: present({ ...state, rngState }, bank, q.id, 'guardia', null) };
}

// ───────────────────────── Presentación y respuesta ─────────────────────────

export function present(
  state: GameState,
  bank: Bank,
  questionId: string,
  context: AttemptContext,
  recoveryFor: string | null,
): GameState {
  const q = bank.byId.get(questionId);
  if (!q) throw new Error(`Pregunta inexistente: ${questionId}`);
  const [order, rngState] = withRng(state, (rng) => shuffle(q.options.map((o) => o.id), rng));
  const isRepeat = state.presented.includes(q.id);
  const current: Presentation = { questionId, context, optionOrder: order, isRepeat, recoveryFor, phase: 'answering', attemptN: null };
  return touch({
    ...state,
    rngState,
    current,
    presented: isRepeat ? state.presented : [...state.presented, q.id],
  });
}

export type AnswerInput = { optionId: string } | { numeric: string };
export type AnswerOutcome =
  | { ok: true; state: GameState; attempt: Attempt }
  | { ok: false; reason: 'no_question' | 'already_answered' | 'invalid_option' | 'invalid_number'; parse?: NumericParse };

export function answer(state: GameState, bank: Bank, input: AnswerInput): AnswerOutcome {
  const cur = state.current;
  if (!cur) return { ok: false, reason: 'no_question' };
  if (cur.phase !== 'answering') return { ok: false, reason: 'already_answered' };
  const q = bank.byId.get(cur.questionId);
  if (!q) return { ok: false, reason: 'no_question' };

  let correct: boolean;
  let chosenOptionId: string | null = null;
  let numericInput: string | null = null;
  let numericValue: number | null = null;
  if ('optionId' in input) {
    if (q.type !== 'single_choice' || !q.options.some((o) => o.id === input.optionId)) {
      return { ok: false, reason: 'invalid_option' };
    }
    chosenOptionId = input.optionId;
    correct = isChoiceCorrect(q, input.optionId);
  } else {
    const parsed = parseNumericInput(input.numeric);
    if (!parsed.ok || q.type !== 'numeric') return { ok: false, reason: 'invalid_number', parse: parsed };
    numericInput = input.numeric.trim();
    numericValue = parsed.value;
    correct = isNumericCorrect(q, parsed.value);
  }

  const prev = state.concepts[q.conceptId];
  const firstOnConcept = !prev;
  const n = state.attempts.length + 1;
  const base = bank.config.points[q.difficulty];
  const points = correct ? (firstOnConcept && !cur.isRepeat ? base : Math.round(base * bank.config.recoveryFactor)) : 0;
  const critical = q.criticalSafety && !correct;

  const attempt: Attempt = {
    n,
    at: nowIso(),
    questionId: q.id,
    conceptId: q.conceptId,
    category: q.category,
    difficulty: q.difficulty,
    context: cur.context,
    isRepeat: cur.isRepeat,
    firstOnConcept,
    chosenOptionId,
    numericInput,
    numericValue,
    correct,
    critical,
    points,
  };

  const record: ConceptRecord = prev
    ? { ...prev }
    : {
        conceptId: q.conceptId,
        category: q.category,
        originQuestionId: q.id,
        status: 'pending',
        hadCriticalError: false,
        errorCount: 0,
        lastErrorN: null,
        resolvedDifficulty: null,
        finalChallenge: !!q.finalChallenge,
      };
  if (correct) {
    record.status = firstOnConcept ? 'first_try' : isResolved(record) ? record.status : 'recovered';
    record.resolvedDifficulty = record.resolvedDifficulty ?? q.difficulty;
  } else {
    record.errorCount += 1;
    record.lastErrorN = n;
    if (q.criticalSafety) {
      record.status = 'pending_critical';
      record.hadCriticalError = true;
    } else if (record.status !== 'pending_critical') {
      record.status = 'pending';
    }
  }

  let next: GameState = {
    ...state,
    attempts: [...state.attempts, attempt],
    concepts: { ...state.concepts, [q.conceptId]: record },
    current: { ...cur, phase: 'feedback', attemptN: n },
  };
  next = awardBadges(next, bank);
  return { ok: true, state: touch(next), attempt };
}

function awardBadges(state: GameState, bank: Bank): GameState {
  let s = state;
  for (const { id } of bank.categories) {
    if (s.badges.some((b) => b.category === id)) continue;
    if (categoryStats(s, bank, id).completed) {
      s = { ...s, badges: [...s.badges, { category: id, at: nowIso() }], celebration: { kind: 'badge', category: id } };
    }
  }
  if (s.final.status === 'locked' && finalUnlocked(s, bank)) {
    s = { ...s, final: { ...s.final, status: 'available' } };
  }
  return s;
}

export function dismissCelebration(state: GameState): GameState {
  return { ...state, celebration: null };
}

/** Intento asociado a la devolución que se está mostrando. */
export function currentAttempt(state: GameState): Attempt | null {
  const n = state.current?.attemptN;
  return n ? state.attempts[n - 1] ?? null : null;
}

/** Cierra la devolución y vuelve al tablero (o avanza el desafío final). */
export function closeFeedback(state: GameState, bank: Bank): GameState {
  const cur = state.current;
  if (!cur || cur.phase !== 'feedback') return state;
  if (cur.context === 'final') return advanceFinal(state, bank);
  return touch({ ...state, current: null });
}

// ───────────────────────── Recuperaciones y repaso ─────────────────────────

/**
 * Busca una pregunta equivalente (mismo concepto) que todavía no se haya
 * presentado. Para conceptos críticos se prioriza la variante de recuperación
 * indicada en la pregunta original.
 */
export function findEquivalent(state: GameState, bank: Bank, conceptId: string): { question: Question; isNew: boolean } | null {
  const rec = state.concepts[conceptId];
  if (!rec) return null;
  const origin = bank.byId.get(rec.originQuestionId);
  const presented = new Set(state.presented);
  const sameConcept = bank.questions.filter((q) => q.conceptId === conceptId && isPlayable(q, state.contentMode));
  const preferredId = origin?.recoveryQuestionId ?? null;
  const fresh = sameConcept
    .filter((q) => !presented.has(q.id))
    .sort((a, b) => Number(b.id === preferredId) - Number(a.id === preferredId));
  if (fresh.length > 0) return { question: fresh[0], isNew: true };
  // Sin variante nueva: se repite la última pregunta fallada del concepto.
  const lastWrong = [...state.attempts].reverse().find((a) => a.conceptId === conceptId && !a.correct);
  const repeat = (lastWrong && bank.byId.get(lastWrong.questionId)) || origin;
  return repeat ? { question: repeat, isNew: false } : null;
}

/** Inicia la recuperación de un concepto (crítico o pendiente). */
export function startRecovery(state: GameState, bank: Bank, conceptId: string): GameState {
  const rec = state.concepts[conceptId];
  if (!rec || isResolved(rec)) return state;
  const eq = findEquivalent(state, bank, conceptId);
  if (!eq) return state;
  const inFinal = rec.finalChallenge && state.final.status === 'in_progress';
  const context: AttemptContext = inFinal ? 'final' : rec.status === 'pending_critical' ? 'recuperacion_critica' : 'repaso';
  return present({ ...state, current: null }, bank, eq.question.id, context, rec.originQuestionId);
}

export interface ReviewItem {
  concept: ConceptRecord;
  origin: Question;
  ready: boolean;
  /** Respuestas que faltan para que el repaso quede espaciado. */
  waitFor: number;
  hasNewVariant: boolean;
}

export function anyNewQuestionLeft(state: GameState, bank: Bank): boolean {
  return bank.categories.some((c) => availableQuestions(state, bank, c.id).length > 0);
}

export function reviewQueue(state: GameState, bank: Bank): ReviewItem[] {
  const spacing = bank.config.reviewSpacing;
  const total = state.attempts.length;
  const noneLeft = !anyNewQuestionLeft(state, bank);
  const items: ReviewItem[] = [];
  for (const c of Object.values(state.concepts)) {
    if (c.status !== 'pending' && c.status !== 'pending_critical') continue;
    if (c.finalChallenge && state.final.status !== 'completed') continue;
    const origin = bank.byId.get(c.originQuestionId);
    if (!origin) continue;
    const since = c.lastErrorN === null ? spacing : total - c.lastErrorN;
    // Los críticos se recuperan sin esperar; el resto se espacia, salvo que no queden preguntas nuevas.
    const ready = c.status === 'pending_critical' || noneLeft || since >= spacing;
    const eq = findEquivalent(state, bank, c.conceptId);
    items.push({ concept: c, origin, ready, waitFor: ready ? 0 : spacing - since, hasNewVariant: !!eq?.isNew });
  }
  return items.sort(
    (a, b) =>
      Number(b.concept.status === 'pending_critical') - Number(a.concept.status === 'pending_critical') ||
      Number(b.ready) - Number(a.ready) ||
      b.concept.errorCount - a.concept.errorCount,
  );
}

// ───────────────────────── Desafío final ─────────────────────────

export function startFinal(state: GameState, bank: Bank): GameState {
  if (state.current || state.pendingSpin) return state;
  if (state.final.status === 'completed') return state;
  if (!finalUnlocked(state, bank)) return state;
  const step = state.final.status === 'in_progress' ? state.final.step : 0;
  const s = { ...state, final: { ...state.final, status: 'in_progress' as const, step } };
  return presentFinalStep(s, bank);
}

function presentFinalStep(state: GameState, bank: Bank): GameState {
  const qid = bank.final.stepQuestionIds[state.final.step];
  const rec = state.concepts[bank.byId.get(qid)!.conceptId];
  if (rec && rec.status === 'pending_critical') return startRecovery(state, bank, rec.conceptId);
  return present(state, bank, qid, 'final', null);
}

/** El paso avanza si se resolvió o si el error no fue crítico; un error crítico exige recuperación. */
function advanceFinal(state: GameState, bank: Bank): GameState {
  const qid = bank.final.stepQuestionIds[state.final.step];
  const conceptId = bank.byId.get(qid)!.conceptId;
  const rec = state.concepts[conceptId];
  if (rec?.status === 'pending_critical') {
    return startRecovery({ ...state, current: null }, bank, conceptId);
  }
  const step = state.final.step + 1;
  if (step >= bank.final.stepQuestionIds.length) {
    return touch({
      ...state,
      current: null,
      final: { status: 'completed', step, completedAt: nowIso() },
      celebration: { kind: 'final' },
    });
  }
  return presentFinalStep({ ...state, current: null, final: { ...state.final, step } }, bank);
}

/** Pasos del desafío final ya resueltos o cerrados. */
export function finalStepState(state: GameState, bank: Bank, index: number): 'done' | 'current' | 'todo' {
  if (state.final.status === 'completed') return 'done';
  if (state.final.status !== 'in_progress') return 'todo';
  void bank;
  if (index < state.final.step) return 'done';
  return index === state.final.step ? 'current' : 'todo';
}

/** Elimina referencias a contenido que ya no existe (por ejemplo, tras actualizar el banco). */
export function reconcileWithBank(state: GameState, bank: Bank): GameState {
  let s = state;
  if (s.current && !bank.byId.has(s.current.questionId)) s = { ...s, current: null };
  if (s.pendingSpin && !bank.categoryById[s.pendingSpin.category]) s = { ...s, pendingSpin: null };
  if (s.current) {
    const q = bank.byId.get(s.current.questionId)!;
    const ids = q.options.map((o) => o.id);
    const sameOptions = ids.length === s.current.optionOrder.length && ids.every((id) => s.current!.optionOrder.includes(id));
    if (!sameOptions) s = { ...s, current: { ...s.current, optionOrder: ids } };
  }
  return s;
}
