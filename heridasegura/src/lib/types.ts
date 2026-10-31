// Tipos de dominio — reflejan las tablas de supabase/migrations.

export type AppRole = 'admin' | 'supervisor' | 'enfermero';
export type RoomKind = 'habitacion' | 'area';
export type LocationType =
  | 'cama_internacion' | 'cama_uti' | 'box_uti' | 'cama_coronaria'
  | 'shockroom' | 'observacion' | 'camilla';
export type OperationalStatus = 'disponible' | 'bloqueada' | 'fuera_servicio';
export type DisplayStatus = 'libre' | 'ocupada' | 'bloqueada' | 'fuera_servicio';
export type AdmissionStatus = 'internado' | 'alta' | 'traslado_externo' | 'fallecimiento' | 'otro';
export type MovementType = 'ingreso' | 'traslado' | 'cambio_cama';
export type WoundEtiology =
  | 'lesion_por_presion' | 'quirurgica' | 'dermatitis_humedad' | 'vascular_venosa'
  | 'vascular_arterial' | 'vascular_mixta' | 'pie_diabetico' | 'traumatica'
  | 'desgarro_cutaneo' | 'quemadura' | 'otra';
export type PuCategory =
  | 'estadio_1' | 'estadio_2' | 'estadio_3' | 'estadio_4'
  | 'no_clasificable' | 'tejido_profundo' | 'membrana_mucosa';
export type YesNoUnknown = 'si' | 'no' | 'desconocido';
export type Laterality = 'derecha' | 'izquierda' | 'bilateral' | 'linea_media' | 'no_aplica';
export type BodyView = 'anterior' | 'posterior';
export type WoundStatus = 'activa' | 'resuelta' | 'derivada' | 'cerrada_por_egreso';
export type Evolution = 'primera_valoracion' | 'mejoria' | 'sin_cambios' | 'empeoramiento' | 'resuelta' | 'derivada';
export type Blanching = 'blanqueable' | 'no_blanqueable' | 'no_evaluado' | 'no_aplica';
export type MeasurementMethod = 'regla_milimetrada' | 'foto_calibrada' | 'no_medible';
export type ExudateAmount = 'ninguno' | 'escaso' | 'moderado' | 'abundante';
export type InterventionType =
  | 'cambio_posicion' | 'proteccion_prominencias' | 'superficie_especial' | 'cuidado_piel'
  | 'manejo_humedad' | 'valoracion_nutricional' | 'derivacion_nutricion'
  | 'educacion_paciente_familia' | 'curacion' | 'manejo_dispositivo' | 'otra';
export type Compliance = 'realizada' | 'parcial' | 'no_realizada';

export interface Profile {
  id: string;
  full_name: string;
  license_no: string | null;
  role: AppRole;
  active: boolean;
  email?: string;
  sector_ids: string[];
}

export interface Service { id: string; code: string; name: string; notes: string | null; sort_order: number; active: boolean; }
export interface Sector { id: string; service_id: string; code: string; name: string; notes: string | null; sort_order: number; active: boolean; }
export interface Room { id: string; sector_id: string; code: string; name: string; kind: RoomKind; sort_order: number; active: boolean; }
export interface Location {
  id: string; sector_id: string; room_id: string | null; code: string; label: string | null;
  location_type: LocationType; is_provisional_code: boolean; operational_status: OperationalStatus;
  status_reason: string | null; sort_order: number; active: boolean;
}

export interface Patient {
  id: string; mrn: string; first_name: string; last_name: string;
  birth_date: string | null; sex: string | null; is_fictitious: boolean; created_at: string;
}
export interface Admission {
  id: string; patient_id: string; admitted_at: string; admission_diagnosis: string | null;
  status: AdmissionStatus; discharged_at: string | null; discharge_notes: string | null;
}
export interface BedAssignment {
  id: string; admission_id: string; patient_id: string; location_id: string;
  movement: MovementType; started_at: string; ended_at: string | null; notes: string | null;
}

export interface Wound {
  id: string; code: string; patient_id: string; admission_id: string | null;
  etiology: WoundEtiology; etiology_other: string | null;
  body_region: string; body_view: BodyView | null; body_x: number | null; body_y: number | null;
  laterality: Laterality; detected_at: string; present_on_admission: YesNoUnknown; poa_source: string | null;
  device_related: boolean; device_description: string | null;
  initial_pu_category: PuCategory | null; current_pu_category: PuCategory | null;
  status: WoundStatus; closed_at: string | null; closure_notes: string | null;
  created_by: string | null; created_at: string;
}

export interface WoundAssessment {
  id: string; wound_id: string; patient_id: string; assessed_at: string; assessed_by: string;
  assessed_by_name?: string;
  pu_category: PuCategory | null; blanching: Blanching; classification_confirmed: boolean;
  measurement_method: MeasurementMethod;
  length_cm: number | null; width_cm: number | null; depth_cm: number | null; area_cm2: number | null;
  undermining_tunneling: string | null;
  tissue_granulation_pct: number | null; tissue_slough_pct: number | null;
  tissue_necrosis_pct: number | null; tissue_epithelial_pct: number | null; tissue_other: string | null;
  edges: string | null; exudate_amount: ExudateAmount | null; exudate_type: string | null;
  odor: string | null; periwound_skin: string | null; pain_score: number | null;
  clinical_signs: string[]; evolution: Evolution; observations: string | null;
  next_assessment_due: string | null;
  supervisor_reviewed_by: string | null; supervisor_reviewed_at: string | null;
  created_at: string;
}

export interface Addendum { id: string; assessment_id: string; author_id: string; author_name?: string; reason: string; content: string; created_at: string; }

export interface PhotoQuality {
  width: number; height: number; brightness: number; sharpness: number; contrast: number;
  warnings: string[]; acceptable: boolean;
}

export interface WoundPhoto {
  id: string; wound_id: string; patient_id: string; assessment_id: string | null; derived_from_id: string | null;
  storage_path: string; mime_type: string; size_bytes: number; width_px: number | null; height_px: number | null;
  sha256: string | null; taken_at: string; uploaded_by: string; body_region: string | null;
  quality: Partial<PhotoQuality>; has_scale_reference: boolean; px_per_cm: number | null;
  identifiers_excluded: boolean; legal_basis: string | null; created_at: string;
}

export interface BradenAssessment {
  id: string; patient_id: string; admission_id: string | null; assessed_at: string; assessed_by: string;
  assessed_by_name?: string;
  sensory: number; moisture: number; activity: number; mobility: number; nutrition: number; friction: number;
  total: number; notes: string | null; created_at: string;
}

export interface NursingIntervention {
  id: string; patient_id: string; admission_id: string | null; wound_id: string | null; assessment_id: string | null;
  intervention: InterventionType; description: string | null; compliance: Compliance;
  reason_not_done: string | null; performed_at: string; performed_by: string; performed_by_name?: string; created_at: string;
}

export interface AuditLog {
  id: number; occurred_at: string; actor_id: string | null; actor_name?: string; action: string;
  table_name: string | null; record_id: string | null; changed_fields: string[] | null; context: Record<string, unknown>;
}

export interface AiModel {
  id: string; name: string; version: string; provider: string; intended_use: string;
  validation_status: 'no_validado' | 'en_evaluacion' | 'validado' | 'retirado';
  validation_ref: string | null; processes_externally: boolean; dpa_reference: string | null;
}

// ---- Vistas compuestas ----
export interface LocationView extends Location {
  display_status: DisplayStatus;
  room?: Room | null;
  sector?: Sector;
  patient?: Patient | null;
  admission?: Admission | null;
  assignment?: BedAssignment | null;
  alerts?: number;
  pending?: number;
}

export interface PatientView extends Patient {
  admission: Admission | null;
  location: (Location & { room?: Room | null; sector?: Sector }) | null;
  active_wounds: number;
}

export interface PatientDetail {
  patient: Patient;
  admission: Admission | null;
  admissions: Admission[];
  assignments: (BedAssignment & { location?: Location & { room?: Room | null; sector?: Sector } })[];
  location: (Location & { room?: Room | null; sector?: Sector }) | null;
}

export interface WoundDetail {
  wound: Wound;
  patient: Patient;
  assessments: WoundAssessment[];
  photos: WoundPhoto[];
  addenda: Addendum[];
  interventions: NursingIntervention[];
}

/** Datos crudos (ya filtrados por permisos) para calcular indicadores en el cliente. */
export interface IndicatorDataset {
  services: Service[]; sectors: Sector[]; locations: Location[];
  patients: Patient[]; admissions: Admission[]; assignments: BedAssignment[];
  wounds: Wound[]; assessments: WoundAssessment[]; braden: BradenAssessment[];
  interventions: NursingIntervention[];
}

export interface Settings {
  hospital_name: string;
  hospital_city: string;
  allow_real_patient_data: boolean;
  ai_assistance_enabled: boolean;
  braden_validity_hours: number;
  default_reassessment_hours: number;
  signed_url_seconds: number;
  photo_legal_basis: string;
}
