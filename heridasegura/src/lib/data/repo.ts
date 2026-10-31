// Contrato de acceso a datos. Dos implementaciones:
//  * SupabaseRepo — producción/evaluación (Auth + Postgres + RLS + Storage privado).
//  * DemoRepo     — demostración local en el navegador con datos ficticios.

import type {
  Addendum, AdmissionStatus, AiModel, AppRole, AuditLog, BodyView, Blanching, BradenAssessment, Compliance,
  Evolution, ExudateAmount, IndicatorDataset, InterventionType, Laterality, Location, LocationView,
  MeasurementMethod, MovementType, NursingIntervention, OperationalStatus, Patient, PatientDetail,
  PatientView, PhotoQuality, Profile, PuCategory, Room, Sector, Service, Settings, Wound, WoundAssessment,
  WoundDetail, WoundEtiology, WoundPhoto, YesNoUnknown,
} from '../types';

export interface Structure { services: Service[]; sectors: Sector[]; rooms: Room[]; locations: Location[] }

export interface NewPatient {
  mrn: string; first_name: string; last_name: string; birth_date: string | null; sex: string | null;
}

export interface NewWound {
  patient_id: string; etiology: WoundEtiology; etiology_other: string | null;
  body_region: string; body_view: BodyView | null; body_x: number | null; body_y: number | null;
  laterality: Laterality; detected_at: string; present_on_admission: YesNoUnknown; poa_source: string | null;
  device_related: boolean; device_description: string | null;
}

export interface NewAssessment {
  wound_id: string; assessed_at: string;
  pu_category: PuCategory | null; blanching: Blanching; classification_confirmed: boolean;
  measurement_method: MeasurementMethod; length_cm: number | null; width_cm: number | null; depth_cm: number | null;
  undermining_tunneling: string | null;
  tissue_granulation_pct: number | null; tissue_slough_pct: number | null; tissue_necrosis_pct: number | null;
  tissue_epithelial_pct: number | null; tissue_other: string | null;
  edges: string | null; exudate_amount: ExudateAmount | null; exudate_type: string | null; odor: string | null;
  periwound_skin: string | null; pain_score: number | null; clinical_signs: string[];
  evolution: Evolution; observations: string | null; next_assessment_due: string | null;
}

export interface NewPhoto {
  wound: Wound; file: Blob; assessment_id: string | null; derived_from_id: string | null;
  taken_at: string; width_px: number | null; height_px: number | null; quality: PhotoQuality;
  has_scale_reference: boolean; px_per_cm: number | null; identifiers_excluded: boolean;
}

export interface NewBraden {
  patient_id: string; assessed_at: string; sensory: number; moisture: number; activity: number;
  mobility: number; nutrition: number; friction: number; notes: string | null;
}

export interface NewIntervention {
  patient_id: string; wound_id: string | null; assessment_id: string | null; intervention: InterventionType;
  description: string | null; compliance: Compliance; reason_not_done: string | null; performed_at: string;
}

export interface NewUser { email: string; password: string; full_name: string; license_no: string | null; role: AppRole; sector_ids: string[] }

export type WoundSummary = Wound & { last: WoundAssessment | null; assessments_count: number; photos_count: number };

export interface Repo {
  readonly mode: 'demo' | 'supabase';

  // Sesión
  getSession(): Promise<Profile | null>;
  signIn(email: string, password: string): Promise<Profile>;
  signOut(): Promise<void>;

  // Estructura y ocupación
  getStructure(): Promise<Structure>;
  getOccupancy(sectorId: string): Promise<LocationView[]>;
  getLocation(id: string): Promise<LocationView | null>;
  saveService(s: Partial<Service> & { code: string; name: string }): Promise<void>;
  saveSector(s: Partial<Sector> & { service_id: string; code: string; name: string }): Promise<void>;
  saveRoom(r: Partial<Room> & { sector_id: string; code: string; name: string }): Promise<void>;
  saveLocation(l: Partial<Location> & { sector_id: string; code: string; location_type: Location['location_type'] }): Promise<void>;
  setLocationStatus(id: string, status: OperationalStatus, reason: string | null): Promise<void>;

  // Pacientes y movimientos
  searchPatients(q: string, opts?: { sectorId?: string | null; includeDischarged?: boolean }): Promise<PatientView[]>;
  getPatient(id: string): Promise<PatientDetail | null>;
  createPatient(p: NewPatient): Promise<Patient>;
  admitPatient(patientId: string, locationId: string, admittedAt: string, diagnosis: string | null): Promise<void>;
  movePatient(admissionId: string, locationId: string, movement: MovementType, at: string, notes: string | null): Promise<void>;
  dischargePatient(admissionId: string, status: AdmissionStatus, at: string, notes: string | null): Promise<void>;

  // Lesiones
  listWounds(patientId: string): Promise<WoundSummary[]>;
  getWound(id: string): Promise<WoundDetail | null>;
  createWound(w: NewWound): Promise<Wound>;
  createAssessment(a: NewAssessment): Promise<WoundAssessment>;
  addAddendum(assessmentId: string, reason: string, content: string): Promise<Addendum>;
  reviewAssessment(assessmentId: string): Promise<void>;
  closeWoundByDischarge(woundId: string, notes: string): Promise<void>;

  // Fotografías (almacenamiento privado)
  uploadPhoto(p: NewPhoto): Promise<WoundPhoto>;
  getPhotoUrl(photo: WoundPhoto): Promise<string>;

  // Braden e intervenciones
  listBraden(patientId: string): Promise<BradenAssessment[]>;
  createBraden(b: NewBraden): Promise<BradenAssessment>;
  listInterventions(patientId: string): Promise<NursingIntervention[]>;
  createIntervention(i: NewIntervention): Promise<NursingIntervention>;

  // Indicadores
  getIndicatorDataset(): Promise<IndicatorDataset>;

  // Administración
  listProfiles(): Promise<Profile[]>;
  saveProfile(p: Pick<Profile, 'id' | 'full_name' | 'license_no' | 'role' | 'active' | 'sector_ids'>): Promise<void>;
  createUser(u: NewUser): Promise<void>;
  listAudit(limit?: number): Promise<AuditLog[]>;
  getSettings(): Promise<Settings>;
  saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void>;
  listAiModels(): Promise<AiModel[]>;
  professionalNames(): Promise<Map<string, string>>;
  logAccess(action: 'ACCESS' | 'EXPORT' | 'PHOTO_VIEW' | 'REPORT' | 'LOGIN' | 'LOGOUT', table: string | null, recordId: string | null, context?: Record<string, unknown>): Promise<void>;
}

export const DEFAULT_SETTINGS: Settings = {
  hospital_name: 'Hospital Escuela General José Francisco de San Martín',
  hospital_city: 'Corrientes, Argentina',
  allow_real_patient_data: false,
  ai_assistance_enabled: false,
  braden_validity_hours: 24,
  default_reassessment_hours: 72,
  signed_url_seconds: 60,
  photo_legal_basis: 'Registro clínico — Ley 26.529 (historia clínica) y Ley 25.326 (datos personales). Verificar con el área legal institucional.',
};

/** Mensajes de error comprensibles para el usuario (sin detalles técnicos ni datos de salud). */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Sin conexión con el servidor. Verifique la red; los datos no se guardaron.';
  if (/JWT|session|not authenticated/i.test(msg)) return 'La sesión expiró. Vuelva a iniciar sesión.';
  if (/row-level security|42501|permission denied/i.test(msg)) return 'No tiene permisos para realizar esta acción.';
  if (/duplicate key.*mrn/i.test(msg)) return 'Ya existe un paciente con ese número de historia clínica.';
  if (/bed_assignments_one_active_per_location/.test(msg)) return 'La ubicación ya está ocupada por otro paciente.';
  if (/duplicate key/i.test(msg)) return 'El registro ya existe (código duplicado).';
  return msg.length > 300 ? msg.slice(0, 300) + '…' : msg;
}
