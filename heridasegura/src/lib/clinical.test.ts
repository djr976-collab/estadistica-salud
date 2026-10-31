import { describe, expect, it } from 'vitest';
import { bradenRisk, bradenTotal, puTransitionError, validateAssessment, woundAlerts, areaCm2, ageYears, type AssessmentDraft } from './clinical';
import type { Wound, WoundAssessment } from './types';

const base: AssessmentDraft = {
  etiology: 'lesion_por_presion', current_category: null, pu_category: null, blanching: 'no_aplica',
  classification_confirmed: false, measurement_method: 'no_medible', length_cm: null, width_cm: null, depth_cm: null,
  tissue: [null, null, null, null], pain_score: null, assessed_at: new Date().toISOString(), next_assessment_due: null,
  evolution: 'primera_valoracion',
};

describe('Braden', () => {
  it('suma las seis dimensiones', () => {
    expect(bradenTotal({ sensory: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 3 })).toBe(23);
    expect(bradenTotal({ sensory: 1, moisture: 1, activity: 1, mobility: 1, nutrition: 1, friction: 1 })).toBe(6);
  });
  it('rechaza datos incompletos o fuera de rango', () => {
    expect(bradenTotal({ sensory: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4 })).toBeNull();
    expect(bradenTotal({ sensory: 4, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 4 })).toBeNull();
    expect(bradenTotal({ sensory: 0, moisture: 4, activity: 4, mobility: 4, nutrition: 4, friction: 3 })).toBeNull();
  });
  it('clasifica el riesgo con puntos de corte', () => {
    expect(bradenRisk(9)).toBe('muy_alto');
    expect(bradenRisk(10)).toBe('alto');
    expect(bradenRisk(12)).toBe('alto');
    expect(bradenRisk(13)).toBe('moderado');
    expect(bradenRisk(15)).toBe('leve');
    expect(bradenRisk(18)).toBe('leve');
    expect(bradenRisk(19)).toBe('sin_riesgo');
  });
});

describe('Clasificación LPP', () => {
  it('impide la estadificación inversa', () => {
    expect(puTransitionError('estadio_4', 'estadio_2')).toMatch(/inversa/);
    expect(puTransitionError('estadio_3', 'estadio_2')).toMatch(/inversa/);
    expect(puTransitionError('estadio_3', 'tejido_profundo')).toMatch(/inversa/);
  });
  it('permite progresión y reclasificaciones válidas', () => {
    expect(puTransitionError('estadio_2', 'estadio_3')).toBeNull();
    expect(puTransitionError('no_clasificable', 'estadio_4')).toBeNull();
    expect(puTransitionError('tejido_profundo', 'no_clasificable')).toBeNull();
    expect(puTransitionError('estadio_1', 'tejido_profundo')).toBeNull();
  });
  it('no clasificable solo pasa a 3 o 4', () => {
    expect(puTransitionError('no_clasificable', 'estadio_2')).toMatch(/3 o 4/);
  });
  it('mucosa no se estadifica', () => {
    expect(puTransitionError('membrana_mucosa', 'estadio_2')).toMatch(/mucosa/);
  });
  it('estadio 1 exige blanqueamiento evaluado presencialmente', () => {
    const e = validateAssessment({ ...base, pu_category: 'estadio_1', classification_confirmed: true, blanching: 'no_evaluado' });
    expect(e.join()).toMatch(/NO blanqueable/);
    expect(validateAssessment({ ...base, pu_category: 'estadio_1', classification_confirmed: true, blanching: 'no_blanqueable' })).toEqual([]);
  });
  it('no aplica estadios a otras etiologías', () => {
    const e = validateAssessment({ ...base, etiology: 'quirurgica', pu_category: 'estadio_2', classification_confirmed: true });
    expect(e.join()).toMatch(/otra etiología/);
  });
  it('requiere confirmación profesional', () => {
    expect(validateAssessment({ ...base, pu_category: 'estadio_3' }).join()).toMatch(/confirmar/);
  });
});

describe('Valoración: mediciones y campos', () => {
  it('exige largo y ancho si se midió', () => {
    expect(validateAssessment({ ...base, measurement_method: 'regla_milimetrada', length_cm: 3, width_cm: null }).join()).toMatch(/largo y ancho/);
  });
  it('no admite dimensiones si no se midió', () => {
    expect(validateAssessment({ ...base, length_cm: 3, width_cm: 2 }).join()).toMatch(/no registre/);
  });
  it('tejidos no superan 100 %', () => {
    expect(validateAssessment({ ...base, tissue: [60, 30, 20, null] }).join()).toMatch(/supera/);
  });
  it('dolor 0-10 entero', () => {
    expect(validateAssessment({ ...base, pain_score: 11 }).length).toBe(1);
  });
  it('cierre requiere confirmación clínica', () => {
    expect(validateAssessment({ ...base, evolution: 'resuelta' }).join()).toMatch(/confirmación clínica/);
  });
  it('superficie = largo × ancho', () => {
    expect(areaCm2({ length_cm: 4, width_cm: 2.5, measurement_method: 'regla_milimetrada' })).toBe(10);
    expect(areaCm2({ length_cm: 4, width_cm: 2.5, measurement_method: 'no_medible' })).toBeNull();
  });
  it('edad', () => {
    expect(ageYears('2000-06-15', new Date('2026-06-14'))).toBe(25);
    expect(ageYears('2000-06-15', new Date('2026-06-15'))).toBe(26);
  });
});

describe('Alertas', () => {
  const wound = { id: 'w', status: 'activa' } as Wound;
  const mk = (o: Partial<WoundAssessment>): WoundAssessment => ({
    id: Math.random().toString(), wound_id: 'w', assessed_at: '2026-10-01T10:00:00Z', measurement_method: 'regla_milimetrada',
    length_cm: 2, width_cm: 2, clinical_signs: [], evolution: 'sin_cambios', next_assessment_due: '2026-12-01T00:00:00Z', ...o,
  } as WoundAssessment);
  it('seguimiento vencido', () => {
    const a = woundAlerts(wound, [mk({ next_assessment_due: '2026-10-02T00:00:00Z' })], new Date('2026-10-05'));
    expect(a.map((x) => x.code)).toContain('seguimiento_vencido');
  });
  it('aumento de superficie entre mediciones comparables', () => {
    const a = woundAlerts(wound, [mk({}), mk({ assessed_at: '2026-10-03T10:00:00Z', length_cm: 3, width_cm: 2 })], new Date('2026-10-04'));
    expect(a.map((x) => x.code)).toContain('aumento_superficie');
  });
  it('no compara métodos distintos', () => {
    const a = woundAlerts(wound, [mk({}), mk({ assessed_at: '2026-10-03T10:00:00Z', length_cm: 3, width_cm: 2, measurement_method: 'foto_calibrada' })], new Date('2026-10-04'));
    expect(a.map((x) => x.code)).not.toContain('aumento_superficie');
  });
  it('signos documentados no se presentan como diagnóstico', () => {
    const a = woundAlerts(wound, [mk({ clinical_signs: ['Exudado purulento'] })], new Date('2026-10-04'));
    expect(a.find((x) => x.code === 'signos')?.message).toMatch(/No constituye diagnóstico/);
  });
});
