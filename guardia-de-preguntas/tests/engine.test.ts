import { describe, expect, it } from 'vitest';
import { bank, buildBank } from '../src/content/bank';
import { isNumericCorrect, parseNumericInput } from '../src/engine/evaluate';
import {
  answer,
  availableQuestions,
  categoryStats,
  closeFeedback,
  currentAttempt,
  finalUnlocked,
  newGame,
  present,
  presentFromSpin,
  reviewQueue,
  sanitizeAlias,
  spin,
  startFinal,
  startRecovery,
  totalPoints,
  type AnswerInput,
} from '../src/engine/game';
import { createRng, shuffle } from '../src/engine/rng';
import { sectorAtPointer, targetRotation } from '../src/engine/wheel';
import { buildSummary } from '../src/engine/summary';
import type { GameState, Question } from '../src/types';

const q = (id: string) => bank.byId.get(id)!;

function correctInput(question: Question): AnswerInput {
  return question.type === 'numeric'
    ? { numeric: String(question.numericAnswer).replace('.', ',') }
    : { optionId: question.correctOptionId! };
}
function wrongInput(question: Question): AnswerInput {
  return question.type === 'numeric'
    ? { numeric: String((question.numericAnswer ?? 0) + 1000) }
    : { optionId: question.options.find((o) => o.id !== question.correctOptionId)!.id };
}

function mustSpin(s: GameState): GameState {
  const r = spin(s, bank, false);
  if (!r.ok) throw new Error(`spin falló: ${r.reason}`);
  const p = presentFromSpin(r.state, bank);
  if (!p.ok) throw new Error(`present falló: ${p.reason}`);
  return p.state;
}

function respond(s: GameState, correct: boolean): GameState {
  const question = q(s.current!.questionId);
  const r = answer(s, bank, correct ? correctInput(question) : wrongInput(question));
  if (!r.ok) throw new Error(`answer falló: ${r.reason}`);
  return r.state;
}

const fresh = (seed = 1234) => newGame({ alias: 'Prueba', avatarId: 'a1', contentMode: 'demo', seed });

describe('ruleta', () => {
  it('la animación termina exactamente en el sector sorteado (6 sectores, muchas semillas)', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = createRng(seed);
      let rot = rng.next() * 5000;
      for (let k = 0; k < 6; k++) {
        const target = targetRotation(rot, k, 6, rng);
        expect(target).toBeGreaterThan(rot);
        expect(sectorAtPointer(target, 6)).toBe(k);
        rot = target;
      }
    }
  });

  it('el giro guarda la categoría antes de animar y la pregunta presentada pertenece a esa categoría', () => {
    let s = fresh(42);
    for (let i = 0; i < 20; i++) {
      const r = spin(s, bank, true);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const cat = r.state.pendingSpin!.category;
      const sectorIndex = sectorAtPointer(r.state.wheelRotation, 6);
      expect(bank.categories[sectorIndex].id).toBe(cat);
      const p = presentFromSpin(r.state, bank);
      expect(p.ok).toBe(true);
      if (!p.ok) return;
      expect(q(p.state.current!.questionId).category).toBe(cat);
      s = closeFeedback(respond(p.state, true), bank);
    }
  });

  it('impide un segundo giro mientras hay un giro o una pregunta en curso', () => {
    const r = spin(fresh(), bank, true);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(spin(r.state, bank, true)).toEqual({ ok: false, reason: 'busy' });
    const p = presentFromSpin(r.state, bank);
    if (!p.ok) throw new Error();
    expect(spin(p.state, bank, true)).toEqual({ ok: false, reason: 'busy' });
  });

  it('no repite más de dos veces seguidas la misma categoría mientras haya alternativas', () => {
    let s = fresh(7);
    for (let i = 0; i < 30; i++) {
      s = closeFeedback(respond(mustSpin(s), true), bank);
      const cats = s.spins.map((x) => x.category);
      const n = cats.length;
      if (n >= 3) {
        const othersAvailable = bank.categories.some((c) => c.id !== cats[n - 1] && availableQuestions(s, bank, c.id).length > 0);
        if (othersAvailable) expect(cats[n - 1] === cats[n - 2] && cats[n - 2] === cats[n - 3]).toBe(false);
      }
    }
  });

  it('no repite preguntas ni conceptos en Mi guardia y avisa cuando el banco se agota, sin bloquear', () => {
    let s = fresh(99);
    const seen = new Set<string>();
    for (let i = 0; i < 36; i++) {
      s = mustSpin(s);
      const id = s.current!.questionId;
      expect(seen.has(id)).toBe(false);
      expect(q(id).isRecoveryVariant).toBeFalsy();
      seen.add(id);
      s = closeFeedback(respond(s, true), bank);
    }
    expect(seen.size).toBe(36);
    const r = spin(s, bank, true);
    expect(r).toEqual({ ok: false, reason: 'exhausted' });
    // El juego sigue usable: el estado no quedó con un giro colgado.
    expect(s.pendingSpin).toBeNull();
    expect(s.current).toBeNull();
  });

  it('el mismo estado y semilla producen el mismo resultado (sin re-sorteo al recargar)', () => {
    const a = spin(fresh(5), bank, true);
    const b = spin(JSON.parse(JSON.stringify(fresh(5))), bank, true);
    if (!a.ok || !b.ok) throw new Error();
    expect(a.state.pendingSpin!.category).toBe(b.state.pendingSpin!.category);
    expect(a.state.wheelRotation).toBe(b.state.wheelRotation);
  });
});

describe('opciones mezcladas', () => {
  it('la clave y cada devolución quedan asociadas al ID, no a la posición', () => {
    const choice = bank.questions.filter((x) => x.type === 'single_choice');
    for (let seed = 1; seed <= 50; seed++) {
      for (const question of choice) {
        let s = present(fresh(seed), bank, question.id, 'guardia', null);
        const order = s.current!.optionOrder;
        expect([...order].sort()).toEqual(question.options.map((o) => o.id).sort());
        // Elegimos la opción que quedó en la primera posición.
        const chosen = order[0];
        const r = answer(s, bank, { optionId: chosen });
        if (!r.ok) throw new Error();
        expect(r.attempt.correct).toBe(chosen === question.correctOptionId);
        expect(r.attempt.chosenOptionId).toBe(chosen);
        s = r.state;
      }
    }
  });

  it('la mezcla cambia el orden en al menos una semilla (no es siempre la misma posición)', () => {
    const question = q('seg-02');
    const firstPositions = new Set<string>();
    for (let seed = 1; seed < 40; seed++) firstPositions.add(shuffle(question.options.map((o) => o.id), createRng(seed))[0]);
    expect(firstPositions.size).toBeGreaterThan(1);
  });

  it('rechaza una opción inexistente', () => {
    const s = present(fresh(), bank, 'seg-02', 'guardia', null);
    expect(answer(s, bank, { optionId: 'no-existe' })).toMatchObject({ ok: false, reason: 'invalid_option' });
  });
});

describe('cálculos numéricos', () => {
  it('acepta coma y punto decimal, signo y espacios', () => {
    expect(parseNumericInput('1,6')).toEqual({ ok: true, value: 1.6 });
    expect(parseNumericInput('1.6')).toEqual({ ok: true, value: 1.6 });
    expect(parseNumericInput('  +250 ')).toEqual({ ok: true, value: 250 });
    expect(parseNumericInput('-150')).toEqual({ ok: true, value: -150 });
    expect(parseNumericInput(',5')).toEqual({ ok: true, value: 0.5 });
  });

  it('rechaza vacíos, texto, unidades y expresiones', () => {
    expect(parseNumericInput('')).toEqual({ ok: false, reason: 'empty' });
    expect(parseNumericInput('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(parseNumericInput('abc')).toEqual({ ok: false, reason: 'not_number' });
    expect(parseNumericInput('1,6 mL')).toEqual({ ok: false, reason: 'has_unit' });
    expect(parseNumericInput('2*3')).toEqual({ ok: false, reason: 'not_number' });
    expect(parseNumericInput('1,2,3')).toEqual({ ok: false, reason: 'not_number' });
    expect(parseNumericInput('=1+1')).toEqual({ ok: false, reason: 'not_number' });
  });

  it('una respuesta vacía no se registra como intento', () => {
    const s = present(fresh(), bank, 'far-02', 'guardia', null);
    const r = answer(s, bank, { numeric: '' });
    expect(r).toMatchObject({ ok: false, reason: 'invalid_number' });
    expect(s.attempts).toHaveLength(0);
  });

  it('aplica la tolerancia definida', () => {
    expect(isNumericCorrect(q('far-02'), 1.6)).toBe(true);
    expect(isNumericCorrect(q('far-02'), 1.7)).toBe(false);
    expect(isNumericCorrect(q('pro-02'), 42)).toBe(true);
    expect(isNumericCorrect(q('pro-02'), 41.67)).toBe(true);
    expect(isNumericCorrect(q('pro-02'), 41)).toBe(false);
    expect(isNumericCorrect(q('fis-02'), 87)).toBe(true);
    expect(isNumericCorrect(q('pro-06'), 250)).toBe(true);
    expect(isNumericCorrect(q('pro-06'), -250)).toBe(false);
  });

  it('acepta la respuesta con coma dentro del flujo de juego', () => {
    const s = present(fresh(), bank, 'far-02', 'guardia', null);
    const r = answer(s, bank, { numeric: '1,6' });
    if (!r.ok) throw new Error();
    expect(r.attempt.correct).toBe(true);
    expect(r.attempt.numericValue).toBe(1.6);
  });
});

describe('seguridad del paciente y recuperaciones', () => {
  it('un error crítico deja el concepto pendiente y la recuperación usa una variante distinta', () => {
    let s = present(fresh(), bank, 'seg-02', 'guardia', null);
    s = respond(s, false);
    expect(currentAttempt(s)!.critical).toBe(true);
    expect(s.concepts['seg-identificacion'].status).toBe('pending_critical');
    s = closeFeedback(s, bank);
    s = startRecovery(s, bank, 'seg-identificacion');
    expect(s.current!.questionId).toBe('seg-02-r');
    expect(s.current!.context).toBe('recuperacion_critica');
    expect(s.current!.isRepeat).toBe(false);
    s = respond(s, true);
    expect(s.concepts['seg-identificacion'].status).toBe('recovered');
    expect(s.concepts['seg-identificacion'].hadCriticalError).toBe(true);
  });

  it('si se agotan las variantes, la recuperación repite la pregunta y lo marca como repetida', () => {
    let s = present(fresh(), bank, 'seg-02', 'guardia', null);
    s = closeFeedback(respond(s, false), bank);
    s = closeFeedback(respond(startRecovery(s, bank, 'seg-identificacion'), false), bank);
    s = startRecovery(s, bank, 'seg-identificacion');
    expect(s.current!.isRepeat).toBe(true);
    expect(s.concepts['seg-identificacion'].status).toBe('pending_critical');
    s = respond(s, true);
    expect(s.concepts['seg-identificacion'].status).toBe('recovered');
  });

  it('los puntos no compensan una competencia crítica pendiente: la categoría no se completa', () => {
    let s = fresh();
    // Dos errores críticos y luego todas las demás de seguridad correctas.
    s = closeFeedback(respond(present(s, bank, 'seg-02', 'guardia', null), false), bank);
    for (const id of ['seg-01', 'seg-03', 'seg-04', 'seg-06']) s = closeFeedback(respond(present(s, bank, id, 'guardia', null), true), bank);
    const st = categoryStats(s, bank, 'seguridad');
    expect(st.resolved).toBe(4);
    expect(st.pendingCritical).toBe(1);
    expect(st.completed).toBe(false);
    expect(s.badges.some((b) => b.category === 'seguridad')).toBe(false);
    expect(totalPoints(s)).toBeGreaterThan(0);
    // Al recuperar el crítico se entrega la insignia.
    s = respond(startRecovery(s, bank, 'seg-identificacion'), true);
    expect(s.badges.some((b) => b.category === 'seguridad')).toBe(true);
  });

  it('la insignia exige al menos una pregunta de aplicación', () => {
    // Banco artificial: tres preguntas conceptuales y una de aplicación.
    const mini = buildBank({
      categories: bank.categories,
      questions: bank.questions.filter((x) => !x.finalChallenge),
      finalQuestions: bank.questions.filter((x) => x.finalChallenge),
      sources: [...bank.sources.values()],
      config: bank.config,
      final: bank.final,
      bankVersion: 'test',
    });
    const conceptualOnly = mini.questions.map((x) => (x.category === 'valoracion' ? { ...x, difficulty: 'conceptual' as const } : x));
    const b2 = { ...mini, questions: conceptualOnly, byId: new Map(conceptualOnly.map((x) => [x.id, x] as const)) };
    let s = fresh();
    for (const id of ['val-01', 'val-02', 'val-03']) {
      const r = answer(present(s, b2, id, 'guardia', null), b2, correctInput(b2.byId.get(id)!));
      if (!r.ok) throw new Error();
      s = r.state;
      s = { ...s, current: null };
    }
    expect(categoryStats(s, b2, 'valoracion').resolved).toBe(3);
    expect(categoryStats(s, b2, 'valoracion').completed).toBe(false);
  });

  it('diferencia acierto en primer intento, recuperado y pendiente', () => {
    let s = fresh();
    s = closeFeedback(respond(present(s, bank, 'val-01', 'guardia', null), true), bank);
    s = closeFeedback(respond(present(s, bank, 'val-02', 'guardia', null), false), bank);
    s = closeFeedback(respond(present(s, bank, 'val-03', 'guardia', null), false), bank);
    s = closeFeedback(respond(startRecovery(s, bank, 'val-registro-fiel'), true), bank);
    expect(s.concepts['val-dato-objetivo'].status).toBe('first_try');
    expect(s.concepts['val-registro-fiel'].status).toBe('recovered');
    expect(s.concepts['val-sbar'].status).toBe('pending');
    // Sin variante: la pregunta del repaso es repetida.
    expect(s.attempts.at(-1)!.isRepeat).toBe(true);
    const sum = buildSummary(s, bank);
    expect(sum.firstTryCorrect).toEqual({ num: 1, den: 3 });
    expect(sum.recoveries).toEqual({ num: 1, den: 2 });
    expect(sum.pendingConcepts.map((p) => p.conceptId)).toEqual(['val-sbar']);
  });

  it('el repaso espacia los conceptos no críticos y ofrece los críticos de inmediato', () => {
    let s = fresh();
    s = closeFeedback(respond(present(s, bank, 'val-02', 'guardia', null), false), bank);
    s = closeFeedback(respond(present(s, bank, 'seg-02', 'guardia', null), false), bank);
    let queue = reviewQueue(s, bank);
    expect(queue[0].concept.conceptId).toBe('seg-identificacion');
    expect(queue[0].ready).toBe(true);
    expect(queue[0].hasNewVariant).toBe(true);
    const nonCritical = queue.find((x) => x.concept.conceptId === 'val-registro-fiel')!;
    expect(nonCritical.ready).toBe(false);
    expect(nonCritical.hasNewVariant).toBe(false);
    s = closeFeedback(respond(present(s, bank, 'val-01', 'guardia', null), true), bank);
    queue = reviewQueue(s, bank);
    expect(queue.find((x) => x.concept.conceptId === 'val-registro-fiel')!.ready).toBe(true);
  });

  it('puntaje: completo en primer intento, la mitad tras recuperación, nada por error', () => {
    let s = fresh();
    s = respond(present(s, bank, 'val-04', 'guardia', null), true);
    expect(currentAttempt(s)!.points).toBe(30);
    s = closeFeedback(s, bank);
    s = closeFeedback(respond(present(s, bank, 'far-02', 'guardia', null), false), bank);
    expect(s.attempts.at(-1)!.points).toBe(0);
    s = respond(startRecovery(s, bank, 'far-calculo-volumen'), true);
    expect(currentAttempt(s)!.points).toBe(10);
  });
});

describe('recorrido completo hasta el desafío final', () => {
  it('con errores críticos intermedios, recuperaciones, seis insignias y final con tres decisiones', () => {
    let s = fresh(2024);
    let guard = 0;
    let criticalsSeen = 0;
    while (s.badges.length < 6 && guard++ < 200) {
      const r = spin(s, bank, true);
      if (!r.ok) break;
      const p = presentFromSpin(r.state, bank);
      if (!p.ok) throw new Error('presentFromSpin');
      s = p.state;
      const question = q(s.current!.questionId);
      // Fallamos la primera crítica de cada categoría para ejercitar la recuperación.
      const fail = question.criticalSafety && !Object.values(s.concepts).some((c) => c.category === question.category && c.hadCriticalError);
      s = respond(s, !fail);
      s = closeFeedback(s, bank);
      if (fail) {
        criticalsSeen++;
        expect(finalUnlocked(s, bank)).toBe(false);
        s = closeFeedback(respond(startRecovery(s, bank, question.conceptId), true), bank);
      }
    }
    expect(s.badges).toHaveLength(6);
    expect(criticalsSeen).toBeGreaterThan(0);
    expect(finalUnlocked(s, bank)).toBe(true);

    s = startFinal(s, bank);
    expect(s.current!.questionId).toBe('final-1');
    s = closeFeedback(respond(s, true), bank);
    expect(s.current!.questionId).toBe('final-2');
    // Acción insegura en el paso 2: se detiene y se presenta la recuperación dentro del caso.
    s = respond(s, false);
    expect(currentAttempt(s)!.critical).toBe(true);
    s = closeFeedback(s, bank);
    expect(s.current!.questionId).toBe('final-2-r');
    expect(s.final.step).toBe(1);
    s = closeFeedback(respond(s, true), bank);
    expect(s.current!.questionId).toBe('final-3');
    s = closeFeedback(respond(s, true), bank);
    expect(s.final.status).toBe('completed');
    expect(s.celebration).toEqual({ kind: 'final' });
    const sum = buildSummary(s, bank);
    expect(sum.badges).toEqual({ num: 6, den: 6 });
    expect(sum.criticalErrors.every((c) => c.resolved)).toBe(true);
  });

  it('el desafío final no se habilita con una recuperación crítica pendiente', () => {
    let s = fresh();
    s = { ...s, badges: bank.categories.map((c) => ({ category: c.id, at: '' })) };
    expect(finalUnlocked(s, bank)).toBe(true);
    s = closeFeedback(respond(present(s, bank, 'far-04', 'guardia', null), false), bank);
    expect(finalUnlocked(s, bank)).toBe(false);
    expect(startFinal(s, bank).current).toBeNull();
  });
});

describe('alias', () => {
  it('limpia caracteres de control y limita la longitud', () => {
    expect(sanitizeAlias('  Ana\n\tMaría  ')).toBe('Ana María');
    expect(sanitizeAlias('x'.repeat(50))).toHaveLength(24);
  });
});
