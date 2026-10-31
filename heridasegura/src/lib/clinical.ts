// Reglas clínicas puras (sin dependencias de UI ni de datos). Probadas en clinical.test.ts.
// Las definiciones de categorías son una síntesis en español de la clasificación
// NPIAP/EPUAP/PPPIA. Deben contrastarse con la Guía Internacional vigente y el
// protocolo institucional antes del uso clínico.

import type {
  BradenAssessment, PuCategory, WoundAssessment, Wound, WoundEtiology, Evolution,
  InterventionType, LocationType, Laterality, ExudateAmount, MeasurementMethod, Blanching, YesNoUnknown,
} from './types';

export const ETIOLOGY_LABEL: Record<WoundEtiology, string> = {
  lesion_por_presion: 'Lesión por presión (LPP)',
  quirurgica: 'Herida quirúrgica',
  dermatitis_humedad: 'Lesión cutánea asociada a la humedad (DAI/LESCAH)',
  vascular_venosa: 'Úlcera vascular venosa',
  vascular_arterial: 'Úlcera vascular arterial',
  vascular_mixta: 'Úlcera vascular mixta',
  pie_diabetico: 'Úlcera de pie diabético',
  traumatica: 'Herida traumática',
  desgarro_cutaneo: 'Desgarro cutáneo (skin tear)',
  quemadura: 'Quemadura',
  otra: 'Otra etiología',
};

export const LOCATION_TYPE_LABEL: Record<LocationType, string> = {
  cama_internacion: 'Cama de internación',
  cama_uti: 'Cama UTI',
  box_uti: 'Box UTI',
  cama_coronaria: 'Cama coronaria',
  shockroom: 'Puesto de shockroom',
  observacion: 'Puesto de observación',
  camilla: 'Camilla',
};

export const LATERALITY_LABEL: Record<Laterality, string> = {
  derecha: 'Derecha', izquierda: 'Izquierda', bilateral: 'Bilateral', linea_media: 'Línea media', no_aplica: 'No aplica',
};
export const POA_LABEL: Record<YesNoUnknown, string> = {
  si: 'Presente al ingreso', no: 'Adquirida durante la internación', desconocido: 'Sin dato verificable',
};
export const EVOLUTION_LABEL: Record<Evolution, string> = {
  primera_valoracion: 'Primera valoración', mejoria: 'Mejoría', sin_cambios: 'Sin cambios',
  empeoramiento: 'Empeoramiento', resuelta: 'Resolución (confirmada)', derivada: 'Derivación',
};
export const EXUDATE_LABEL: Record<ExudateAmount, string> = {
  ninguno: 'Ninguno', escaso: 'Escaso', moderado: 'Moderado', abundante: 'Abundante',
};
export const MEASUREMENT_LABEL: Record<MeasurementMethod, string> = {
  regla_milimetrada: 'Regla milimetrada descartable (medición directa)',
  foto_calibrada: 'Fotografía con referencia de escala calibrada',
  no_medible: 'No medible / no medido',
};
export const BLANCHING_LABEL: Record<Blanching, string> = {
  blanqueable: 'Eritema blanqueable', no_blanqueable: 'Eritema NO blanqueable',
  no_evaluado: 'No evaluado presencialmente', no_aplica: 'No aplica',
};
export const INTERVENTION_LABEL: Record<InterventionType, string> = {
  cambio_posicion: 'Cambios de posición',
  proteccion_prominencias: 'Protección de prominencias óseas',
  superficie_especial: 'Superficie especial para el manejo de la presión',
  cuidado_piel: 'Cuidados de la piel',
  manejo_humedad: 'Manejo de la humedad / incontinencia',
  valoracion_nutricional: 'Valoración nutricional',
  derivacion_nutricion: 'Derivación a Nutrición',
  educacion_paciente_familia: 'Educación al paciente y familia',
  curacion: 'Curación / cuidado local de la herida',
  manejo_dispositivo: 'Manejo / reposicionamiento de dispositivo médico',
  otra: 'Otra intervención institucional',
};

export const CLINICAL_SIGNS = [
  'Eritema perilesional', 'Calor local', 'Edema', 'Aumento del dolor', 'Aumento del exudado',
  'Exudado purulento', 'Mal olor', 'Tejido friable', 'Dehiscencia', 'Crepitación',
  'Fiebre documentada', 'Sangrado',
] as const;

/** Signos que, documentados, motivan solicitar valoración por el equipo tratante. NO es diagnóstico. */
export const SIGNS_REQUIRING_REVIEW = new Set([
  'Exudado purulento', 'Calor local', 'Eritema perilesional', 'Crepitación', 'Dehiscencia', 'Fiebre documentada', 'Mal olor',
]);

export interface PuCategoryInfo { label: string; short: string; criteria: string[]; notes?: string; }

export const PU_CATEGORIES: Record<PuCategory, PuCategoryInfo> = {
  estadio_1: {
    label: 'Estadio 1 — Eritema no blanqueable en piel intacta', short: 'E1',
    criteria: [
      'Piel intacta con área localizada de eritema que NO blanquea a la presión.',
      'En pieles oscuras puede presentarse distinto; considerar cambios de temperatura, consistencia o sensibilidad.',
      'Los cambios de color no incluyen coloración púrpura o marrón (sugieren lesión de tejido profundo).',
    ],
    notes: 'Requiere evaluación presencial del blanqueamiento (presión digital o disco transparente). No es deducible de forma fiable de una fotografía aislada.',
  },
  estadio_2: {
    label: 'Estadio 2 — Pérdida parcial del espesor de la piel con exposición de dermis', short: 'E2',
    criteria: [
      'Lecho viable, rosado o rojo, húmedo; puede presentarse como flictena intacta o rota con contenido seroso.',
      'No se visualiza tejido adiposo ni tejidos profundos. No hay tejido de granulación, esfacelo ni escara.',
      'No usar para dermatitis asociada a la humedad, desgarros cutáneos, quemaduras ni abrasiones.',
    ],
  },
  estadio_3: {
    label: 'Estadio 3 — Pérdida total del espesor de la piel', short: 'E3',
    criteria: [
      'Tejido adiposo visible en la úlcera; con frecuencia hay granulación y epíbole (bordes enrollados).',
      'Puede haber esfacelo o escara que no ocultan la extensión de la pérdida tisular.',
      'Pueden existir socavamientos y tunelizaciones. No se expone fascia, músculo, tendón, ligamento, cartílago ni hueso.',
    ],
  },
  estadio_4: {
    label: 'Estadio 4 — Pérdida total del espesor de la piel y del tejido', short: 'E4',
    criteria: [
      'Exposición o palpación directa de fascia, músculo, tendón, ligamento, cartílago o hueso.',
      'Puede haber esfacelo, escara, epíbole, socavamiento y/o tunelización.',
    ],
  },
  no_clasificable: {
    label: 'LPP no clasificable — Pérdida de espesor total oculta', short: 'NC',
    criteria: [
      'Pérdida de espesor total de piel y tejido cuya extensión no puede confirmarse por estar cubierta de esfacelo o escara.',
      'Si se retira el esfacelo o la escara se revelará un estadio 3 o 4.',
      'La escara estable (seca, adherida, intacta, sin eritema ni fluctuación) en talón o miembro isquémico no debe ablandarse ni retirarse sin indicación.',
    ],
  },
  tejido_profundo: {
    label: 'Lesión por presión de tejido profundo (LPTP)', short: 'LPTP',
    criteria: [
      'Piel intacta o no, con área localizada persistente de color rojo oscuro, marrón o púrpura que no blanquea, o separación epidérmica que revela un lecho oscuro o flictena hemática.',
      'Dolor y cambios de temperatura suelen preceder a los cambios de color.',
      'Puede evolucionar rápidamente y revelar la extensión real o resolverse sin pérdida tisular.',
    ],
    notes: 'No usar para describir afecciones vasculares, traumáticas, neuropáticas o dermatológicas.',
  },
  membrana_mucosa: {
    label: 'Lesión por presión en membrana mucosa', short: 'Mucosa',
    criteria: [
      'Lesión en mucosas relacionada con un dispositivo médico en el sitio de la lesión.',
      'Por la anatomía del tejido NO se estadifica con el sistema de estadios.',
    ],
  },
};

export const DEVICE_RELATED_INFO =
  'LPP relacionada con dispositivos médicos: se origina por el uso de dispositivos con fines diagnósticos o terapéuticos y suele adoptar su forma. En piel se clasifica con el sistema de estadios; en mucosas, no se estadifica.';

export const INSUFFICIENT_EVIDENCE_MESSAGE =
  'No es posible determinar la clasificación con la información disponible. Se requiere valoración clínica.';

export function isPressureInjury(e: WoundEtiology) { return e === 'lesion_por_presion'; }

const RANK: Partial<Record<PuCategory, number>> = {
  estadio_1: 1, estadio_2: 2, tejido_profundo: 2, no_clasificable: 3, estadio_3: 3, estadio_4: 4,
};

/** Replica pu_transition_error() de la base de datos. Devuelve null si la transición es válida. */
export function puTransitionError(prev: PuCategory | null, next: PuCategory | null): string | null {
  if (!prev || !next || prev === next) return null;
  if (prev === 'membrana_mucosa' || next === 'membrana_mucosa')
    return 'Las lesiones de membrana mucosa no se estadifican; no pueden cambiar a una categoría por estadios.';
  if (prev === 'no_clasificable')
    return next === 'estadio_3' || next === 'estadio_4' ? null
      : 'Una LPP no clasificable solo puede reclasificarse como estadio 3 o 4 cuando se visualiza el lecho.';
  if (prev === 'tejido_profundo')
    return ['estadio_3', 'estadio_4', 'no_clasificable'].includes(next) ? null
      : 'Una lesión de tejido profundo solo puede evolucionar a estadio 3, 4 o no clasificable.';
  if (next === 'tejido_profundo' && prev === 'estadio_1') return null;
  if ((RANK[next] ?? 0) < (RANK[prev] ?? 0) || ((prev === 'estadio_3' || prev === 'estadio_4') && next === 'tejido_profundo'))
    return 'No se utiliza estadificación inversa: conserve la categoría de mayor gravedad y documente la evolución (p. ej., "estadio 4 en cicatrización"). Si hubo un error de clasificación, regístrelo mediante adenda.';
  return null;
}

export interface AssessmentDraft {
  etiology: WoundEtiology;
  current_category: PuCategory | null;
  pu_category: PuCategory | null;
  blanching: Blanching;
  classification_confirmed: boolean;
  measurement_method: MeasurementMethod;
  length_cm: number | null; width_cm: number | null; depth_cm: number | null;
  tissue: (number | null)[];
  pain_score: number | null;
  assessed_at: string;
  next_assessment_due: string | null;
  evolution: Evolution;
  closure_confirmed?: boolean;
}

/** Validación de una valoración antes de guardarla (espejo de las restricciones SQL). */
export function validateAssessment(d: AssessmentDraft): string[] {
  const errors: string[] = [];
  if (!isPressureInjury(d.etiology) && d.pu_category)
    errors.push('Los estadios de lesión por presión no se aplican a heridas de otra etiología.');
  if (d.pu_category && !d.classification_confirmed)
    errors.push('Debe confirmar que la categoría surge de su valoración clínica presencial.');
  if (d.pu_category === 'estadio_1' && d.blanching !== 'no_blanqueable')
    errors.push('El estadio 1 requiere constatar eritema NO blanqueable mediante exploración presencial.');
  const t = puTransitionError(d.current_category, d.pu_category);
  if (t) errors.push(t);
  if (d.measurement_method === 'no_medible') {
    if (d.length_cm != null || d.width_cm != null || d.depth_cm != null)
      errors.push('Si la lesión no fue medida, no registre dimensiones.');
  } else {
    if (d.length_cm == null || d.width_cm == null) errors.push('Registre largo y ancho, o seleccione "No medible".');
    for (const [k, v] of [['Largo', d.length_cm], ['Ancho', d.width_cm]] as const)
      if (v != null && !(v > 0 && v < 200)) errors.push(`${k}: valor fuera de rango.`);
    if (d.depth_cm != null && !(d.depth_cm >= 0 && d.depth_cm < 50)) errors.push('Profundidad: valor fuera de rango.');
  }
  const sum = d.tissue.reduce<number>((a, b) => a + (b ?? 0), 0);
  if (d.tissue.some((v) => v != null && (v < 0 || v > 100))) errors.push('Los porcentajes de tejido deben estar entre 0 y 100.');
  if (sum > 100) errors.push(`La suma de porcentajes de tejido (${sum}%) supera el 100%.`);
  if (d.pain_score != null && !(Number.isInteger(d.pain_score) && d.pain_score >= 0 && d.pain_score <= 10))
    errors.push('El dolor debe registrarse con escala numérica de 0 a 10.');
  if (d.next_assessment_due && new Date(d.next_assessment_due) <= new Date(d.assessed_at))
    errors.push('La próxima valoración debe ser posterior a la valoración actual.');
  if (new Date(d.assessed_at).getTime() > Date.now() + 5 * 60_000)
    errors.push('La fecha de valoración no puede ser futura.');
  if ((d.evolution === 'resuelta' || d.evolution === 'derivada') && !d.closure_confirmed)
    errors.push('La resolución o derivación requiere confirmación clínica explícita.');
  return errors;
}

export function areaCm2(a: Pick<WoundAssessment, 'length_cm' | 'width_cm' | 'measurement_method'>): number | null {
  if (a.measurement_method === 'no_medible' || a.length_cm == null || a.width_cm == null) return null;
  return Math.round(a.length_cm * a.width_cm * 100) / 100;
}

/**
 * Dos mediciones son comparables si ambas se obtuvieron con método válido y el mismo método.
 * (Una regla directa y una foto calibrada no se mezclan en la misma serie sin advertencia.)
 */
export function measurementsComparable(a: WoundAssessment, b: WoundAssessment): boolean {
  return a.measurement_method !== 'no_medible' && a.measurement_method === b.measurement_method
    && a.length_cm != null && b.length_cm != null && a.width_cm != null && b.width_cm != null;
}

// ---------------- Braden ----------------
export const BRADEN_DIMENSIONS = [
  { key: 'sensory', label: 'Percepción sensorial', max: 4, options: [
    'Completamente limitada', 'Muy limitada', 'Levemente limitada', 'Sin limitaciones'] },
  { key: 'moisture', label: 'Humedad', max: 4, options: [
    'Constantemente húmeda', 'A menudo húmeda', 'Ocasionalmente húmeda', 'Raramente húmeda'] },
  { key: 'activity', label: 'Actividad', max: 4, options: [
    'Encamado/a', 'En silla', 'Deambula ocasionalmente', 'Deambula frecuentemente'] },
  { key: 'mobility', label: 'Movilidad', max: 4, options: [
    'Completamente inmóvil', 'Muy limitada', 'Ligeramente limitada', 'Sin limitaciones'] },
  { key: 'nutrition', label: 'Nutrición', max: 4, options: [
    'Muy pobre', 'Probablemente inadecuada', 'Adecuada', 'Excelente'] },
  { key: 'friction', label: 'Fricción y cizallamiento', max: 3, options: [
    'Es un problema', 'Problema potencial', 'Sin problema aparente'] },
] as const;

export type BradenKey = (typeof BRADEN_DIMENSIONS)[number]['key'];
export type BradenScores = Record<BradenKey, number>;

export function bradenTotal(s: Partial<BradenScores>): number | null {
  let total = 0;
  for (const d of BRADEN_DIMENSIONS) {
    const v = s[d.key];
    if (v == null || !Number.isInteger(v) || v < 1 || v > d.max) return null;
    total += v;
  }
  return total;
}

export type BradenRisk = 'muy_alto' | 'alto' | 'moderado' | 'leve' | 'sin_riesgo';
/** Puntos de corte habituales (6–23). Verificar con el protocolo institucional. */
export function bradenRisk(total: number): BradenRisk {
  if (total <= 9) return 'muy_alto';
  if (total <= 12) return 'alto';
  if (total <= 14) return 'moderado';
  if (total <= 18) return 'leve';
  return 'sin_riesgo';
}
export const BRADEN_RISK_LABEL: Record<BradenRisk, string> = {
  muy_alto: 'Riesgo muy alto (≤ 9)', alto: 'Riesgo alto (10–12)', moderado: 'Riesgo moderado (13–14)',
  leve: 'Riesgo leve (15–18)', sin_riesgo: 'Sin riesgo según escala (19–23)',
};

// ---------------- Alertas de seguimiento (ayudas para la reevaluación) ----------------
export type AlertLevel = 'alta' | 'media';
export interface ClinicalAlert { level: AlertLevel; code: string; message: string; }

export function woundAlerts(wound: Wound, assessments: WoundAssessment[], now = new Date()): ClinicalAlert[] {
  const alerts: ClinicalAlert[] = [];
  if (wound.status !== 'activa') return alerts;
  const sorted = [...assessments].sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
  const last = sorted[sorted.length - 1];
  if (!last) {
    alerts.push({ level: 'alta', code: 'sin_valoracion', message: 'Lesión registrada sin valoración clínica.' });
    return alerts;
  }
  if (last.next_assessment_due && new Date(last.next_assessment_due) < now)
    alerts.push({ level: 'alta', code: 'seguimiento_vencido', message: 'Reevaluación programada vencida.' });
  if (!last.next_assessment_due)
    alerts.push({ level: 'media', code: 'sin_programacion', message: 'No hay próxima valoración programada.' });
  if (last.evolution === 'empeoramiento')
    alerts.push({ level: 'alta', code: 'empeoramiento', message: 'Empeoramiento documentado en la última valoración.' });
  const review = last.clinical_signs.filter((s) => SIGNS_REQUIRING_REVIEW.has(s));
  if (review.length)
    alerts.push({ level: 'alta', code: 'signos', message: `Signos documentados que requieren valoración por el equipo tratante: ${review.join(', ')}. (No constituye diagnóstico de infección.)` });
  const prev = sorted[sorted.length - 2];
  if (prev) {
    if (measurementsComparable(prev, last)) {
      const a0 = areaCm2(prev)!, a1 = areaCm2(last)!;
      if (a0 > 0 && (a1 - a0) / a0 >= 0.2)
        alerts.push({ level: 'alta', code: 'aumento_superficie', message: `Aumento de superficie ≥ 20 % entre mediciones comparables (${a0} → ${a1} cm²).` });
    }
    if ((last.tissue_necrosis_pct ?? 0) > (prev.tissue_necrosis_pct ?? 0) + 10)
      alerts.push({ level: 'media', code: 'necrosis', message: 'Aumento documentado del tejido necrótico.' });
    if (last.pain_score != null && prev.pain_score != null && last.pain_score - prev.pain_score >= 3)
      alerts.push({ level: 'media', code: 'dolor', message: `Aumento del dolor (${prev.pain_score} → ${last.pain_score}).` });
  }
  return alerts;
}

export function bradenAlerts(latest: BradenAssessment | undefined, validityHours: number, now = new Date()): ClinicalAlert[] {
  if (!latest) return [{ level: 'alta', code: 'braden_pendiente', message: 'Sin valoración de riesgo de Braden en el episodio.' }];
  const out: ClinicalAlert[] = [];
  const ageH = (now.getTime() - new Date(latest.assessed_at).getTime()) / 3_600_000;
  if (ageH > validityHours)
    out.push({ level: 'media', code: 'braden_vencida', message: `Braden con más de ${validityHours} h (según configuración institucional).` });
  if (latest.total <= 12)
    out.push({ level: 'alta', code: 'braden_alto', message: `Braden ${latest.total}: ${BRADEN_RISK_LABEL[bradenRisk(latest.total)]}. Verificar medidas preventivas.` });
  return out;
}

export function fullName(p: { first_name: string; last_name: string }) { return `${p.last_name}, ${p.first_name}`; }

export function ageYears(birth: string | null, at = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(birth + 'T00:00:00');
  let age = at.getFullYear() - b.getFullYear();
  const m = at.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && at.getDate() < b.getDate())) age--;
  return age;
}
