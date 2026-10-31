// Arquitectura modular para IA de heridas (Fase 3). EN ESTA VERSIÓN NO HAY MODELOS REGISTRADOS.
//
// Reglas de seguridad aplicadas por diseño:
//  1. Solo se puede invocar un proveedor cuyo modelo figure en `ai_models` con
//     validation_status = 'validado' (la base rechaza inferencias de otros modelos).
//  2. La salida es SIEMPRE una sugerencia sujeta a revisión: nunca escribe en
//     wound_assessments ni fija estadios. El profesional acepta/rechaza.
//  3. Si el modelo procesa fuera de la institución, se exige DPA registrado y
//     autorización institucional; las imágenes se envían sin identificadores.
//  4. Prohibido usar modelos generalistas de visión para presentar diagnósticos,
//     estadios o probabilidades como si estuvieran validados.

import type { AiModel } from '../types';

export interface AiInferenceInput { image: Blob; bodyRegion: string; etiology: string }

export interface AiInference {
  /** Características visuales inferidas (no diagnósticos). */
  visualFeatures: { label: string; detail?: string }[];
  /** Máscara de segmentación sugerida (PNG) si el modelo la provee. */
  segmentationMask?: Blob;
  /** Composición tisular aparente (%), con incertidumbre declarada por el modelo. */
  tissueEstimate?: { granulation?: number; slough?: number; necrosis?: number; epithelial?: number; uncertainty: string };
  /** Borrador descriptivo para revisión profesional. */
  draftDescription?: string;
  /** Categorías diferenciales sugeridas (solo modelos validados para esa tarea). */
  differentials?: { category: string; note: string }[];
  imageAdequate: boolean;
  limitations: string[];
}

export interface WoundVisionProvider {
  readonly model: AiModel;
  analyze(input: AiInferenceInput): Promise<AiInference>;
}

const registry: WoundVisionProvider[] = [];

/** Registra un proveedor (Fase 3). Rechaza modelos no validados. */
export function registerProvider(p: WoundVisionProvider) {
  if (p.model.validation_status !== 'validado') throw new Error('Solo pueden registrarse modelos con validación aprobada.');
  if (p.model.processes_externally && !p.model.dpa_reference) throw new Error('Modelo externo sin acuerdo de tratamiento de datos registrado.');
  registry.push(p);
}

export function getValidatedProvider(models: AiModel[], enabled: boolean): WoundVisionProvider | null {
  if (!enabled) return null;
  return registry.find((p) => models.some((m) => m.id === p.model.id && m.validation_status === 'validado')) ?? null;
}
