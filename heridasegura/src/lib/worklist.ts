import { bradenAlerts, woundAlerts, type ClinicalAlert } from './clinical';
import type { IndicatorDataset, Location, Patient, Wound } from './types';

export interface WorkItem { patient: Patient; location: Location | null; wound: Wound | null; alert: ClinicalAlert }

/** Lista de trabajo: alertas para REEVALUACIÓN profesional (no diagnósticos). */
export function buildWorklist(ds: IndicatorDataset, bradenValidityHours: number, sectorIds?: string[] | null, now = new Date()): WorkItem[] {
  const out: WorkItem[] = [];
  const locById = new Map(ds.locations.map((l) => [l.id, l]));
  for (const asg of ds.assignments.filter((a) => !a.ended_at)) {
    const loc = locById.get(asg.location_id) ?? null;
    if (sectorIds && sectorIds.length && loc && !sectorIds.includes(loc.sector_id)) continue;
    const patient = ds.patients.find((p) => p.id === asg.patient_id);
    if (!patient) continue;
    for (const w of ds.wounds.filter((x) => x.patient_id === patient.id && x.status === 'activa')) {
      for (const alert of woundAlerts(w, ds.assessments.filter((a) => a.wound_id === w.id), now)) out.push({ patient, location: loc, wound: w, alert });
    }
    const b = ds.braden.filter((x) => x.patient_id === patient.id && x.admission_id === asg.admission_id).sort((x, y) => y.assessed_at.localeCompare(x.assessed_at))[0];
    for (const alert of bradenAlerts(b, bradenValidityHours, now)) out.push({ patient, location: loc, wound: null, alert });
  }
  return out.sort((a, b) => (a.alert.level === b.alert.level ? 0 : a.alert.level === 'alta' ? -1 : 1));
}
