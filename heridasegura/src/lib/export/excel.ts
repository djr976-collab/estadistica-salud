'use client';
import type { IndicatorDataset } from '../types';
import type { IndicatorResult, IndicatorFilter } from '../indicators';
import { ETIOLOGY_LABEL, EVOLUTION_LABEL, PU_CATEGORIES, POA_LABEL, areaCm2, ageYears, bradenRisk } from '../clinical';

async function download(wb: import('exceljs').Workbook, name: string) {
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function sheet(wb: import('exceljs').Workbook, name: string, header: string[], rows: (string | number | null)[][]) {
  const ws = wb.addWorksheet(name);
  ws.addRow(header).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3D48' } };
  rows.forEach((r) => ws.addRow(r));
  ws.columns.forEach((c) => { c.width = 22; });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  return ws;
}

export async function exportIndicatorsExcel(r: IndicatorResult, f: IndicatorFilter, scope: string) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook(); wb.creator = 'HeridaSegura IA';
  const pct = (x: { num: number; den: number; pct: number | null }) => [x.num, x.den, x.pct];
  sheet(wb, 'Resumen', ['Indicador', 'Numerador', 'Denominador', '% / tasa', 'Alcance', 'Desde', 'Hasta'], [
    ['Prevalencia puntual LPP', ...pct(r.prevalence), scope, f.from.toLocaleDateString('es-AR'), f.to.toLocaleDateString('es-AR')],
    ['Prevalencia LPP adquirida', ...pct(r.prevalenceAcquired), scope, '', ''],
    ['Incidencia acumulada LPP adquirida', ...pct(r.cumulativeIncidence), scope, '', ''],
    ['Densidad de incidencia (por 1000 pac-día)', r.incidenceDensity.cases, r.incidenceDensity.patientDays, r.incidenceDensity.per1000, scope, '', ''],
    ['Cobertura Braden (episodio)', ...pct(r.bradenCoverage), scope, '', ''],
    ['Braden vigente', ...pct(r.bradenCurrent), scope, '', ''],
    ['Cumplimiento de seguimiento', ...pct(r.followUpCompliance), scope, '', ''],
    ['Seguimientos vencidos', r.overdueFollowUps, null, null, scope, '', ''],
  ]);
  sheet(wb, 'Por categoría', ['Categoría', 'n'], Object.entries(r.byStage).map(([k, v]) => [k in PU_CATEGORIES ? PU_CATEGORIES[k as keyof typeof PU_CATEGORIES].short : 'Sin clasificar', v]));
  sheet(wb, 'Por localización', ['Localización', 'n'], Object.entries(r.byRegion));
  sheet(wb, 'Por sector', ['Sector', 'Lesiones activas', 'LPP activas'], r.bySector.map((s) => [s.name, s.active, s.lpp]));
  sheet(wb, 'Advertencias', ['Advertencia metodológica'], r.warnings.map((w) => [w]));
  await download(wb, `indicadores-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Exportación ANONIMIZADA para docencia/investigación:
 * - Sin nombre, HC ni fecha de nacimiento (solo franja etaria).
 * - Identificadores seudónimos aleatorios por exportación (no reversibles).
 * - Fechas convertidas a días relativos al ingreso.
 * - Se excluyen textos libres (pueden contener identificadores) y fotografías.
 * Requiere además evaluación de riesgo de reidentificación y aval del Comité de Ética/Docencia.
 */
export async function exportAnonymizedExcel(ds: IndicatorDataset) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook(); wb.creator = 'HeridaSegura IA';
  const pseudo = new Map<string, string>();
  const tag = (prefix: string, id: string) => {
    if (!pseudo.has(id)) pseudo.set(id, `${prefix}-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase()}`);
    return pseudo.get(id)!;
  };
  const band = (b: string | null) => { const a = ageYears(b); if (a == null) return 'ND'; if (a >= 90) return '90+'; const lo = Math.floor(a / 10) * 10; return `${lo}-${lo + 9}`; };
  const admOf = new Map(ds.admissions.map((a) => [a.id, a]));
  const rel = (iso: string, admissionId: string | null) => {
    const a = admissionId ? admOf.get(admissionId) : null;
    return a ? Math.round(((new Date(iso).getTime() - new Date(a.admitted_at).getTime()) / 86_400_000) * 10) / 10 : null;
  };
  const sectorOf = new Map(ds.locations.map((l) => [l.id, ds.sectors.find((s) => s.id === l.sector_id)?.code ?? '']));
  const firstSector = (pid: string) => { const a = ds.assignments.filter((x) => x.patient_id === pid).sort((x, y) => x.started_at.localeCompare(y.started_at))[0]; return a ? sectorOf.get(a.location_id) ?? '' : ''; };
  sheet(wb, 'Pacientes', ['ID seudónimo', 'Franja etaria', 'Sexo', 'Sector inicial'], ds.patients.map((p) => [tag('P', p.id), band(p.birth_date), p.sex ?? 'ND', firstSector(p.id)]));
  sheet(wb, 'Lesiones', ['ID lesión', 'ID paciente', 'Etiología', 'Región', 'Origen', 'Cat. inicial', 'Cat. vigente', 'Día detección (desde ingreso)', 'Estado'],
    ds.wounds.map((w) => [tag('L', w.id), tag('P', w.patient_id), ETIOLOGY_LABEL[w.etiology], w.body_region, POA_LABEL[w.present_on_admission],
      w.initial_pu_category ? PU_CATEGORIES[w.initial_pu_category].short : '', w.current_pu_category ? PU_CATEGORIES[w.current_pu_category].short : '',
      rel(w.detected_at, w.admission_id), w.status]));
  const woundAdm = new Map(ds.wounds.map((w) => [w.id, w.admission_id]));
  sheet(wb, 'Valoraciones', ['ID lesión', 'Día (desde ingreso)', 'Categoría', 'Método', 'Largo', 'Ancho', 'Prof.', 'Sup. cm²', 'Granulación %', 'Esfacelo %', 'Necrosis %', 'Epitel. %', 'Exudado', 'Dolor', 'Evolución'],
    ds.assessments.map((a) => [tag('L', a.wound_id), rel(a.assessed_at, woundAdm.get(a.wound_id) ?? null), a.pu_category ? PU_CATEGORIES[a.pu_category].short : '', a.measurement_method,
      a.length_cm, a.width_cm, a.depth_cm, areaCm2(a), a.tissue_granulation_pct, a.tissue_slough_pct, a.tissue_necrosis_pct, a.tissue_epithelial_pct, a.exudate_amount, a.pain_score, EVOLUTION_LABEL[a.evolution]]));
  sheet(wb, 'Braden', ['ID paciente', 'Día (desde ingreso)', 'Total', 'Riesgo', 'S', 'H', 'A', 'M', 'N', 'F'],
    ds.braden.map((b) => [tag('P', b.patient_id), rel(b.assessed_at, b.admission_id), b.total, bradenRisk(b.total), b.sensory, b.moisture, b.activity, b.mobility, b.nutrition, b.friction]));
  sheet(wb, 'Notas', ['Nota'], [
    ['Datos seudonimizados: identificadores aleatorios generados en cada exportación, sin tabla de correspondencia.'],
    ['Se excluyen nombre, historia clínica, fecha de nacimiento, textos libres y fotografías.'],
    ['Las fechas se expresan como días desde el ingreso.'],
    ['Antes de su uso en investigación, evaluar riesgo de reidentificación (celdas pequeñas) y obtener aval institucional / Comité de Ética.'],
  ]);
  await download(wb, `heridasegura-anonimizado-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
