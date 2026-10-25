import { describe, expect, it } from 'vitest';
import { subjectBanks, subjects } from '../src/content/subjects';
import { validateBank } from '../src/content/validate';
import { recomputeNumeric } from '../src/engine/evaluate';
import { answer, categoryStats, closeFeedback, newGame, presentNext, reviewQueue, startRecovery } from '../src/engine/game';
import type { Question } from '../src/types';

describe('bancos por materia', () => {
  it('hay 8 materias, cada una con su banco', () => {
    expect(subjects).toHaveLength(8);
    for (const s of subjects) expect(subjectBanks.get(s.id)).toBeDefined();
  });

  for (const s of subjects) {
    describe(s.name, () => {
      const bank = subjectBanks.get(s.id)!;
      const base = bank.questions.filter((q) => !q.isRecoveryVariant);

      it('valida sin errores', () => {
        const r = validateBank(bank, { requireFinal: false });
        expect(r.errors).toEqual([]);
      });

      it('tiene 20 preguntas base con distribución 4/10/6', () => {
        expect(base).toHaveLength(20);
        const n = (d: string) => base.filter((q) => q.difficulty === d).length;
        expect([n('conceptual'), n('aplicacion'), n('integracion')]).toEqual([4, 10, 6]);
      });

      it('cada pregunta base es un concepto distinto y tiene tema', () => {
        expect(new Set(base.map((q) => q.conceptId)).size).toBe(base.length);
        for (const q of base) expect(s.topics).toContain(q.topic);
      });

      it('los cálculos coinciden con el recálculo independiente', () => {
        for (const q of bank.questions.filter((x) => x.type === 'numeric')) {
          expect(Math.abs(recomputeNumeric(q)! - q.numericAnswer!), q.id).toBeLessThanOrEqual(Math.max(q.tolerance!, 0.01));
        }
      });

      it('todo el contenido está en borrador', () => {
        expect(bank.questions.every((q) => q.reviewStatus === 'draft')).toBe(true);
      });
    });
  }
});

describe('repaso por materia', () => {
  const bank = subjectBanks.get('mat-farmacologia')!;
  const right = (q: Question) => (q.type === 'numeric' ? { numeric: String(q.numericAnswer).replace('.', ',') } : { optionId: q.correctOptionId! });
  const wrong = (q: Question) =>
    q.type === 'numeric' ? { numeric: '999' } : { optionId: q.options.find((o) => o.id !== q.correctOptionId)!.id };

  it('presenta preguntas nuevas de la materia hasta agotarla, sin repetir ni sacar variantes', () => {
    let s = newGame({ alias: '', avatarId: 'a1', contentMode: 'demo', seed: 11 });
    const seen = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const p = presentNext(s, bank, 'mat-farmacologia');
      expect(p.ok).toBe(true);
      if (!p.ok) return;
      const q = bank.byId.get(p.state.current!.questionId)!;
      expect(q.isRecoveryVariant).toBeFalsy();
      expect(seen.has(q.id)).toBe(false);
      seen.add(q.id);
      const r = answer(p.state, bank, right(q));
      if (!r.ok) throw new Error();
      s = closeFeedback(r.state, bank);
    }
    expect(presentNext(s, bank, 'mat-farmacologia')).toMatchObject({ ok: false, reason: 'exhausted' });
    expect(s.badges.map((b) => b.category)).toEqual(['mat-farmacologia']);
  });

  it('la insignia exige 12 conceptos resueltos y ninguna crítica pendiente', () => {
    let s = newGame({ alias: '', avatarId: 'a1', contentMode: 'demo', seed: 3 });
    let failedCritical: Question | null = null;
    for (let i = 0; i < 20 && s.badges.length === 0; i++) {
      const p = presentNext(s, bank, 'mat-farmacologia');
      if (!p.ok) break;
      const q = bank.byId.get(p.state.current!.questionId)!;
      const fail = q.criticalSafety && !failedCritical;
      if (fail) failedCritical = q;
      const r = answer(p.state, bank, fail ? wrong(q) : right(q));
      if (!r.ok) throw new Error();
      s = closeFeedback(r.state, bank);
    }
    expect(failedCritical).not.toBeNull();
    const st = categoryStats(s, bank, 'mat-farmacologia');
    expect(st.pendingCritical).toBe(1);
    expect(st.resolved).toBeGreaterThanOrEqual(12);
    expect(s.badges).toHaveLength(0);
    // El repaso ofrece primero la crítica, con su variante.
    const queue = reviewQueue(s, bank);
    expect(queue[0].concept.status).toBe('pending_critical');
    s = startRecovery(s, bank, failedCritical!.conceptId);
    expect(s.current!.questionId).toBe(failedCritical!.recoveryQuestionId);
    const r = answer(s, bank, right(bank.byId.get(s.current!.questionId)!));
    if (!r.ok) throw new Error();
    expect(r.state.badges.map((b) => b.category)).toEqual(['mat-farmacologia']);
  });
});
