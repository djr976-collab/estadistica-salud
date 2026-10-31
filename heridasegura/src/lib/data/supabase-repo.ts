'use client';
// Repositorio Supabase: toda la autorización la aplica la base (RLS + funciones SECURITY DEFINER).
// El cliente solo usa la clave pública (anon). La clave de servicio vive únicamente en /api.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AiModel, AuditLog, BradenAssessment, IndicatorDataset, Location, LocationView, NursingIntervention, Patient,
  PatientDetail, PatientView, Profile, Room, Sector, Settings, Wound, WoundAssessment, WoundPhoto, Admission, BedAssignment, Addendum, Service,
} from '../types';
import { DEFAULT_SETTINGS, type Repo, type Structure, type WoundSummary } from './repo';

const BUCKET = 'wound-photos';

function must<T>(r: { data: T | null; error: { message: string; code?: string } | null }): T {
  if (r.error) throw Object.assign(new Error(r.error.message), { code: r.error.code });
  return r.data as T;
}

export class SupabaseRepo implements Repo {
  readonly mode = 'supabase' as const;
  readonly sb: SupabaseClient;
  private structureCache: Structure | null = null;
  private namesCache: Map<string, string> | null = null;

  constructor(url: string, anonKey: string) {
    this.sb = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'heridasegura-auth' },
    });
  }

  // ---------------- Sesión ----------------
  async getSession(): Promise<Profile | null> {
    const { data } = await this.sb.auth.getSession();
    const user = data.session?.user;
    if (!user) return null;
    const p = await this.sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (p.error || !p.data || !p.data.active) return null;
    const us = await this.sb.from('user_sectors').select('sector_id').eq('profile_id', user.id);
    return { ...(p.data as Profile), email: user.email, sector_ids: (us.data ?? []).map((x) => x.sector_id as string) };
  }
  async signIn(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message === 'Invalid login credentials' ? 'Credenciales inválidas.' : error.message);
    const prof = await this.getSession();
    if (!prof) {
      await this.sb.auth.signOut();
      throw new Error('Usuario pendiente de habilitación o inactivo. Contacte a la administración.');
    }
    await this.logAccess('LOGIN', null, null).catch(() => undefined);
    return prof;
  }
  async signOut() {
    await this.logAccess('LOGOUT', null, null).catch(() => undefined);
    this.structureCache = null; this.namesCache = null;
    await this.sb.auth.signOut();
  }

  // ---------------- Estructura ----------------
  async getStructure(): Promise<Structure> {
    if (this.structureCache) return this.structureCache;
    const [services, sectors, rooms, locations] = await Promise.all([
      this.sb.from('services').select('*').order('sort_order'),
      this.sb.from('sectors').select('*').order('sort_order'),
      this.sb.from('rooms').select('*').order('sort_order'),
      this.sb.from('locations').select('*').order('sort_order'),
    ]);
    this.structureCache = {
      services: must(services) as Service[], sectors: must(sectors) as Sector[],
      rooms: must(rooms) as Room[], locations: must(locations) as Location[],
    };
    return this.structureCache;
  }
  private invalidate() { this.structureCache = null; }

  async getOccupancy(sectorId: string): Promise<LocationView[]> {
    const st = await this.getStructure();
    const locs = st.locations.filter((l) => l.sector_id === sectorId);
    const [statusMap, assigns] = await Promise.all([
      this.sb.rpc('location_status_map', { p_sector: sectorId }),
      this.sb.from('bed_assignments').select('*, patients(*), admissions(*)').is('ended_at', null)
        .in('location_id', locs.map((l) => l.id)),
    ]);
    const occ = new Map((must(statusMap) as { location_id: string; occupied: boolean }[]).map((r) => [r.location_id, r.occupied]));
    type Row = BedAssignment & { patients: Patient; admissions: Admission };
    const byLoc = new Map((must(assigns) as Row[]).map((a) => [a.location_id, a]));
    const patientIds = [...byLoc.values()].map((a) => a.patient_id);
    const pend = await this.pendingByPatient(patientIds);
    return locs.map((l) => {
      const a = byLoc.get(l.id);
      return {
        ...l,
        display_status: occ.get(l.id) ? 'ocupada' : l.operational_status === 'disponible' ? 'libre' : l.operational_status,
        room: st.rooms.find((r) => r.id === l.room_id) ?? null,
        sector: st.sectors.find((s) => s.id === l.sector_id),
        patient: a?.patients ?? null, admission: a?.admissions ?? null, assignment: a ?? null,
        alerts: a ? pend.get(a.patient_id)?.alerts ?? 0 : 0, pending: a ? pend.get(a.patient_id)?.pending ?? 0 : 0,
      } satisfies LocationView;
    });
  }
  private async pendingByPatient(ids: string[]) {
    const out = new Map<string, { alerts: number; pending: number }>();
    if (!ids.length) return out;
    const [w, a, b] = await Promise.all([
      this.sb.from('wounds').select('id, patient_id, status').in('patient_id', ids).eq('status', 'activa'),
      this.sb.from('wound_assessments').select('wound_id, assessed_at, next_assessment_due, evolution').in('patient_id', ids).order('assessed_at'),
      this.sb.from('braden_assessments').select('patient_id, admission_id').in('patient_id', ids),
    ]);
    const last = new Map<string, { next_assessment_due: string | null; evolution: string }>();
    for (const r of (a.data ?? [])) last.set(r.wound_id, r);
    for (const id of ids) out.set(id, { alerts: 0, pending: (b.data ?? []).some((x) => x.patient_id === id) ? 0 : 1 });
    for (const wound of (w.data ?? [])) {
      const o = out.get(wound.patient_id)!;
      const l = last.get(wound.id);
      if (!l || (l.next_assessment_due && new Date(l.next_assessment_due) < new Date())) o.pending++;
      if (l?.evolution === 'empeoramiento') o.alerts++;
    }
    return out;
  }
  async getLocation(id: string) {
    const st = await this.getStructure();
    const l = st.locations.find((x) => x.id === id);
    if (!l) return null;
    return (await this.getOccupancy(l.sector_id)).find((x) => x.id === id) ?? null;
  }
  async saveService(s: Parameters<Repo['saveService']>[0]) { await this.upsert('services', s); }
  async saveSector(s: Parameters<Repo['saveSector']>[0]) { await this.upsert('sectors', s); }
  async saveRoom(r: Parameters<Repo['saveRoom']>[0]) { await this.upsert('rooms', r); }
  async saveLocation(l: Parameters<Repo['saveLocation']>[0]) {
    if (l.id && l.active === false) {
      const occ = await this.sb.from('bed_assignments').select('id', { count: 'exact', head: true }).eq('location_id', l.id).is('ended_at', null);
      if ((occ.count ?? 0) > 0) throw new Error('No puede desactivar una ubicación ocupada. Traslade primero al paciente.');
    }
    await this.upsert('locations', l);
  }
  private async upsert(table: string, row: Record<string, unknown> & { id?: string }) {
    const { id, ...rest } = row;
    // seed_key es inmutable: nunca se envía desde el cliente.
    delete (rest as Record<string, unknown>).seed_key;
    for (const k of ['room', 'sector', 'patient', 'admission', 'assignment', 'display_status', 'alerts', 'pending', 'created_at', 'updated_at'])
      delete (rest as Record<string, unknown>)[k];
    if (id) must(await this.sb.from(table).update(rest).eq('id', id).select('id'));
    else must(await this.sb.from(table).insert(rest).select('id'));
    this.invalidate();
  }
  async setLocationStatus(id: string, status: Location['operational_status'], reason: string | null) {
    if (status !== 'disponible') {
      const occ = await this.sb.rpc('location_status_map').then((r) => (r.data ?? []) as { location_id: string; occupied: boolean }[]);
      if (occ.find((x) => x.location_id === id)?.occupied) throw new Error('La ubicación está ocupada: traslade al paciente antes de bloquearla.');
    }
    const r = must(await this.sb.from('locations').update({ operational_status: status, status_reason: reason }).eq('id', id).select('id'));
    if (!(r as unknown[]).length) throw new Error('No tiene permisos para realizar esta acción.');
    this.invalidate();
  }

  // ---------------- Pacientes ----------------
  async searchPatients(q: string, opts: { sectorId?: string | null; includeDischarged?: boolean } = {}): Promise<PatientView[]> {
    const st = await this.getStructure();
    const term = q.trim().replace(/[%,()]/g, ' ').trim();
    let query = this.sb.from('patients').select('*, admissions(*), bed_assignments(*), wounds(id, status)').order('last_name').limit(200);
    if (term && !/^\d+[A-D]?$/i.test(term)) {
      const like = `%${term}%`;
      query = query.or(`last_name.ilike.${like},first_name.ilike.${like},mrn.ilike.${like}`);
    }
    type Row = Patient & { admissions: Admission[]; bed_assignments: BedAssignment[]; wounds: { id: string; status: string }[] };
    const rows = must(await query) as Row[];
    const views = rows.map((p) => {
      const adm = p.admissions.find((a) => !a.discharged_at) ?? p.admissions.sort((a, b) => b.admitted_at.localeCompare(a.admitted_at))[0] ?? null;
      const asg = adm && !adm.discharged_at ? p.bed_assignments.find((b) => b.admission_id === adm.id && !b.ended_at) : null;
      const l = asg ? st.locations.find((x) => x.id === asg.location_id) : null;
      const { admissions: _a, bed_assignments: _b, wounds, ...patient } = p;
      return {
        ...patient, admission: adm,
        location: l ? { ...l, room: st.rooms.find((r) => r.id === l.room_id) ?? null, sector: st.sectors.find((s) => s.id === l.sector_id) } : null,
        active_wounds: wounds.filter((w) => w.status === 'activa').length,
      } as PatientView;
    });
    return views.filter((v) => {
      if (!opts.includeDischarged && v.admission && v.admission.discharged_at) return false;
      if (opts.sectorId && v.location?.sector_id !== opts.sectorId) return false;
      if (term && /^\d+[A-D]?$/i.test(term)) return v.location?.code.toUpperCase().startsWith(term.toUpperCase()) || v.location?.room?.code === term || v.mrn.includes(term);
      return true;
    });
  }
  async getPatient(id: string): Promise<PatientDetail | null> {
    const st = await this.getStructure();
    const p = await this.sb.from('patients').select('*').eq('id', id).maybeSingle();
    if (p.error || !p.data) return null;
    const [adms, asg] = await Promise.all([
      this.sb.from('admissions').select('*').eq('patient_id', id).order('admitted_at', { ascending: false }),
      this.sb.from('bed_assignments').select('*').eq('patient_id', id).order('started_at', { ascending: false }),
    ]);
    const full = (lid: string) => {
      const l = st.locations.find((x) => x.id === lid);
      return l ? { ...l, room: st.rooms.find((r) => r.id === l.room_id) ?? null, sector: st.sectors.find((s) => s.id === l.sector_id) } : undefined;
    };
    const admissions = must(adms) as Admission[];
    const assignments = (must(asg) as BedAssignment[]).map((a) => ({ ...a, location: full(a.location_id) }));
    const admission = admissions.find((a) => !a.discharged_at) ?? null;
    const cur = admission ? assignments.find((a) => a.admission_id === admission.id && !a.ended_at) : null;
    void this.logAccess('ACCESS', 'patients', id).catch(() => undefined);
    return { patient: p.data as Patient, admission, admissions, assignments, location: cur?.location ?? null };
  }
  async createPatient(input: Parameters<Repo['createPatient']>[0]) {
    const { data: u } = await this.sb.auth.getUser();
    return must(await this.sb.from('patients').insert({ ...input, is_fictitious: true, created_by: u.user?.id }).select('*').single()) as Patient;
  }
  async admitPatient(patientId: string, locationId: string, admittedAt: string, diagnosis: string | null) {
    must(await this.sb.rpc('admit_patient', { p_patient: patientId, p_location: locationId, p_admitted_at: admittedAt, p_diagnosis: diagnosis }));
  }
  async movePatient(admissionId: string, locationId: string, movement: string, at: string, notes: string | null) {
    must(await this.sb.rpc('move_patient', { p_admission: admissionId, p_location: locationId, p_movement: movement, p_at: at, p_notes: notes }));
  }
  async dischargePatient(admissionId: string, status: string, at: string, notes: string | null) {
    must(await this.sb.rpc('discharge_patient', { p_admission: admissionId, p_status: status, p_at: at, p_notes: notes }));
  }

  // ---------------- Lesiones ----------------
  async listWounds(patientId: string): Promise<WoundSummary[]> {
    const [w, a, p] = await Promise.all([
      this.sb.from('wounds').select('*').eq('patient_id', patientId).order('detected_at', { ascending: false }),
      this.sb.from('wound_assessments').select('*').eq('patient_id', patientId).order('assessed_at'),
      this.sb.from('wound_photos').select('id, wound_id').eq('patient_id', patientId),
    ]);
    const as = must(a) as WoundAssessment[];
    const ph = must(p) as { wound_id: string }[];
    return (must(w) as Wound[]).map((x) => {
      const mine = as.filter((y) => y.wound_id === x.id);
      return { ...x, last: mine[mine.length - 1] ?? null, assessments_count: mine.length, photos_count: ph.filter((y) => y.wound_id === x.id).length };
    });
  }
  async getWound(id: string) {
    const w = await this.sb.from('wounds').select('*').eq('id', id).maybeSingle();
    if (w.error || !w.data) return null;
    const wound = w.data as Wound;
    const [pt, as, ph, iv, names] = await Promise.all([
      this.sb.from('patients').select('*').eq('id', wound.patient_id).single(),
      this.sb.from('wound_assessments').select('*').eq('wound_id', id).order('assessed_at'),
      this.sb.from('wound_photos').select('*').eq('wound_id', id).order('taken_at'),
      this.sb.from('nursing_interventions').select('*').eq('wound_id', id).order('performed_at', { ascending: false }),
      this.professionalNames(),
    ]);
    const assessments = (must(as) as WoundAssessment[]).map((a) => ({ ...a, assessed_by_name: names.get(a.assessed_by) }));
    const ad = assessments.length
      ? must(await this.sb.from('assessment_addenda').select('*').in('assessment_id', assessments.map((a) => a.id)).order('created_at')) as Addendum[]
      : [];
    return {
      wound, patient: must(pt) as Patient, assessments, photos: must(ph) as WoundPhoto[],
      addenda: ad.map((x) => ({ ...x, author_name: names.get(x.author_id) })),
      interventions: (must(iv) as NursingIntervention[]).map((x) => ({ ...x, performed_by_name: names.get(x.performed_by) })),
    };
  }
  async createWound(input: Parameters<Repo['createWound']>[0]) {
    const { data: u } = await this.sb.auth.getUser();
    return must(await this.sb.from('wounds').insert({ ...input, created_by: u.user?.id }).select('*').single()) as Wound;
  }
  async createAssessment(a: Parameters<Repo['createAssessment']>[0]) {
    const { data: u } = await this.sb.auth.getUser();
    const w = must(await this.sb.from('wounds').select('patient_id').eq('id', a.wound_id).single()) as { patient_id: string };
    return must(await this.sb.from('wound_assessments').insert({ ...a, patient_id: w.patient_id, assessed_by: u.user?.id }).select('*').single()) as WoundAssessment;
  }
  async addAddendum(assessmentId: string, reason: string, content: string) {
    const { data: u } = await this.sb.auth.getUser();
    return must(await this.sb.from('assessment_addenda').insert({ assessment_id: assessmentId, author_id: u.user?.id, reason, content }).select('*').single()) as Addendum;
  }
  async reviewAssessment(assessmentId: string) {
    const { data: u } = await this.sb.auth.getUser();
    const r = must(await this.sb.from('wound_assessments').update({ supervisor_reviewed_by: u.user?.id, supervisor_reviewed_at: new Date().toISOString() }).eq('id', assessmentId).select('id'));
    if (!(r as unknown[]).length) throw new Error('No tiene permisos para realizar esta acción.');
  }
  async closeWoundByDischarge(woundId: string, notes: string) {
    const { data: u } = await this.sb.auth.getUser();
    must(await this.sb.from('wounds').update({ status: 'cerrada_por_egreso', closed_at: new Date().toISOString(), closure_notes: notes, closed_by: u.user?.id }).eq('id', woundId).select('id'));
  }

  // ---------------- Fotos (bucket privado + URL firmadas) ----------------
  async uploadPhoto(p: Parameters<Repo['uploadPhoto']>[0]) {
    const { data: u } = await this.sb.auth.getUser();
    const ext = p.file.type === 'image/png' ? 'png' : p.file.type === 'image/webp' ? 'webp' : 'jpg';
    const id = crypto.randomUUID();
    const path = `${p.wound.patient_id}/${p.wound.id}/${id}.${ext}`;
    const buf = await p.file.arrayBuffer();
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', buf))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const up = await this.sb.storage.from(BUCKET).upload(path, p.file, { contentType: p.file.type || 'image/jpeg', upsert: false, cacheControl: 'private, max-age=0' });
    if (up.error) throw new Error(up.error.message);
    const settings = await this.getSettings();
    return must(await this.sb.from('wound_photos').insert({
      id, wound_id: p.wound.id, patient_id: p.wound.patient_id, assessment_id: p.assessment_id, derived_from_id: p.derived_from_id,
      storage_path: path, mime_type: p.file.type || 'image/jpeg', size_bytes: p.file.size, width_px: p.width_px, height_px: p.height_px,
      sha256: hash, taken_at: p.taken_at, uploaded_by: u.user?.id, body_region: p.wound.body_region, quality: p.quality,
      has_scale_reference: p.has_scale_reference, px_per_cm: p.px_per_cm, identifiers_excluded: p.identifiers_excluded,
      legal_basis: settings.photo_legal_basis,
    }).select('*').single()) as WoundPhoto;
  }
  async getPhotoUrl(photo: WoundPhoto) {
    const s = await this.getSettings();
    const r = await this.sb.storage.from(BUCKET).createSignedUrl(photo.storage_path, Math.max(15, Math.min(s.signed_url_seconds, 300)));
    if (r.error || !r.data) throw new Error(r.error?.message ?? 'No se pudo obtener la imagen');
    void this.logAccess('PHOTO_VIEW', 'wound_photos', photo.id).catch(() => undefined);
    return r.data.signedUrl;
  }

  // ---------------- Braden / intervenciones ----------------
  async listBraden(patientId: string) {
    const names = await this.professionalNames();
    return (must(await this.sb.from('braden_assessments').select('*').eq('patient_id', patientId).order('assessed_at', { ascending: false })) as BradenAssessment[])
      .map((b) => ({ ...b, assessed_by_name: names.get(b.assessed_by) }));
  }
  async createBraden(b: Parameters<Repo['createBraden']>[0]) {
    const { data: u } = await this.sb.auth.getUser();
    return must(await this.sb.from('braden_assessments').insert({ ...b, assessed_by: u.user?.id }).select('*').single()) as BradenAssessment;
  }
  async listInterventions(patientId: string) {
    const names = await this.professionalNames();
    return (must(await this.sb.from('nursing_interventions').select('*').eq('patient_id', patientId).order('performed_at', { ascending: false })) as NursingIntervention[])
      .map((i) => ({ ...i, performed_by_name: names.get(i.performed_by) }));
  }
  async createIntervention(i: Parameters<Repo['createIntervention']>[0]) {
    const { data: u } = await this.sb.auth.getUser();
    return must(await this.sb.from('nursing_interventions').insert({ ...i, performed_by: u.user?.id }).select('*').single()) as NursingIntervention;
  }

  // ---------------- Indicadores ----------------
  async getIndicatorDataset(): Promise<IndicatorDataset> {
    const st = await this.getStructure();
    const all = async <T,>(table: string, cols = '*') => {
      const out: T[] = [];
      for (let from = 0; ; from += 1000) {
        const r = must(await this.sb.from(table).select(cols).range(from, from + 999)) as T[];
        out.push(...r);
        if (r.length < 1000) break;
      }
      return out;
    };
    const [patients, admissions, assignments, wounds, assessments, braden, interventions] = await Promise.all([
      all<Patient>('patients', 'id, mrn, first_name, last_name, birth_date, sex, is_fictitious, created_at'),
      all<Admission>('admissions'), all<BedAssignment>('bed_assignments'), all<Wound>('wounds'),
      all<WoundAssessment>('wound_assessments'), all<BradenAssessment>('braden_assessments'),
      all<NursingIntervention>('nursing_interventions'),
    ]);
    return { services: st.services, sectors: st.sectors, locations: st.locations, patients, admissions, assignments, wounds, assessments, braden, interventions };
  }

  // ---------------- Administración ----------------
  async listProfiles(): Promise<Profile[]> {
    const [p, us] = await Promise.all([
      this.sb.from('profiles').select('*').order('full_name'),
      this.sb.from('user_sectors').select('*'),
    ]);
    const rows = (us.data ?? []) as { profile_id: string; sector_id: string }[];
    return (must(p) as Profile[]).map((x) => ({ ...x, sector_ids: rows.filter((r) => r.profile_id === x.id).map((r) => r.sector_id) }));
  }
  async saveProfile(p: Parameters<Repo['saveProfile']>[0]) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH', headers: await this.authHeaders(), body: JSON.stringify(p),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo guardar el usuario');
    this.namesCache = null;
  }
  async createUser(u: Parameters<Repo['createUser']>[0]) {
    const res = await fetch('/api/admin/users', { method: 'POST', headers: await this.authHeaders(), body: JSON.stringify(u) });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'No se pudo crear el usuario');
    this.namesCache = null;
  }
  private async authHeaders() {
    const { data } = await this.sb.auth.getSession();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` };
  }
  async listAudit(limit = 200) {
    const names = await this.professionalNames();
    return (must(await this.sb.from('audit_logs').select('*').order('occurred_at', { ascending: false }).limit(limit)) as AuditLog[])
      .map((a) => ({ ...a, actor_name: a.actor_id ? names.get(a.actor_id) : undefined }));
  }
  async getSettings(): Promise<Settings> {
    const r = await this.sb.from('system_settings').select('key, value');
    const s = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
    for (const row of (r.data ?? []) as { key: string; value: unknown }[]) if (row.key in s) s[row.key] = row.value;
    return s as unknown as Settings;
  }
  async saveSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    if (key === 'ai_assistance_enabled' && value === true) {
      const models = await this.listAiModels();
      if (!models.some((m) => m.validation_status === 'validado'))
        throw new Error('No hay un modelo de IA con validación aprobada: la asistencia no puede habilitarse.');
    }
    must(await this.sb.from('system_settings').upsert({ key, value }).select('key'));
  }
  async listAiModels() { return must(await this.sb.from('ai_models').select('*')) as AiModel[]; }
  async professionalNames() {
    if (this.namesCache) return this.namesCache;
    const r = must(await this.sb.rpc('list_professionals')) as { id: string; full_name: string }[];
    this.namesCache = new Map(r.map((x) => [x.id, x.full_name]));
    return this.namesCache;
  }
  async logAccess(action: string, table: string | null, recordId: string | null, context: Record<string, unknown> = {}) {
    await this.sb.rpc('log_access', { p_action: action, p_table: table, p_record: recordId, p_context: context });
  }
}
