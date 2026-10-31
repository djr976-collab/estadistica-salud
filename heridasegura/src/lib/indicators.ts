// Indicadores de calidad — funciones puras. Ver docs/METODOLOGIA_INDICADORES.md.
//
// Definiciones operativas (deben validarse con Epidemiología / Calidad institucional):
//  * Prevalencia puntual de LPP (fecha D): pacientes con ≥1 LPP activa en D
//    ÷ pacientes internados en D en las ubicaciones filtradas.
//  * Incidencia acumulada de LPP adquirida (período P): pacientes con ≥1 LPP
//    adquirida (no presente al ingreso) detectada en P ÷ pacientes en riesgo
//    (internados durante P sin LPP presente al ingreso en ese episodio).
//  * Densidad de incidencia: LPP adquiridas detectadas en P ÷ pacientes-día en P × 1000.
//  * La lesión se atribuye al sector donde estaba el paciente al momento de la detección.

import type { BedAssignment, IndicatorDataset, Location, PuCategory, Wound, WoundAssessment } from './types';
import { countsAsBed } from './hospital-structure';

export interface IndicatorFilter {
  serviceId?: string | null;
  sectorId?: string | null;
  from: Date;       // inicio del período (incidencia)
  to: Date;         // fin del período y fecha de corte (prevalencia)
  onlyInpatientBeds: boolean; // excluye camillas, shockroom y observación
  braderValidityHours?: number;
  now?: Date;
}

export interface Ratio { num: number; den: number; pct: number | null; }
const ratio = (num: number, den: number): Ratio => ({ num, den, pct: den > 0 ? Math.round((num / den) * 1000) / 10 : null });

export interface IndicatorResult {
  census: number;
  locationsInScope: { beds: number; nonBeds: number; occupied: number };
  prevalence: Ratio;
  prevalenceAcquired: Ratio;
  cumulativeIncidence: Ratio;
  incidenceDensity: { cases: number; patientDays: number; per1000: number | null };
  byStage: Record<string, number>;
  byRegion: Record<string, number>;
  byOrigin: { presente_ingreso: number; adquirida: number; sin_dato: number };
  bySector: { sectorId: string; name: string; active: number; lpp: number }[];
  byEtiology: Record<string, number>;
  bradenCoverage: Ratio;
  bradenCurrent: Ratio;
  pendingBraden: number;
  overdueFollowUps: number;
  followUpCompliance: Ratio;
  latestEvolution: Record<string, number>;
  warnings: string[];
}

const t = (s: string | null | undefined) => (s ? new Date(s).getTime() : NaN);

function overlaps(a: BedAssignment, from: number, to: number) {
  const s = t(a.started_at);
  const e = a.ended_at ? t(a.ended_at) : Infinity;
  return s <= to && e >= from;
}
function activeAt(a: BedAssignment, at: number) {
  return t(a.started_at) <= at && (a.ended_at == null || t(a.ended_at) > at);
}
function woundActiveAt(w: Wound, at: number) {
  return t(w.detected_at) <= at && (w.closed_at == null || t(w.closed_at) > at);
}

export function computeIndicators(ds: IndicatorDataset, f: IndicatorFilter): IndicatorResult {
  const now = (f.now ?? new Date()).getTime();
  const from = f.from.getTime();
  const to = Math.min(f.to.getTime(), now);
  const warnings: string[] = [];

  const sectorById = new Map(ds.sectors.map((s) => [s.id, s]));
  const locInScope = (l: Location | undefined) => {
    if (!l) return false;
    const sec = sectorById.get(l.sector_id);
    if (!sec) return false;
    if (f.sectorId && l.sector_id !== f.sectorId) return false;
    if (f.serviceId && sec.service_id !== f.serviceId) return false;
    if (f.onlyInpatientBeds && !countsAsBed(l.location_type)) return false;
    return true;
  };
  const locById = new Map(ds.locations.map((l) => [l.id, l]));
  const scopedLocations = ds.locations.filter((l) => l.active && locInScope(l));
  const scopedAssign = ds.assignments.filter((a) => locInScope(locById.get(a.location_id)));

  // Sector donde estaba el paciente al detectarse la lesión
  const assignmentsByPatient = new Map<string, BedAssignment[]>();
  for (const a of ds.assignments) {
    const arr = assignmentsByPatient.get(a.patient_id) ?? [];
    arr.push(a); assignmentsByPatient.set(a.patient_id, arr);
  }
  const locationAt = (patientId: string, at: number): Location | undefined => {
    const a = (assignmentsByPatient.get(patientId) ?? []).find((x) => activeAt(x, at))
      // tolera detección registrada en el mismo minuto del ingreso
      ?? (assignmentsByPatient.get(patientId) ?? []).find((x) => Math.abs(t(x.started_at) - at) < 60_000);
    return a ? locById.get(a.location_id) : undefined;
  };
  const woundInScope = (w: Wound) => locInScope(locationAt(w.patient_id, t(w.detected_at)));

  // ---- Censo / prevalencia (corte = to)
  const inpatientsAt = new Set(scopedAssign.filter((a) => activeAt(a, to)).map((a) => a.patient_id));
  const census = new Set(scopedAssign.filter((a) => a.ended_at == null).map((a) => a.patient_id)).size;
  const lpp = ds.wounds.filter((w) => w.etiology === 'lesion_por_presion');
  const prevPatients = new Set(lpp.filter((w) => inpatientsAt.has(w.patient_id) && woundActiveAt(w, to)).map((w) => w.patient_id));
  const prevAcq = new Set(lpp.filter((w) => inpatientsAt.has(w.patient_id) && woundActiveAt(w, to) && w.present_on_admission === 'no').map((w) => w.patient_id));

  // ---- Incidencia (período)
  const periodAssign = scopedAssign.filter((a) => overlaps(a, from, to));
  const admissionsInPeriod = new Set(periodAssign.map((a) => a.admission_id));
  const poaAdmissions = new Set(lpp.filter((w) => w.present_on_admission === 'si' && w.admission_id).map((w) => w.admission_id!));
  const atRiskAdmissions = [...admissionsInPeriod].filter((id) => !poaAdmissions.has(id));
  const atRiskSet = new Set(atRiskAdmissions);
  const newCases = lpp.filter((w) => w.present_on_admission === 'no' && t(w.detected_at) >= from && t(w.detected_at) <= to && woundInScope(w));
  const incidentAdmissions = new Set(newCases.filter((w) => w.admission_id && atRiskSet.has(w.admission_id)).map((w) => w.admission_id!));
  const unknownPoaInPeriod = lpp.filter((w) => w.present_on_admission === 'desconocido' && t(w.detected_at) >= from && t(w.detected_at) <= to && woundInScope(w));
  let patientDays = 0;
  for (const a of periodAssign) {
    const s = Math.max(t(a.started_at), from);
    const e = Math.min(a.ended_at ? t(a.ended_at) : to, to);
    if (e > s) patientDays += (e - s) / 86_400_000;
  }
  patientDays = Math.round(patientDays * 10) / 10;

  // ---- Distribuciones (lesiones activas al corte, en el alcance)
  const activeInScope = ds.wounds.filter((w) => woundActiveAt(w, to) && inpatientsAt.has(w.patient_id));
  const activeLpp = activeInScope.filter((w) => w.etiology === 'lesion_por_presion');
  const byStage: Record<string, number> = {};
  for (const w of activeLpp) {
    const k: PuCategory | 'sin_clasificar' = w.current_pu_category ?? 'sin_clasificar';
    byStage[k] = (byStage[k] ?? 0) + 1;
  }
  const byRegion: Record<string, number> = {};
  for (const w of activeLpp) byRegion[w.body_region] = (byRegion[w.body_region] ?? 0) + 1;
  const byEtiology: Record<string, number> = {};
  for (const w of activeInScope) byEtiology[w.etiology] = (byEtiology[w.etiology] ?? 0) + 1;
  const byOrigin = { presente_ingreso: 0, adquirida: 0, sin_dato: 0 };
  for (const w of activeLpp) {
    if (w.present_on_admission === 'si') byOrigin.presente_ingreso++;
    else if (w.present_on_admission === 'no') byOrigin.adquirida++;
    else byOrigin.sin_dato++;
  }
  const currentLocOfPatient = new Map(scopedAssign.filter((a) => activeAt(a, to)).map((a) => [a.patient_id, locById.get(a.location_id)!]));
  const sectorAgg = new Map<string, { active: number; lpp: number }>();
  for (const w of activeInScope) {
    const l = currentLocOfPatient.get(w.patient_id);
    if (!l) continue;
    const agg = sectorAgg.get(l.sector_id) ?? { active: 0, lpp: 0 };
    agg.active++; if (w.etiology === 'lesion_por_presion') agg.lpp++;
    sectorAgg.set(l.sector_id, agg);
  }
  const bySector = [...sectorAgg.entries()].map(([sectorId, v]) => ({ sectorId, name: sectorById.get(sectorId)?.name ?? '—', ...v }))
    .sort((a, b) => b.active - a.active);

  // ---- Braden (pacientes internados al corte)
  const validity = (f.braderValidityHours ?? 24) * 3_600_000;
  const currentAdmissionOf = new Map(scopedAssign.filter((a) => activeAt(a, to)).map((a) => [a.patient_id, a.admission_id]));
  let withBraden = 0, withCurrent = 0;
  for (const [pid, admId] of currentAdmissionOf) {
    const b = ds.braden.filter((x) => x.patient_id === pid && (x.admission_id === admId || x.admission_id == null) && t(x.assessed_at) <= to);
    if (b.length) withBraden++;
    if (b.some((x) => to - t(x.assessed_at) <= validity)) withCurrent++;
  }

  // ---- Seguimiento
  const assessByWound = new Map<string, WoundAssessment[]>();
  for (const a of ds.assessments) {
    const arr = assessByWound.get(a.wound_id) ?? [];
    arr.push(a); assessByWound.set(a.wound_id, arr);
  }
  for (const arr of assessByWound.values()) arr.sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
  let overdue = 0;
  const latestEvolution: Record<string, number> = {};
  for (const w of activeInScope) {
    const arr = assessByWound.get(w.id) ?? [];
    const last = arr[arr.length - 1];
    if (!last) { latestEvolution['sin_valoracion'] = (latestEvolution['sin_valoracion'] ?? 0) + 1; continue; }
    latestEvolution[last.evolution] = (latestEvolution[last.evolution] ?? 0) + 1;
    if (last.next_assessment_due && t(last.next_assessment_due) < to) overdue++;
  }
  // Cumplimiento: valoraciones programadas con vencimiento en el período cuya reevaluación se hizo a tiempo
  let due = 0, onTime = 0;
  const scopedWoundIds = new Set(ds.wounds.filter(woundInScope).map((w) => w.id));
  for (const [wid, arr] of assessByWound) {
    if (!scopedWoundIds.has(wid)) continue;
    const wound = ds.wounds.find((w) => w.id === wid);
    arr.forEach((a, i) => {
      if (!a.next_assessment_due) return;
      const d = t(a.next_assessment_due);
      if (d < from || d > to) return;
      if (wound?.closed_at && t(wound.closed_at) <= d) return; // lesión cerrada antes del vencimiento
      due++;
      const nxt = arr[i + 1];
      if (nxt && t(nxt.assessed_at) <= d) onTime++;
    });
  }

  // ---- Advertencias metodológicas
  if (unknownPoaInPeriod.length)
    warnings.push(`${unknownPoaInPeriod.length} LPP del período sin dato verificable de presencia al ingreso: excluidas del numerador de incidencia (puede subestimarse).`);
  const unclassified = activeLpp.filter((w) => !w.current_pu_category).length;
  if (unclassified) warnings.push(`${unclassified} LPP activa(s) sin categoría confirmada.`);
  const noAssessment = activeInScope.filter((w) => !(assessByWound.get(w.id)?.length)).length;
  if (noAssessment) warnings.push(`${noAssessment} lesión(es) activa(s) sin valoración registrada.`);
  if (inpatientsAt.size > 0 && inpatientsAt.size < 30)
    warnings.push(`Denominador pequeño (${inpatientsAt.size} pacientes): interpretar porcentajes con cautela.`);
  if (!f.onlyInpatientBeds)
    warnings.push('Incluye camillas, shockroom y observación: no comparable con indicadores de internación.');
  if (to < f.to.getTime()) warnings.push('La fecha de corte posterior a hoy se ajustó al momento actual.');
  warnings.push('Los indicadores se calculan solo sobre los registros cargados en el sistema y visibles para su usuario.');

  return {
    census,
    locationsInScope: {
      beds: scopedLocations.filter((l) => countsAsBed(l.location_type)).length,
      nonBeds: scopedLocations.filter((l) => !countsAsBed(l.location_type)).length,
      occupied: new Set(scopedAssign.filter((a) => a.ended_at == null).map((a) => a.location_id)).size,
    },
    prevalence: ratio(prevPatients.size, inpatientsAt.size),
    prevalenceAcquired: ratio(prevAcq.size, inpatientsAt.size),
    cumulativeIncidence: ratio(incidentAdmissions.size, atRiskAdmissions.length),
    incidenceDensity: { cases: newCases.length, patientDays, per1000: patientDays > 0 ? Math.round((newCases.length / patientDays) * 10000) / 10 : null },
    byStage, byRegion, byOrigin, bySector, byEtiology,
    bradenCoverage: ratio(withBraden, currentAdmissionOf.size),
    bradenCurrent: ratio(withCurrent, currentAdmissionOf.size),
    pendingBraden: currentAdmissionOf.size - withBraden,
    overdueFollowUps: overdue,
    followUpCompliance: ratio(onTime, due),
    latestEvolution,
    warnings,
  };
}
