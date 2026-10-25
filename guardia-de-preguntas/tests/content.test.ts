import { describe, expect, it } from 'vitest';
import { academicModeAvailability, bank, countPlayable } from '../src/content/bank';
import { validateBank } from '../src/content/validate';
import { recomputeNumeric } from '../src/engine/evaluate';

describe('banco de contenidos', () => {
  const report = validateBank(bank);

  it('no tiene errores de validación', () => {
    expect(report.errors).toEqual([]);
  });

  it('muestra advertencias para revisión docente (informativo)', () => {
    if (report.warnings.length) console.info('Advertencias:\n' + report.warnings.join('\n'));
    expect(Array.isArray(report.warnings)).toBe(true);
  });

  it('tiene 36 preguntas base, 6 por categoría', () => {
    const base = bank.questions.filter((q) => !q.isRecoveryVariant && !q.finalChallenge);
    expect(base).toHaveLength(36);
    for (const c of bank.categories) expect(base.filter((q) => q.category === c.id)).toHaveLength(6);
  });

  it('distribución de dificultad cercana a 20/50/30', () => {
    const base = bank.questions.filter((q) => !q.isRecoveryVariant && !q.finalChallenge);
    const share = (d: string) => base.filter((q) => q.difficulty === d).length / base.length;
    expect(share('conceptual')).toBeGreaterThanOrEqual(0.15);
    expect(share('conceptual')).toBeLessThanOrEqual(0.25);
    expect(share('aplicacion')).toBeGreaterThanOrEqual(0.45);
    expect(share('integracion')).toBeGreaterThanOrEqual(0.25);
  });

  it('cada pregunta crítica tiene una variante de recuperación distinta', () => {
    const critical = bank.questions.filter((q) => q.criticalSafety && !q.isRecoveryVariant);
    expect(critical.length).toBeGreaterThanOrEqual(6);
    for (const q of critical) {
      const r = bank.byId.get(q.recoveryQuestionId!);
      expect(r, q.id).toBeDefined();
      expect(r!.isRecoveryVariant).toBe(true);
      expect(r!.id).not.toBe(q.id);
    }
  });

  it('los cálculos se verifican de forma independiente', () => {
    const numeric = bank.questions.filter((q) => q.type === 'numeric');
    expect(numeric.length).toBeGreaterThanOrEqual(5);
    for (const q of numeric) {
      const r = recomputeNumeric(q)!;
      expect(Math.abs(r - q.numericAnswer!), q.id).toBeLessThanOrEqual(Math.max(q.tolerance!, 0.01));
    }
  });

  it('ningún contenido figura como aprobado: es un borrador generado con asistencia de IA', () => {
    expect(bank.questions.every((q) => q.reviewStatus === 'draft')).toBe(true);
    expect(countPlayable(bank, 'academic')).toBe(0);
    expect(academicModeAvailability(bank).available).toBe(false);
  });

  it('cada fuente citada existe en el catálogo y declara su verificación', () => {
    for (const s of bank.sources.values()) expect(s.verification.length).toBeGreaterThan(10);
  });
});
