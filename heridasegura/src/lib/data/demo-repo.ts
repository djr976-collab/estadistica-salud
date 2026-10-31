'use client';
// Repositorio de DEMOSTRACIÓN: datos ficticios guardados en el navegador.
// Emula las reglas de la base (RLS por sector, inmutabilidad, reglas clínicas).
// No usar con datos reales.

import { buildStructure, idFor } from '../hospital-structure';
import { puTransitionError, isPressureInjury } from '../clinical';
import type {
  Addendum, Admission, AuditLog, BedAssignment, BradenAssessment, LocationView, NursingIntervention, Patient,
  PatientDetail, PatientView, Profile, Settings, Wound, WoundAssessment, WoundPhoto,
} from '../types';
import { DEFAULT_SETTINGS, type NewAssessment, type Repo, type Structure, type WoundSummary } from './repo';

const KEY = 'heridasegura-demo-v1';
const SESSION_KEY = 'heridasegura-demo-session';

interface DemoProfile extends Profile { email: string; password: string }

interface DB extends Structure {
  version: 1;
  profiles: DemoProfile[];
  patients: (Patient & { created_by: string | null })[];
  admissions: Admission[];
  assignments: BedAssignment[];
  wounds: Wound[];
  assessments: WoundAssessment[];
  addenda: Addendum[];
  photos: WoundPhoto[];
  braden: BradenAssessment[];
  interventions: NursingIntervention[];
  audit: AuditLog[];
  settings: Settings;
  seq: number;
}

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`);
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number, h = 0) => iso(new Date(Date.now() - n * 86_400_000 + h * 3_600_000));

export const DEMO_USERS = [
  { email: 'admin@demo.local', label: 'Administración (demo)', role: 'admin' },
  { email: 'supervision@demo.local', label: 'Supervisión CQ (demo)', role: 'supervisor' },
  { email: 'enfermeria.cq4@demo.local', label: 'Enfermería CQ Sector 4 (demo)', role: 'enfermero' },
  { email: 'enfermeria.cm@demo.local', label: 'Enfermería Clínica Médica (demo)', role: 'enfermero' },
] as const;
export const DEMO_PASSWORD = 'demo1234';

function seed(): DB {
  const st = buildStructure();
  const S = (k: string) => idFor(k);
  const profiles: DemoProfile[] = [
    { id: 'u-admin', email: 'admin@demo.local', password: DEMO_PASSWORD, full_name: 'Admin Demo', license_no: null, role: 'admin', active: true, sector_ids: [] },
    { id: 'u-sup', email: 'supervision@demo.local', password: DEMO_PASSWORD, full_name: 'Lic. Supervisión Demo', license_no: 'MP-DEMO-01', role: 'supervisor', active: true, sector_ids: [S('sec_cq_3'), S('sec_cq_4')] },
    { id: 'u-cq4', email: 'enfermeria.cq4@demo.local', password: DEMO_PASSWORD, full_name: 'Lic. Enfermería CQ4 Demo', license_no: 'MP-DEMO-02', role: 'enfermero', active: true, sector_ids: [S('sec_cq_4')] },
    { id: 'u-cm', email: 'enfermeria.cm@demo.local', password: DEMO_PASSWORD, full_name: 'Enf. Clínica Médica Demo', license_no: 'MP-DEMO-03', role: 'enfermero', active: true, sector_ids: [S('sec_cm_1'), S('sec_cm_2'), S('sec_uti')] },
  ];
  const pts: [string, string, string, string, string, string, number, string][] = [
    ['p101', 'DEMO-0001', 'Rosa', 'Ficticia Gómez', '1948-03-12', 'sec_cq_4:cama:30B', 6, 'Postoperatorio de fractura de cadera (ficticio)'],
    ['p102', 'DEMO-0002', 'Ernesto', 'Ejemplo Duarte', '1956-07-30', 'sec_cq_4:cama:28A', 3, 'Apendicectomía (ficticio)'],
    ['p103', 'DEMO-0003', 'Marta', 'Prueba Insaurralde', '1939-11-02', 'sec_cm_1:cama:2B', 10, 'Neumonía (ficticio)'],
    ['p104', 'DEMO-0004', 'Julio', 'Simulado Benítez', '1972-01-19', 'sec_cq_3:cama:21A', 2, 'Colecistectomía (ficticio)'],
    ['p105', 'DEMO-0005', 'Teresa', 'Demo Acosta', '1965-05-25', 'sec_s6:cama:603A', 4, 'Diagnóstico de ingreso ficticio'],
    ['p106', 'DEMO-0006', 'Ramón', 'Ficticio Sosa', '1951-09-08', 'sec_uti:cama:4', 8, 'Sepsis (ficticio)'],
    ['p107', 'DEMO-0007', 'Elsa', 'Ejemplar Romero', '1944-12-14', 'sec_cm_2:cama:12C', 15, 'Insuficiencia cardíaca (ficticio)'],
  ];
  const patients: DB['patients'] = [];
  const admissions: Admission[] = [];
  const assignments: BedAssignment[] = [];
  for (const [id, mrn, fn, ln, bd, loc, d, dx] of pts) {
    patients.push({ id, mrn, first_name: fn, last_name: ln, birth_date: bd, sex: null, is_fictitious: true, created_at: daysAgo(d), created_by: null });
    admissions.push({ id: 'a' + id, patient_id: id, admitted_at: daysAgo(d), admission_diagnosis: dx, status: 'internado', discharged_at: null, discharge_notes: null });
    assignments.push({ id: 'b' + id, admission_id: 'a' + id, patient_id: id, location_id: S(loc), movement: 'ingreso', started_at: daysAgo(d), ended_at: null, notes: null });
  }
  patients.push({ id: 'p108', mrn: 'DEMO-0008', first_name: 'Carlos', last_name: 'Muestra Vallejos', birth_date: '1980-04-03', sex: null, is_fictitious: true, created_at: daysAgo(1), created_by: 'u-cq4' });
  const l30c = st.locations.find((l) => l.id === S('sec_cq_4:cama:30C'))!;
  l30c.operational_status = 'bloqueada'; l30c.status_reason = 'Demostración: aislamiento / limpieza terminal';

  // Historia de ejemplo: LPP sacra adquirida en Elsa (CM S2, 12C)
  const wounds: Wound[] = [
    { id: 'w1', code: 'L-000001', patient_id: 'p107', admission_id: 'ap107', etiology: 'lesion_por_presion', etiology_other: null,
      body_region: 'Sacro', body_view: 'posterior', body_x: 50, body_y: 47, laterality: 'linea_media', detected_at: daysAgo(12),
      present_on_admission: 'no', poa_source: 'Valoración de piel al ingreso sin lesiones (registro ficticio)', device_related: false,
      device_description: null, initial_pu_category: 'estadio_2', current_pu_category: 'estadio_2', status: 'activa', closed_at: null,
      closure_notes: null, created_by: 'u-cm', created_at: daysAgo(12) },
    { id: 'w2', code: 'L-000002', patient_id: 'p106', admission_id: 'ap106', etiology: 'lesion_por_presion', etiology_other: null,
      body_region: 'Talón', body_view: 'posterior', body_x: 42, body_y: 96, laterality: 'izquierda', detected_at: daysAgo(8),
      present_on_admission: 'si', poa_source: 'Constancia en registro de ingreso (ficticio)', device_related: false, device_description: null,
      initial_pu_category: 'tejido_profundo', current_pu_category: 'tejido_profundo', status: 'activa', closed_at: null, closure_notes: null,
      created_by: 'u-cm', created_at: daysAgo(8) },
  ];
  const A = (o: Partial<WoundAssessment>): WoundAssessment => ({
    id: uid(), wound_id: 'w1', patient_id: 'p107', assessed_at: daysAgo(12), assessed_by: 'u-cm', pu_category: 'estadio_2',
    blanching: 'no_aplica', classification_confirmed: true, measurement_method: 'regla_milimetrada', length_cm: 4, width_cm: 3,
    depth_cm: 0.1, area_cm2: 12, undermining_tunneling: null, tissue_granulation_pct: null, tissue_slough_pct: null,
    tissue_necrosis_pct: null, tissue_epithelial_pct: null, tissue_other: 'Lecho rosado, húmedo', edges: 'Definidos, adheridos',
    exudate_amount: 'escaso', exudate_type: 'Seroso', odor: 'Sin olor', periwound_skin: 'Íntegra', pain_score: 4, clinical_signs: [],
    evolution: 'primera_valoracion', observations: 'Registro ficticio de demostración.', next_assessment_due: daysAgo(9),
    supervisor_reviewed_by: null, supervisor_reviewed_at: null, created_at: daysAgo(12), ...o,
  });
  const assessments = [
    A({}),
    A({ assessed_at: daysAgo(9), created_at: daysAgo(9), length_cm: 3.5, width_cm: 2.5, area_cm2: 8.75, pain_score: 3, evolution: 'mejoria', next_assessment_due: daysAgo(6) }),
    A({ assessed_at: daysAgo(6), created_at: daysAgo(6), length_cm: 3, width_cm: 2, area_cm2: 6, pain_score: 2, evolution: 'mejoria', next_assessment_due: daysAgo(3) }),
    A({ assessed_at: daysAgo(2), created_at: daysAgo(2), length_cm: 2.2, width_cm: 1.5, area_cm2: 3.3, pain_score: 1, evolution: 'mejoria', next_assessment_due: daysAgo(-1) }),
    A({ wound_id: 'w2', patient_id: 'p106', assessed_at: daysAgo(8), created_at: daysAgo(8), pu_category: 'tejido_profundo', measurement_method: 'regla_milimetrada',
      length_cm: 3, width_cm: 2.5, depth_cm: null, area_cm2: 7.5, tissue_other: 'Área violácea, piel intacta', exudate_amount: 'ninguno', exudate_type: null,
      pain_score: 5, next_assessment_due: daysAgo(5) }),
  ];
  const braden: BradenAssessment[] = [
    { id: uid(), patient_id: 'p107', admission_id: 'ap107', assessed_at: daysAgo(14), assessed_by: 'u-cm', sensory: 3, moisture: 2, activity: 2, mobility: 2, nutrition: 2, friction: 2, total: 13, notes: null, created_at: daysAgo(14) },
    { id: uid(), patient_id: 'p107', admission_id: 'ap107', assessed_at: daysAgo(1), assessed_by: 'u-cm', sensory: 3, moisture: 3, activity: 2, mobility: 2, nutrition: 3, friction: 2, total: 15, notes: null, created_at: daysAgo(1) },
    { id: uid(), patient_id: 'p106', admission_id: 'ap106', assessed_at: daysAgo(0, -3), assessed_by: 'u-cm', sensory: 2, moisture: 2, activity: 1, mobility: 1, nutrition: 2, friction: 1, total: 9, notes: null, created_at: daysAgo(0, -3) },
    { id: uid(), patient_id: 'p102', admission_id: 'ap102', assessed_at: daysAgo(3), assessed_by: 'u-cq4', sensory: 4, moisture: 3, activity: 3, mobility: 3, nutrition: 3, friction: 3, total: 19, notes: null, created_at: daysAgo(3) },
  ];
  const interventions: NursingIntervention[] = [
    { id: uid(), patient_id: 'p107', admission_id: 'ap107', wound_id: null, assessment_id: null, intervention: 'cambio_posicion', description: 'Rotación programada cada 2 h (ficticio)', compliance: 'realizada', reason_not_done: null, performed_at: daysAgo(1), performed_by: 'u-cm', created_at: daysAgo(1) },
    { id: uid(), patient_id: 'p107', admission_id: 'ap107', wound_id: null, assessment_id: null, intervention: 'superficie_especial', description: 'Colchón de aire alternante', compliance: 'realizada', reason_not_done: null, performed_at: daysAgo(11), performed_by: 'u-cm', created_at: daysAgo(11) },
  ];
  return {
    version: 1, ...st, profiles, patients, admissions, assignments, wounds, assessments, addenda: [], photos: [], braden,
    interventions, audit: [], settings: { ...DEFAULT_SETTINGS }, seq: 2,
  };
}

// ---------------- Fotos en IndexedDB (solo modo demo) ----------------
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open('heridasegura-demo-photos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('photos');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbPut(key: string, blob: Blob) {
  const db = await idb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction('photos', 'readwrite');
    tx.objectStore('photos').put(blob, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
async function idbGet(key: string): Promise<Blob | undefined> {
  const db = await idb();
  return new Promise((res, rej) => {
    const r = db.transaction('photos').objectStore('photos').get(key);
    r.onsuccess = () => res(r.result as Blob | undefined); r.onerror = () => rej(r.error);
  });
}

class Forbidden extends Error { constructor(m = 'No tiene permisos para realizar esta acción.') { super(m); } }

export class DemoRepo implements Repo {
  readonly mode = 'demo' as const;
  private db: DB;

  constructor() {
    let db: DB | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) db = JSON.parse(raw) as DB;
    } catch { db = null; }
    this.db = db && db.version === 1 ? db : seed();
    this.persist();
  }

  static reset() {
    try { localStorage.removeItem(KEY); sessionStorage.removeItem(SESSION_KEY); indexedDB.deleteDatabase('heridasegura-demo-photos'); } catch { /* noop */ }
  }

  private persist() { try { localStorage.setItem(KEY, JSON.stringify(this.db)); } catch { /* cuota excedida */ } }

  private me(): DemoProfile {
    let id: string | null = null;
    try { id = sessionStorage.getItem(SESSION_KEY); } catch { /* noop */ }
    const p = this.db.profiles.find((x) => x.id === id && x.active);
    if (!p) throw new Error('La sesión expiró. Vuelva a iniciar sesión.');
    return p;
  }
  private audit(action: string, table: string | null, recordId: string | null, fields?: string[], context: Record<string, unknown> = {}) {
    let actor: string | null = null;
    try { actor = this.me().id; } catch { /* noop */ }
    this.db.audit.unshift({ id: this.db.audit.length + 1, occurred_at: iso(new Date()), actor_id: actor, action, table_name: table, record_id: recordId, changed_fields: fields ?? null, context });
    if (this.db.audit.length > 2000) this.db.audit.length = 2000;
  }
  private isAdmin() { return this.me().role === 'admin'; }
  private hasSector(sectorId: string) { const m = this.me(); return m.role === 'admin' || m.sector_ids.includes(sectorId); }
  private canAccessPatient(pid: string) {
    const m = this.me();
    if (m.role === 'admin') return true;
    const asg = this.db.assignments.filter((a) => a.patient_id === pid);
    if (asg.some((a) => m.sector_ids.includes(this.loc(a.location_id)?.sector_id ?? ''))) return true;
    const p = this.db.patients.find((x) => x.id === pid);
    return !!p && p.created_by === m.id && asg.length === 0;
  }
  private loc(id: string) { return this.db.locations.find((l) => l.id === id); }
  private locFull(id: string) {
    const l = this.loc(id);
    if (!l) return null;
    return { ...l, room: this.db.rooms.find((r) => r.id === l.room_id) ?? null, sector: this.db.sectors.find((s) => s.id === l.sector_id) };
  }
  private openAdmission(pid: string) { return this.db.admissions.find((a) => a.patient_id === pid && !a.discharged_at) ?? null; }
  private activeAssignment(admissionId: string) { return this.db.assignments.find((a) => a.admission_id === admissionId && !a.ended_at) ?? null; }

  // ---------------- Sesión ----------------
  async getSession() { try { return this.strip(this.me()); } catch { return null; } }
  private strip(p: DemoProfile): Profile { const { password: _pw, ...rest } = p; return rest; }
  async signIn(email: string, password: string) {
    const p = this.db.profiles.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p || p.password !== password) throw new Error('Credenciales inválidas.');
    if (!p.active) throw new Error('Usuario inactivo. Contacte a la administración.');
    sessionStorage.setItem(SESSION_KEY, p.id);
    this.audit('LOGIN', null, null); this.persist();
    return this.strip(p);
  }
  async signOut() { this.audit('LOGOUT', null, null); this.persist(); sessionStorage.removeItem(SESSION_KEY); }

  // ---------------- Estructura ----------------
  async getStructure(): Promise<Structure> {
    this.me();
    const { services, sectors, rooms, locations } = this.db;
    return structuredClone({ services, sectors, rooms, locations });
  }
  private locationView(l: (typeof this.db.locations)[number]): LocationView {
    const asg = this.db.assignments.find((a) => a.location_id === l.id && !a.ended_at) ?? null;
    const visible = asg ? this.canAccessPatient(asg.patient_id) : false;
    const patient = asg && visible ? this.db.patients.find((p) => p.id === asg.patient_id) ?? null : null;
    let alerts = 0, pending = 0;
    if (patient) {
      const ws = this.db.wounds.filter((w) => w.patient_id === patient.id && w.status === 'activa');
      for (const w of ws) {
        const as = this.db.assessments.filter((a) => a.wound_id === w.id).sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
        const last = as[as.length - 1];
        if (!last || (last.next_assessment_due && new Date(last.next_assessment_due) < new Date())) pending++;
        if (last?.evolution === 'empeoramiento') alerts++;
      }
      const adm = this.openAdmission(patient.id);
      const b = this.db.braden.filter((x) => x.patient_id === patient.id && x.admission_id === adm?.id);
      if (!b.length) pending++;
    }
    return {
      ...l,
      display_status: asg ? 'ocupada' : l.operational_status === 'disponible' ? 'libre' : l.operational_status,
      room: this.db.rooms.find((r) => r.id === l.room_id) ?? null,
      sector: this.db.sectors.find((s) => s.id === l.sector_id),
      patient: patient ? { ...patient } : null,
      admission: asg && visible ? this.db.admissions.find((a) => a.id === asg.admission_id) ?? null : null,
      assignment: asg && visible ? asg : null,
      alerts, pending,
    };
  }
  async getOccupancy(sectorId: string) {
    this.me();
    return this.db.locations.filter((l) => l.sector_id === sectorId).map((l) => this.locationView(l));
  }
  async getLocation(id: string) { this.me(); const l = this.loc(id); return l ? this.locationView(l) : null; }

  private upsert<T extends { id: string }>(arr: T[], item: Partial<T>, defaults: Omit<T, 'id'>, table: string) {
    if (!this.isAdmin()) throw new Forbidden();
    if (item.id) {
      const i = arr.findIndex((x) => x.id === item.id);
      if (i < 0) throw new Error('Registro inexistente');
      const changed = Object.keys(item).filter((k) => (arr[i] as Record<string, unknown>)[k] !== (item as Record<string, unknown>)[k]);
      arr[i] = { ...arr[i], ...item };
      this.audit('UPDATE', table, item.id, changed);
    } else {
      const n = { ...defaults, ...item, id: uid() } as T;
      arr.push(n);
      this.audit('INSERT', table, n.id);
    }
    this.persist();
  }
  async saveService(s: Parameters<Repo['saveService']>[0]) {
    if (this.db.services.some((x) => x.code === s.code && x.id !== s.id)) throw new Error('El registro ya existe (código duplicado).');
    this.upsert(this.db.services, s, { code: s.code, name: s.name, notes: null, sort_order: 99, active: true }, 'services');
  }
  async saveSector(s: Parameters<Repo['saveSector']>[0]) {
    if (this.db.sectors.some((x) => x.code === s.code && x.id !== s.id)) throw new Error('El registro ya existe (código duplicado).');
    this.upsert(this.db.sectors, s, { service_id: s.service_id, code: s.code, name: s.name, notes: null, sort_order: 99, active: true }, 'sectors');
  }
  async saveRoom(r: Parameters<Repo['saveRoom']>[0]) {
    if (this.db.rooms.some((x) => x.sector_id === r.sector_id && x.code === r.code && x.id !== r.id)) throw new Error('El registro ya existe (código duplicado).');
    this.upsert(this.db.rooms, r, { sector_id: r.sector_id, code: r.code, name: r.name, kind: 'habitacion', sort_order: 999, active: true }, 'rooms');
  }
  async saveLocation(l: Parameters<Repo['saveLocation']>[0]) {
    if (this.db.locations.some((x) => x.active && x.sector_id === l.sector_id && x.code === l.code && x.id !== l.id)) throw new Error('El registro ya existe (código duplicado).');
    if (l.id && l.active === false && this.db.assignments.some((a) => a.location_id === l.id && !a.ended_at))
      throw new Error('No puede desactivar una ubicación ocupada. Traslade primero al paciente.');
    this.upsert(this.db.locations, l, {
      sector_id: l.sector_id, room_id: null, code: l.code, label: null, location_type: l.location_type, is_provisional_code: false,
      operational_status: 'disponible', status_reason: null, sort_order: 999, active: true,
    }, 'locations');
  }
  async setLocationStatus(id: string, status: Parameters<Repo['setLocationStatus']>[1], reason: string | null) {
    const l = this.loc(id);
    if (!l) throw new Error('Ubicación inexistente');
    const m = this.me();
    if (!(m.role === 'admin' || (m.role === 'supervisor' && this.hasSector(l.sector_id)))) throw new Forbidden();
    if (status !== 'disponible' && this.db.assignments.some((a) => a.location_id === id && !a.ended_at))
      throw new Error('La ubicación está ocupada: traslade al paciente antes de bloquearla.');
    l.operational_status = status; l.status_reason = reason;
    this.audit('UPDATE', 'locations', id, ['operational_status', 'status_reason']); this.persist();
  }

  // ---------------- Pacientes ----------------
  private patientView(p: Patient): PatientView {
    const adm = this.openAdmission(p.id) ?? this.db.admissions.filter((a) => a.patient_id === p.id).sort((a, b) => b.admitted_at.localeCompare(a.admitted_at))[0] ?? null;
    const asg = adm && !adm.discharged_at ? this.activeAssignment(adm.id) : null;
    return {
      ...p, admission: adm, location: asg ? this.locFull(asg.location_id) : null,
      active_wounds: this.db.wounds.filter((w) => w.patient_id === p.id && w.status === 'activa').length,
    };
  }
  async searchPatients(q: string, opts: { sectorId?: string | null; includeDischarged?: boolean } = {}) {
    this.me();
    const needle = q.trim().toLowerCase();
    return this.db.patients
      .filter((p) => this.canAccessPatient(p.id))
      .map((p) => this.patientView(p))
      .filter((v) => {
        if (!opts.includeDischarged && !(v.admission && !v.admission.discharged_at) && v.admission) return false;
        if (opts.sectorId && v.location?.sector_id !== opts.sectorId) return false;
        if (!needle) return true;
        const hay = [v.first_name, v.last_name, v.mrn, v.location?.code, v.location?.room?.code, v.location?.sector?.name].join(' ').toLowerCase();
        return needle.split(/\s+/).every((t) => hay.includes(t));
      })
      .sort((a, b) => a.last_name.localeCompare(b.last_name));
  }
  async getPatient(id: string): Promise<PatientDetail | null> {
    const p = this.db.patients.find((x) => x.id === id);
    if (!p || !this.canAccessPatient(id)) return null;
    this.audit('ACCESS', 'patients', id); this.persist();
    const admissions = this.db.admissions.filter((a) => a.patient_id === id).sort((a, b) => b.admitted_at.localeCompare(a.admitted_at));
    const admission = admissions.find((a) => !a.discharged_at) ?? null;
    const asg = admission ? this.activeAssignment(admission.id) : null;
    return {
      patient: { ...p }, admission, admissions,
      assignments: this.db.assignments.filter((a) => a.patient_id === id).sort((a, b) => b.started_at.localeCompare(a.started_at))
        .map((a) => ({ ...a, location: this.locFull(a.location_id) ?? undefined })),
      location: asg ? this.locFull(asg.location_id) : null,
    };
  }
  async createPatient(input: Parameters<Repo['createPatient']>[0]) {
    const m = this.me();
    if (this.db.patients.some((p) => p.mrn.toLowerCase() === input.mrn.trim().toLowerCase())) throw new Error('Ya existe un paciente con ese número de historia clínica.');
    const p = { id: uid(), ...input, mrn: input.mrn.trim(), is_fictitious: true, created_at: iso(new Date()), created_by: m.id };
    this.db.patients.push(p); this.audit('INSERT', 'patients', p.id); this.persist();
    return { ...p };
  }
  private assertLocationFree(locationId: string) {
    const l = this.loc(locationId);
    if (!l || !l.active) throw new Error('Ubicación inexistente o inactiva');
    if (l.operational_status !== 'disponible') throw new Error(`La ubicación está ${l.operational_status === 'bloqueada' ? 'bloqueada' : 'fuera de servicio'} y no admite asignaciones`);
    if (this.db.assignments.some((a) => a.location_id === locationId && !a.ended_at)) throw new Error('La ubicación ya está ocupada por otro paciente');
    return l;
  }
  async admitPatient(patientId: string, locationId: string, admittedAt: string, diagnosis: string | null) {
    const m = this.me();
    const l = this.assertLocationFree(locationId);
    if (!this.hasSector(l.sector_id)) throw new Forbidden('No tiene permisos sobre el sector de la ubicación');
    if (!this.canAccessPatient(patientId)) throw new Forbidden('No tiene acceso a este paciente');
    if (this.openAdmission(patientId)) throw new Error('El paciente ya tiene un episodio de internación abierto. Use traslado o cambio de cama.');
    const adm: Admission = { id: uid(), patient_id: patientId, admitted_at: admittedAt, admission_diagnosis: diagnosis, status: 'internado', discharged_at: null, discharge_notes: null };
    this.db.admissions.push(adm);
    this.db.assignments.push({ id: uid(), admission_id: adm.id, patient_id: patientId, location_id: locationId, movement: 'ingreso', started_at: admittedAt, ended_at: null, notes: null });
    this.audit('INSERT', 'admissions', adm.id); this.audit('INSERT', 'bed_assignments', locationId, undefined, { by: m.id }); this.persist();
  }
  async movePatient(admissionId: string, locationId: string, movement: Parameters<Repo['movePatient']>[2], at: string, notes: string | null) {
    this.me();
    const adm = this.db.admissions.find((a) => a.id === admissionId && !a.discharged_at);
    if (!adm) throw new Error('Episodio inexistente o cerrado');
    if (!this.canAccessPatient(adm.patient_id)) throw new Forbidden('No tiene acceso a este paciente');
    const l = this.assertLocationFree(locationId);
    if (!this.hasSector(l.sector_id) && movement !== 'traslado') throw new Forbidden('No tiene permisos sobre el sector de destino');
    const cur = this.activeAssignment(admissionId);
    if (cur && at < cur.started_at) throw new Error('La fecha del movimiento es anterior a la asignación vigente');
    if (cur) cur.ended_at = at;
    this.db.assignments.push({ id: uid(), admission_id: admissionId, patient_id: adm.patient_id, location_id: locationId, movement, started_at: at, ended_at: null, notes });
    this.audit('INSERT', 'bed_assignments', admissionId, undefined, { movement }); this.persist();
  }
  async dischargePatient(admissionId: string, status: Parameters<Repo['dischargePatient']>[1], at: string, notes: string | null) {
    this.me();
    const adm = this.db.admissions.find((a) => a.id === admissionId && !a.discharged_at);
    if (!adm) throw new Error('Episodio inexistente o ya cerrado');
    if (!this.canAccessPatient(adm.patient_id)) throw new Forbidden();
    if (at < adm.admitted_at) throw new Error('La fecha de egreso es anterior al ingreso');
    const cur = this.activeAssignment(admissionId);
    if (cur) cur.ended_at = at;
    Object.assign(adm, { status, discharged_at: at, discharge_notes: notes });
    this.audit('UPDATE', 'admissions', admissionId, ['status', 'discharged_at']); this.persist();
  }

  // ---------------- Lesiones ----------------
  async listWounds(patientId: string): Promise<WoundSummary[]> {
    if (!this.canAccessPatient(patientId)) return [];
    return this.db.wounds.filter((w) => w.patient_id === patientId).map((w) => {
      const as = this.db.assessments.filter((a) => a.wound_id === w.id).sort((a, b) => a.assessed_at.localeCompare(b.assessed_at));
      return { ...w, last: as[as.length - 1] ?? null, assessments_count: as.length, photos_count: this.db.photos.filter((p) => p.wound_id === w.id).length };
    }).sort((a, b) => b.detected_at.localeCompare(a.detected_at));
  }
  async getWound(id: string) {
    const w = this.db.wounds.find((x) => x.id === id);
    if (!w || !this.canAccessPatient(w.patient_id)) return null;
    const names = await this.professionalNames();
    const assessments = this.db.assessments.filter((a) => a.wound_id === id).sort((a, b) => a.assessed_at.localeCompare(b.assessed_at))
      .map((a) => ({ ...a, assessed_by_name: names.get(a.assessed_by) }));
    const ids = new Set(assessments.map((a) => a.id));
    return {
      wound: { ...w }, patient: { ...this.db.patients.find((p) => p.id === w.patient_id)! }, assessments,
      photos: this.db.photos.filter((p) => p.wound_id === id).sort((a, b) => a.taken_at.localeCompare(b.taken_at)),
      addenda: this.db.addenda.filter((x) => ids.has(x.assessment_id)).map((x) => ({ ...x, author_name: names.get(x.author_id) })),
      interventions: this.db.interventions.filter((x) => x.wound_id === id).map((x) => ({ ...x, performed_by_name: names.get(x.performed_by) })),
    };
  }
  async createWound(input: Parameters<Repo['createWound']>[0]) {
    const m = this.me();
    if (!this.canAccessPatient(input.patient_id)) throw new Forbidden();
    if (input.etiology === 'otra' && !input.etiology_other) throw new Error('Especifique la etiología.');
    if (input.device_related && !input.device_description) throw new Error('Describa el dispositivo médico relacionado.');
    this.db.seq++;
    const w: Wound = {
      ...input, id: uid(), code: 'L-' + String(this.db.seq).padStart(6, '0'), admission_id: this.openAdmission(input.patient_id)?.id ?? null,
      initial_pu_category: null, current_pu_category: null, status: 'activa', closed_at: null, closure_notes: null,
      created_by: m.id, created_at: iso(new Date()),
    };
    this.db.wounds.push(w); this.audit('INSERT', 'wounds', w.id); this.persist();
    return { ...w };
  }
  async createAssessment(a: NewAssessment) {
    const m = this.me();
    const w = this.db.wounds.find((x) => x.id === a.wound_id);
    if (!w || !this.canAccessPatient(w.patient_id)) throw new Forbidden();
    if (w.status !== 'activa') throw new Error(`La lesión está cerrada (${w.status}).`);
    if (!isPressureInjury(w.etiology) && a.pu_category) throw new Error('Los estadios de lesión por presión no se aplican a heridas de otra etiología.');
    if (a.pu_category && !a.classification_confirmed) throw new Error('La categoría de LPP debe ser confirmada por el profesional.');
    if (a.pu_category === 'estadio_1' && a.blanching !== 'no_blanqueable') throw new Error('El estadio 1 requiere constatar eritema no blanqueable.');
    const err = puTransitionError(w.current_pu_category, a.pu_category);
    if (err) throw new Error(err);
    const rec: WoundAssessment = {
      ...a, id: uid(), patient_id: w.patient_id, assessed_by: m.id,
      area_cm2: a.length_cm != null && a.width_cm != null ? Math.round(a.length_cm * a.width_cm * 100) / 100 : null,
      supervisor_reviewed_by: null, supervisor_reviewed_at: null, created_at: iso(new Date()),
    };
    this.db.assessments.push(rec);
    w.initial_pu_category = w.initial_pu_category ?? a.pu_category;
    w.current_pu_category = a.pu_category ?? w.current_pu_category;
    if (a.evolution === 'resuelta' || a.evolution === 'derivada') { w.status = a.evolution; w.closed_at = a.assessed_at; }
    this.audit('INSERT', 'wound_assessments', rec.id); this.persist();
    return { ...rec };
  }
  async addAddendum(assessmentId: string, reason: string, content: string) {
    const m = this.me();
    const a = this.db.assessments.find((x) => x.id === assessmentId);
    if (!a || !this.canAccessPatient(a.patient_id)) throw new Forbidden();
    if (reason.trim().length < 4 || content.trim().length < 4) throw new Error('Indique motivo y contenido de la adenda.');
    const ad: Addendum = { id: uid(), assessment_id: assessmentId, author_id: m.id, reason, content, created_at: iso(new Date()) };
    this.db.addenda.push(ad); this.audit('INSERT', 'assessment_addenda', ad.id); this.persist();
    return { ...ad };
  }
  async reviewAssessment(assessmentId: string) {
    const m = this.me();
    if (m.role === 'enfermero') throw new Forbidden();
    const a = this.db.assessments.find((x) => x.id === assessmentId);
    if (!a || !this.canAccessPatient(a.patient_id)) throw new Forbidden();
    if (a.supervisor_reviewed_by) throw new Error('La valoración ya fue revisada.');
    a.supervisor_reviewed_by = m.id; a.supervisor_reviewed_at = iso(new Date());
    this.audit('UPDATE', 'wound_assessments', a.id, ['supervisor_reviewed_at', 'supervisor_reviewed_by']); this.persist();
  }
  async closeWoundByDischarge(woundId: string, notes: string) {
    const m = this.me();
    const w = this.db.wounds.find((x) => x.id === woundId);
    if (!w || !this.canAccessPatient(w.patient_id)) throw new Forbidden();
    if (w.status !== 'activa') throw new Error('La lesión ya está cerrada.');
    w.status = 'cerrada_por_egreso'; w.closed_at = iso(new Date()); w.closure_notes = notes;
    this.audit('UPDATE', 'wounds', w.id, ['status', 'closed_at', 'closure_notes'], { by: m.id }); this.persist();
  }

  // ---------------- Fotos ----------------
  async uploadPhoto(p: Parameters<Repo['uploadPhoto']>[0]) {
    const m = this.me();
    if (!this.canAccessPatient(p.wound.patient_id)) throw new Forbidden();
    const ext = p.file.type === 'image/png' ? 'png' : p.file.type === 'image/webp' ? 'webp' : 'jpg';
    const id = uid();
    const path = `${p.wound.patient_id}/${p.wound.id}/${id}.${ext}`;
    const buf = await p.file.arrayBuffer();
    const hash = await crypto.subtle.digest('SHA-256', buf);
    await idbPut(path, p.file);
    const photo: WoundPhoto = {
      id, wound_id: p.wound.id, patient_id: p.wound.patient_id, assessment_id: p.assessment_id, derived_from_id: p.derived_from_id,
      storage_path: path, mime_type: p.file.type || 'image/jpeg', size_bytes: p.file.size, width_px: p.width_px, height_px: p.height_px,
      sha256: [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join(''), taken_at: p.taken_at, uploaded_by: m.id,
      body_region: p.wound.body_region, quality: p.quality, has_scale_reference: p.has_scale_reference, px_per_cm: p.px_per_cm,
      identifiers_excluded: p.identifiers_excluded, legal_basis: this.db.settings.photo_legal_basis, created_at: iso(new Date()),
    };
    this.db.photos.push(photo); this.audit('INSERT', 'wound_photos', id); this.persist();
    return photo;
  }
  async getPhotoUrl(photo: WoundPhoto) {
    if (!this.canAccessPatient(photo.patient_id)) throw new Forbidden();
    const blob = await idbGet(photo.storage_path);
    if (!blob) throw new Error('Imagen no disponible en este dispositivo (modo demo).');
    return URL.createObjectURL(blob);
  }

  // ---------------- Braden / intervenciones ----------------
  async listBraden(patientId: string) {
    if (!this.canAccessPatient(patientId)) return [];
    const names = await this.professionalNames();
    return this.db.braden.filter((b) => b.patient_id === patientId).sort((a, b) => b.assessed_at.localeCompare(a.assessed_at))
      .map((b) => ({ ...b, assessed_by_name: names.get(b.assessed_by) }));
  }
  async createBraden(b: Parameters<Repo['createBraden']>[0]) {
    const m = this.me();
    if (!this.canAccessPatient(b.patient_id)) throw new Forbidden();
    const vals = [b.sensory, b.moisture, b.activity, b.mobility, b.nutrition];
    if (vals.some((v) => !(v >= 1 && v <= 4)) || !(b.friction >= 1 && b.friction <= 3)) throw new Error('Puntajes de Braden fuera de rango.');
    const rec: BradenAssessment = { ...b, id: uid(), admission_id: this.openAdmission(b.patient_id)?.id ?? null, assessed_by: m.id, total: vals.reduce((x, y) => x + y, 0) + b.friction, created_at: iso(new Date()) };
    this.db.braden.push(rec); this.audit('INSERT', 'braden_assessments', rec.id); this.persist();
    return rec;
  }
  async listInterventions(patientId: string) {
    if (!this.canAccessPatient(patientId)) return [];
    const names = await this.professionalNames();
    return this.db.interventions.filter((i) => i.patient_id === patientId).sort((a, b) => b.performed_at.localeCompare(a.performed_at))
      .map((i) => ({ ...i, performed_by_name: names.get(i.performed_by) }));
  }
  async createIntervention(i: Parameters<Repo['createIntervention']>[0]) {
    const m = this.me();
    if (!this.canAccessPatient(i.patient_id)) throw new Forbidden();
    if (i.compliance !== 'realizada' && !i.reason_not_done) throw new Error('Indique el motivo de la no realización o realización parcial.');
    if (i.intervention === 'otra' && !i.description) throw new Error('Describa la intervención.');
    const rec: NursingIntervention = { ...i, id: uid(), admission_id: this.openAdmission(i.patient_id)?.id ?? null, performed_by: m.id, created_at: iso(new Date()) };
    this.db.interventions.push(rec); this.audit('INSERT', 'nursing_interventions', rec.id); this.persist();
    return rec;
  }

  // ---------------- Indicadores ----------------
  async getIndicatorDataset() {
    this.me();
    const ok = (pid: string) => this.canAccessPatient(pid);
    const d = this.db;
    return structuredClone({
      services: d.services, sectors: d.sectors, locations: d.locations,
      patients: d.patients.filter((p) => ok(p.id)), admissions: d.admissions.filter((a) => ok(a.patient_id)),
      assignments: d.assignments.filter((a) => ok(a.patient_id)), wounds: d.wounds.filter((w) => ok(w.patient_id)),
      assessments: d.assessments.filter((a) => ok(a.patient_id)), braden: d.braden.filter((b) => ok(b.patient_id)),
      interventions: d.interventions.filter((i) => ok(i.patient_id)),
    });
  }

  // ---------------- Administración ----------------
  async listProfiles() {
    const m = this.me();
    if (m.role === 'enfermero') return [this.strip(m)];
    return this.db.profiles.map((p) => this.strip(p));
  }
  async saveProfile(p: Parameters<Repo['saveProfile']>[0]) {
    if (!this.isAdmin()) throw new Forbidden();
    const t = this.db.profiles.find((x) => x.id === p.id);
    if (!t) throw new Error('Usuario inexistente');
    if (t.id === this.me().id && (p.role !== 'admin' || !p.active)) throw new Error('No puede quitarse a sí mismo el rol de administrador.');
    Object.assign(t, p); this.audit('UPDATE', 'profiles', p.id, ['role', 'active', 'sector_ids']); this.persist();
  }
  async createUser(u: Parameters<Repo['createUser']>[0]) {
    if (!this.isAdmin()) throw new Forbidden();
    if (this.db.profiles.some((p) => p.email.toLowerCase() === u.email.toLowerCase())) throw new Error('Ya existe un usuario con ese correo.');
    if (u.password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
    const p: DemoProfile = { id: uid(), email: u.email, password: u.password, full_name: u.full_name, license_no: u.license_no, role: u.role, active: true, sector_ids: u.sector_ids };
    this.db.profiles.push(p); this.audit('INSERT', 'profiles', p.id); this.persist();
  }
  async listAudit(limit = 200) {
    if (!this.isAdmin()) throw new Forbidden();
    const names = await this.professionalNames();
    return this.db.audit.slice(0, limit).map((a) => ({ ...a, actor_name: a.actor_id ? names.get(a.actor_id) : undefined }));
  }
  async getSettings() { return { ...this.db.settings }; }
  async saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (!this.isAdmin()) throw new Forbidden();
    if (key === 'ai_assistance_enabled' && value === true) throw new Error('No hay un modelo de IA con validación aprobada: la asistencia no puede habilitarse.');
    this.db.settings[key] = value; this.audit('UPDATE', 'system_settings', key, ['value']); this.persist();
  }
  async listAiModels() { return []; }
  async professionalNames() { return new Map(this.db.profiles.map((p) => [p.id, p.full_name])); }
  async logAccess(action: string, table: string | null, recordId: string | null, context: Record<string, unknown> = {}) {
    this.audit(action, table, recordId, undefined, context); this.persist();
  }
}
