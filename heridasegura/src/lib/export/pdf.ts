'use client';
// Informes PDF generados en el dispositivo (no se envían datos a terceros).
import type { Repo, WoundSummary } from '../data/repo';
import type { BradenAssessment, NursingIntervention, PatientDetail, Settings, WoundDetail } from '../types';
import type { IndicatorResult, IndicatorFilter } from '../indicators';
import {
  BRADEN_RISK_LABEL, ETIOLOGY_LABEL, EVOLUTION_LABEL, EXUDATE_LABEL, INTERVENTION_LABEL, LATERALITY_LABEL, MEASUREMENT_LABEL,
  POA_LABEL, PU_CATEGORIES, ageYears, areaCm2, bradenRisk, fullName,
} from '../clinical';
import { displayPhotos } from '../photos';

const PETROL: [number, number, number] = [15, 61, 72];
const dt = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

async function doc(title: string, settings: Settings, subtitle?: string) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const d = new jsPDF({ unit: 'mm', format: 'a4' });
  d.setFillColor(...PETROL); d.rect(0, 0, 210, 24, 'F');
  d.setTextColor(255, 255, 255); d.setFontSize(14); d.text('HeridaSegura IA', 12, 10);
  d.setFontSize(9); d.text(`${settings.hospital_name} — ${settings.hospital_city}`, 12, 16);
  d.setTextColor(20, 20, 20); d.setFontSize(15); d.text(title, 12, 34);
  if (subtitle) { d.setFontSize(10); d.text(subtitle, 12, 40); }
  let y = subtitle ? 46 : 40;
  const footer = () => {
    const n = d.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      d.setPage(i); d.setFontSize(7); d.setTextColor(110, 110, 110);
      d.text(`Generado ${new Date().toLocaleString('es-AR')} · Documento confidencial (Ley 25.326 / Ley 26.529) · Página ${i}/${n}`, 12, 290);
      d.text('Prototipo: datos ficticios. La información de apoyo no reemplaza el juicio clínico profesional.', 12, 294);
    }
  };
  const table = (head: string[], body: (string | number)[][], title?: string) => {
    if (title) { if (y > 260) { d.addPage(); y = 16; } d.setFontSize(11); d.setTextColor(...PETROL); d.text(title, 12, y + 4); d.setTextColor(20, 20, 20); y += 7; }
    autoTable(d, { startY: y, head: [head], body: body.map((r) => r.map((c) => String(c ?? '—'))), styles: { fontSize: 8, cellPadding: 1.5 }, headStyles: { fillColor: PETROL }, margin: { left: 12, right: 12 } });
    y = (d as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  };
  const text = (s: string, size = 9) => {
    d.setFontSize(size);
    for (const line of d.splitTextToSize(s, 186) as string[]) { if (y > 280) { d.addPage(); y = 16; } d.text(line, 12, y); y += size * 0.45; }
    y += 2;
  };
  return { d, table, text, footer, getY: () => y, setY: (v: number) => { y = v; } };
}

async function blobToDataUrl(url: string): Promise<string | null> {
  try {
    const b = await (await fetch(url)).blob();
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = () => res(null); r.readAsDataURL(b); });
  } catch { return null; }
}

export async function exportWoundPdf(repo: Repo, w: WoundDetail, settings: Settings, includePhotos = true) {
  const { d, table, text, footer, getY, setY } = await doc(`Informe de lesión ${w.wound.code}`, settings, `${fullName(w.patient)} · HC ${w.patient.mrn}`);
  const wo = w.wound;
  table(['Campo', 'Dato'], [
    ['Etiología', ETIOLOGY_LABEL[wo.etiology] + (wo.etiology_other ? ` (${wo.etiology_other})` : '')],
    ['Localización', `${wo.body_region} · ${LATERALITY_LABEL[wo.laterality]}`],
    ['Detección', dt(wo.detected_at)],
    ['Origen', `${POA_LABEL[wo.present_on_admission]}${wo.poa_source ? ` — ${wo.poa_source}` : ''}`],
    ['Categoría inicial (LPP)', wo.initial_pu_category ? PU_CATEGORIES[wo.initial_pu_category].label : 'No aplica / sin confirmar'],
    ['Categoría vigente (LPP)', wo.current_pu_category ? PU_CATEGORIES[wo.current_pu_category].label : 'No aplica / sin confirmar'],
    ['Estado', wo.status + (wo.closed_at ? ` (${dt(wo.closed_at)})` : '')],
  ], 'Identificación de la lesión');
  table(['Fecha', 'Profesional', 'Categoría', 'Medidas (cm)', 'Sup. cm²', 'Método', 'Exudado', 'Dolor', 'Evolución'],
    w.assessments.map((a) => [dt(a.assessed_at), a.assessed_by_name ?? '—', a.pu_category ? PU_CATEGORIES[a.pu_category].short : '—',
      a.length_cm != null ? `${a.length_cm}×${a.width_cm}${a.depth_cm != null ? `×${a.depth_cm}` : ''}` : '—', areaCm2(a) ?? '—',
      MEASUREMENT_LABEL[a.measurement_method].split(' (')[0], a.exudate_amount ? EXUDATE_LABEL[a.exudate_amount] : '—', a.pain_score ?? '—', EVOLUTION_LABEL[a.evolution]]),
    'Valoración inicial y seguimiento');
  const detail = w.assessments.filter((a) => a.observations || a.clinical_signs.length);
  if (detail.length) table(['Fecha', 'Signos documentados', 'Observaciones'], detail.map((a) => [dt(a.assessed_at), a.clinical_signs.join(', ') || '—', a.observations ?? '—']), 'Observaciones clínicas');
  if (w.interventions.length) table(['Fecha', 'Intervención', 'Cumplimiento', 'Profesional'], w.interventions.map((i) => [dt(i.performed_at), INTERVENTION_LABEL[i.intervention], i.compliance, i.performed_by_name ?? '—']), 'Intervenciones');
  if (w.addenda.length) table(['Fecha', 'Autor', 'Motivo', 'Contenido'], w.addenda.map((x) => [dt(x.created_at), x.author_name ?? '—', x.reason, x.content]), 'Adendas');
  if (includePhotos) {
    const photos = displayPhotos(w.photos).filter((p) => p.identifiers_excluded).slice(-6);
    if (photos.length) {
      d.addPage(); setY(16); text('Fotografías autorizadas (sin identificadores declarados)', 11);
      let x = 12, y = getY();
      for (const p of photos) {
        const url = await repo.getPhotoUrl(p).catch(() => null);
        const data = url ? await blobToDataUrl(url) : null;
        if (data) {
          try { d.addImage(data, 'JPEG', x, y, 88, 66, undefined, 'MEDIUM'); } catch { /* formato no soportado */ }
          d.setFontSize(8); d.text(dt(p.taken_at), x, y + 70);
        }
        if (x > 50) { x = 12; y += 78; } else x = 110;
        if (y > 230) { d.addPage(); y = 16; }
      }
      setY(y + 80);
    }
  }
  text('Validación electrónica: cada valoración está asociada al usuario autenticado que la registró (trazabilidad por auditoría). La firma electrónica/digital con validez legal requiere implementación institucional autorizada.', 8);
  footer();
  d.save(`informe-${wo.code}.pdf`);
}

export async function exportPatientPdf(_repo: Repo, p: PatientDetail, wounds: WoundSummary[], braden: BradenAssessment[], interventions: NursingIntervention[], settings: Settings) {
  const { d, table, footer } = await doc('Informe clínico de heridas por paciente', settings, `${fullName(p.patient)} · HC ${p.patient.mrn}`);
  table(['Campo', 'Dato'], [
    ['Edad', ageYears(p.patient.birth_date) != null ? `${ageYears(p.patient.birth_date)} años` : '—'],
    ['Ubicación actual', p.location ? `${p.location.code} · ${p.location.sector?.name}` : 'Sin ubicación'],
    ['Ingreso', dt(p.admission?.admitted_at)],
    ['Diagnóstico de ingreso', p.admission?.admission_diagnosis ?? '—'],
  ], 'Paciente');
  table(['Código', 'Etiología', 'Localización', 'Origen', 'Cat. inicial', 'Cat. vigente', 'Última valoración', 'Estado'],
    wounds.map((w) => [w.code, ETIOLOGY_LABEL[w.etiology], w.body_region, POA_LABEL[w.present_on_admission],
      w.initial_pu_category ? PU_CATEGORIES[w.initial_pu_category].short : '—', w.current_pu_category ? PU_CATEGORIES[w.current_pu_category].short : '—',
      dt(w.last?.assessed_at), w.status]), 'Lesiones');
  table(['Fecha', 'Total', 'Riesgo', 'Profesional'], braden.map((b) => [dt(b.assessed_at), b.total, BRADEN_RISK_LABEL[bradenRisk(b.total)], b.assessed_by_name ?? '—']), 'Escala de Braden');
  table(['Fecha', 'Intervención', 'Cumplimiento', 'Profesional'], interventions.map((i) => [dt(i.performed_at), INTERVENTION_LABEL[i.intervention], i.compliance, i.performed_by_name ?? '—']), 'Intervenciones de enfermería');
  footer();
  d.save(`informe-paciente-${p.patient.mrn}.pdf`);
}

export async function exportIndicatorsPdf(r: IndicatorResult, f: IndicatorFilter, scope: string, settings: Settings) {
  const { d, table, text, footer } = await doc('Indicadores de calidad — Lesiones por presión', settings, `${scope} · Período ${f.from.toLocaleDateString('es-AR')} a ${f.to.toLocaleDateString('es-AR')}`);
  const pct = (x: { num: number; den: number; pct: number | null }) => `${x.num}/${x.den} (${x.pct ?? '—'} %)`;
  table(['Indicador', 'Resultado', 'Definición'], [
    ['Pacientes internados (actual)', r.census, 'Pacientes con asignación activa en el alcance'],
    ['Prevalencia puntual LPP', pct(r.prevalence), 'Pacientes con ≥1 LPP activa / internados a la fecha de corte'],
    ['Prevalencia LPP adquirida', pct(r.prevalenceAcquired), 'Ídem, solo LPP no presentes al ingreso'],
    ['Incidencia acumulada LPP adquirida', pct(r.cumulativeIncidence), 'Episodios con LPP nueva en el período / episodios en riesgo (sin LPP al ingreso)'],
    ['Densidad de incidencia', `${r.incidenceDensity.cases} casos / ${r.incidenceDensity.patientDays} pac-día = ${r.incidenceDensity.per1000 ?? '—'} ‰`, 'LPP adquiridas por 1000 pacientes-día'],
    ['Cobertura Braden en el episodio', pct(r.bradenCoverage), 'Internados con ≥1 Braden en el episodio'],
    ['Braden vigente', pct(r.bradenCurrent), `Braden dentro de ${settings.braden_validity_hours} h`],
    ['Seguimientos vencidos', r.overdueFollowUps, 'Lesiones activas con reevaluación vencida'],
    ['Cumplimiento de seguimiento', pct(r.followUpCompliance), 'Reevaluaciones realizadas a tiempo / programadas en el período'],
  ], 'Resumen');
  table(['Categoría', 'n'], Object.entries(r.byStage).map(([k, v]) => [k in PU_CATEGORIES ? PU_CATEGORIES[k as keyof typeof PU_CATEGORIES].short : 'Sin clasificar', v]), 'LPP activas por categoría');
  table(['Localización', 'n'], Object.entries(r.byRegion), 'LPP activas por localización');
  table(['Sector', 'Lesiones activas', 'LPP'], r.bySector.map((s) => [s.name, s.active, s.lpp]), 'Lesiones por sector');
  text('Advertencias metodológicas:', 10);
  r.warnings.forEach((w) => text(`• ${w}`, 8));
  footer();
  d.save(`indicadores-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export async function exportTablePdf(title: string, subtitle: string, head: string[], rows: (string | number)[][], settings: Settings, note?: string) {
  const { d, table, text, footer } = await doc(title, settings, subtitle);
  table(head, rows);
  if (note) text(note, 8);
  footer();
  d.save(`${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
