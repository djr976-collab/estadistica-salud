import { describe, expect, it } from 'vitest';
import { computeIndicators } from './indicators';
import { buildStructure } from './hospital-structure';
import type { Admission, BedAssignment, IndicatorDataset, Patient, Wound } from './types';

const st = buildStructure();
const loc = (code: string) => st.locations.find((l) => l.code === code)!;
const D = (s: string) => new Date(s).toISOString();

function ds(): IndicatorDataset {
  const patients = ['p1', 'p2', 'p3', 'p4'].map((id) => ({ id } as Patient));
  const admissions = ['p1', 'p2', 'p3', 'p4'].map((p) => ({ id: 'a' + p, patient_id: p } as Admission));
  const assignments: BedAssignment[] = [
    { id: 'b1', admission_id: 'ap1', patient_id: 'p1', location_id: loc('30B').id, movement: 'ingreso', started_at: D('2026-10-01'), ended_at: null, notes: null },
    { id: 'b2', admission_id: 'ap2', patient_id: 'p2', location_id: loc('28A').id, movement: 'ingreso', started_at: D('2026-10-01'), ended_at: null, notes: null },
    { id: 'b3', admission_id: 'ap3', patient_id: 'p3', location_id: loc('1A').id, movement: 'ingreso', started_at: D('2026-10-01'), ended_at: D('2026-10-11'), notes: null },
    { id: 'b4', admission_id: 'ap4', patient_id: 'p4', location_id: loc('EMG-CAM-01').id, movement: 'ingreso', started_at: D('2026-10-05'), ended_at: null, notes: null },
  ];
  const w = (o: Partial<Wound>): Wound => ({ etiology: 'lesion_por_presion', status: 'activa', closed_at: null, body_region: 'Sacro', current_pu_category: 'estadio_2', ...o } as Wound);
  const wounds = [
    w({ id: 'w1', patient_id: 'p1', admission_id: 'ap1', present_on_admission: 'no', detected_at: D('2026-10-05') }),
    w({ id: 'w2', patient_id: 'p2', admission_id: 'ap2', present_on_admission: 'si', detected_at: D('2026-10-01T00:00:30Z') }),
    w({ id: 'w3', patient_id: 'p3', admission_id: 'ap3', present_on_admission: 'no', detected_at: D('2026-10-04'), status: 'resuelta', closed_at: D('2026-10-08') }),
    w({ id: 'w4', patient_id: 'p4', admission_id: 'ap4', present_on_admission: 'no', detected_at: D('2026-10-06') }),
  ];
  return { services: st.services, sectors: st.sectors, locations: st.locations, patients, admissions, assignments, wounds, assessments: [], braden: [], interventions: [] };
}

const f = { from: new Date('2026-10-01'), to: new Date('2026-10-20'), onlyInpatientBeds: true, now: new Date('2026-10-20') };

describe('Indicadores', () => {
  it('prevalencia puntual usa internados en la fecha de corte como denominador', () => {
    const r = computeIndicators(ds(), f);
    // internados al 20/10 en camas: p1, p2 (p3 egresó; p4 en camilla excluida)
    expect(r.prevalence).toEqual({ num: 2, den: 2, pct: 100 });
    expect(r.prevalenceAcquired.num).toBe(1);
  });
  it('incidencia acumulada excluye del denominador episodios con LPP presente al ingreso', () => {
    const r = computeIndicators(ds(), f);
    // en riesgo: ap1, ap3 (ap2 tenía LPP al ingreso; ap4 en camilla)
    expect(r.cumulativeIncidence).toEqual({ num: 2, den: 2, pct: 100 });
  });
  it('camillas excluidas salvo indicación explícita', () => {
    const r = computeIndicators(ds(), { ...f, onlyInpatientBeds: false });
    expect(r.prevalence.den).toBe(3);
    expect(r.warnings.join()).toMatch(/camillas/);
  });
  it('filtra por sector según ubicación al momento de la detección', () => {
    const s4 = st.sectors.find((s) => s.code === 'CQ-S4')!.id;
    const r = computeIndicators(ds(), { ...f, sectorId: s4 });
    expect(r.prevalence.den).toBe(2);
    expect(r.incidenceDensity.cases).toBe(1);
  });
  it('densidad de incidencia por 1000 pacientes-día', () => {
    const r = computeIndicators(ds(), f);
    // pacientes-día: p1 19, p2 19, p3 10 = 48; casos adquiridos en camas: w1, w3 = 2
    expect(r.incidenceDensity.patientDays).toBe(48);
    expect(r.incidenceDensity.per1000).toBeCloseTo(41.7, 1);
  });
  it('advierte denominadores pequeños', () => {
    expect(computeIndicators(ds(), f).warnings.join()).toMatch(/Denominador pequeño/);
  });
  it('sin pacientes no divide por cero', () => {
    const r = computeIndicators({ ...ds(), assignments: [] }, f);
    expect(r.prevalence.pct).toBeNull();
  });
});
