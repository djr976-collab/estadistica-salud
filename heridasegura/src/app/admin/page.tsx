'use client';
import { useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { Card, ErrorBox, Field, Modal, Notice, PageHeader, Select, Spinner, fmtDateTime } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { LOCATION_TYPE_LABEL } from '@/lib/clinical';
import { friendlyError, type Structure } from '@/lib/data/repo';
import type { AppRole, Location, LocationType, Profile, Room, Sector, Service, Settings } from '@/lib/types';

type Tab = 'usuarios' | 'estructura' | 'config' | 'auditoria' | 'ia';
const ROLE: Record<AppRole, string> = { admin: 'Administrador/a', supervisor: 'Coordinación / supervisión', enfermero: 'Profesional de enfermería' };

export default function AdminPage() {
  const { profile } = useApp();
  const [tab, setTab] = useState<Tab>('usuarios');
  if (profile?.role !== 'admin') return <ErrorBox error="Acceso restringido a administración." />;
  return (
    <div className="space-y-4">
      <PageHeader title="Administración" subtitle="Usuarios, estructura hospitalaria, configuración y auditoría" />
      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">
        {([['usuarios', 'Usuarios'], ['estructura', 'Estructura hospitalaria'], ['config', 'Configuración'], ['auditoria', 'Auditoría'], ['ia', 'Modelos de IA']] as [Tab, string][]).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'tab-active' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>
      {tab === 'usuarios' && <Users />}
      {tab === 'estructura' && <StructureAdmin />}
      {tab === 'config' && <Config />}
      {tab === 'auditoria' && <Audit />}
      {tab === 'ia' && <AiModels />}
    </div>
  );
}

function Users() {
  const { repo, toast } = useApp();
  const users = useAsync(() => repo.listProfiles(), [repo]);
  const st = useAsync(() => repo.getStructure(), [repo]);
  const [edit, setEdit] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  if (users.loading || st.loading) return <Spinner />;
  if (users.error) return <ErrorBox error={users.error} onRetry={users.reload} />;
  const secName = (id: string) => st.data?.sectors.find((s) => s.id === id)?.code ?? '?';
  return (
    <Card title="Usuarios" actions={<button className="btn-primary" onClick={() => setCreating(true)}><Icon name="plus" />Nuevo usuario</button>}>
      {repo.mode === 'supabase' && <div className="mb-3"><Notice tone="info"><p>La creación y edición de usuarios se realiza en el servidor con la clave de servicio (nunca expuesta en el navegador). Los usuarios que se registren por otra vía quedan <b>inactivos</b> hasta su habilitación.</p></Notice></div>}
      <ul className="divide-y divide-slate-100 dark:divide-petrol-800">
        {users.data?.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-2 py-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{u.full_name} {!u.active && <span className="chip bg-slate-200 text-slate-700">Inactivo</span>}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">{ROLE[u.role]}{u.license_no ? ` · Mat. ${u.license_no}` : ''}{u.email ? ` · ${u.email}` : ''}</div>
              <div className="text-xs text-slate-500">Sectores: {u.role === 'admin' ? 'todos' : u.sector_ids.map(secName).join(', ') || 'ninguno'}</div>
            </div>
            <button className="btn-secondary" onClick={() => setEdit(u)}>Editar</button>
          </li>
        ))}
      </ul>
      {(edit || creating) && st.data && (
        <UserModal user={edit} sectors={st.data.sectors} onClose={() => { setEdit(null); setCreating(false); }}
          onSave={async (u, pw, email) => {
            if (edit) await repo.saveProfile({ id: edit.id, ...u });
            else await repo.createUser({ ...u, email: email!, password: pw! });
            toast('Usuario guardado.'); users.reload();
          }} />
      )}
    </Card>
  );
}

function UserModal({ user, sectors, onClose, onSave }: {
  user: Profile | null; sectors: Sector[]; onClose: () => void;
  onSave: (u: Pick<Profile, 'full_name' | 'license_no' | 'role' | 'active' | 'sector_ids'>, pw?: string, email?: string) => Promise<void>;
}) {
  const [name, setName] = useState(user?.full_name ?? '');
  const [lic, setLic] = useState(user?.license_no ?? '');
  const [role, setRole] = useState<AppRole>(user?.role ?? 'enfermero');
  const [active, setActive] = useState(user?.active ?? true);
  const [secs, setSecs] = useState<string[]>(user?.sector_ids ?? []);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (name.trim().length < 2) return setErr('Ingrese el nombre.');
    if (!user && (!email.includes('@') || pw.length < 10)) return setErr('Correo válido y contraseña inicial de al menos 10 caracteres.');
    if (role !== 'admin' && secs.length === 0) return setErr('Asigne al menos un sector.');
    setBusy(true); setErr(null);
    try { await onSave({ full_name: name.trim(), license_no: lic.trim() || null, role, active, sector_ids: secs }, pw, email.trim()); onClose(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={user ? 'Editar usuario' : 'Nuevo usuario'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={save}>Guardar</button></>}>
      <Field label="Nombre y apellido" required>{(id) => <input id={id} className="input" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <Field label="Matrícula profesional">{(id) => <input id={id} className="input" value={lic} onChange={(e) => setLic(e.target.value)} />}</Field>
      {!user && <>
        <Field label="Correo institucional" required>{(id) => <input id={id} type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />}</Field>
        <Field label="Contraseña inicial" required hint="Mínimo 10 caracteres. Solicite el cambio en el primer ingreso.">{(id) => <input id={id} type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />}</Field>
      </>}
      <Field label="Rol" required>{(id) => <Select id={id} value={role} onChange={setRole} options={ROLE} />}</Field>
      <label className="flex min-h-[44px] items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5" checked={active} onChange={(e) => setActive(e.target.checked)} />Usuario activo</label>
      {role !== 'admin' && (
        <fieldset>
          <legend className="label">Sectores autorizados</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {sectors.map((s) => (
              <label key={s.id} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm dark:border-petrol-700">
                <input type="checkbox" checked={secs.includes(s.id)} onChange={() => setSecs(secs.includes(s.id) ? secs.filter((x) => x !== s.id) : [...secs, s.id])} />{s.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {err && <ErrorBox error={err} />}
    </Modal>
  );
}

function StructureAdmin() {
  const { repo, toast } = useApp();
  const st = useAsync(() => repo.getStructure(), [repo]);
  const [sector, setSector] = useState('');
  const [editLoc, setEditLoc] = useState<Partial<Location> | null>(null);
  const [editRoom, setEditRoom] = useState<Partial<Room> | null>(null);
  const [editSector, setEditSector] = useState<Partial<Sector> | null>(null);
  const [editService, setEditService] = useState<Partial<Service> | null>(null);
  if (st.loading) return <Spinner />;
  if (!st.data) return <ErrorBox error={st.error ?? 'Error'} onRetry={st.reload} />;
  const s: Structure = st.data;
  const sec = s.sectors.find((x) => x.id === sector);
  const run = async (fn: () => Promise<void>) => { await fn(); toast('Cambios guardados (auditados).'); st.reload(); };

  return (
    <div className="space-y-4">
      <Notice tone="info"><p>Los cambios de códigos, nombres o estado <b>no afectan</b> los registros clínicos: las lesiones pertenecen al paciente y los movimientos referencian la ubicación por identificador interno. Desactive en lugar de eliminar. La carga inicial es idempotente y no sobrescribe sus modificaciones.</p></Notice>
      <Card title="Servicios y sectores" actions={<div className="flex gap-2"><button className="btn-secondary" onClick={() => setEditService({})}>+ Servicio</button><button className="btn-secondary" onClick={() => setEditSector({})}>+ Sector</button></div>}>
        <ul className="space-y-2 text-sm">
          {s.services.map((sv) => (
            <li key={sv.id}>
              <div className="flex items-center gap-2"><b>{sv.name}</b> <span className="font-mono text-xs">({sv.code})</span>{!sv.active && <span className="chip bg-slate-200">Inactivo</span>}<button className="btn-ghost min-h-[36px] text-xs" onClick={() => setEditService(sv)}>Editar</button></div>
              <ul className="ml-4">
                {s.sectors.filter((x) => x.service_id === sv.id).map((x) => (
                  <li key={x.id} className="flex items-center gap-2">{x.name} <span className="font-mono text-xs">({x.code})</span> · {s.locations.filter((l) => l.sector_id === x.id && l.active).length} ubicaciones activas{!x.active && <span className="chip bg-slate-200">Inactivo</span>}
                    <button className="btn-ghost min-h-[36px] text-xs" onClick={() => setEditSector(x)}>Editar</button></li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Habitaciones y puestos">
        <Field label="Sector">{(id) => <Select id={id} value={sector} onChange={setSector} placeholder="Seleccione un sector…" options={s.sectors.map((x) => [x.id, x.name])} />}</Field>
        {sec && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setEditRoom({ sector_id: sec.id, kind: 'habitacion' })}>+ Habitación / área</button>
              <button className="btn-secondary" onClick={() => setEditLoc({ sector_id: sec.id, location_type: 'cama_internacion' })}>+ Cama / puesto</button>
            </div>
            {s.rooms.filter((r) => r.sector_id === sec.id).sort((a, b) => a.sort_order - b.sort_order).map((r) => (
              <div key={r.id} className="rounded-xl border border-slate-200 p-3 dark:border-petrol-700">
                <div className="flex items-center gap-2"><b>{r.kind === 'habitacion' ? `Habitación ${r.code}` : r.name}</b>{!r.active && <span className="chip bg-slate-200">Inactiva</span>}<button className="btn-ghost min-h-[36px] text-xs" onClick={() => setEditRoom(r)}>Editar</button></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {s.locations.filter((l) => l.room_id === r.id).sort((a, b) => a.sort_order - b.sort_order).map((l) => (
                    <button key={l.id} onClick={() => setEditLoc(l)} className={`rounded-lg border px-3 py-2 text-sm ${l.active ? 'border-petrol-300' : 'border-dashed border-slate-300 text-slate-400 line-through'}`}>
                      <span className="font-mono font-bold">{l.code}</span> <span className="text-xs">{LOCATION_TYPE_LABEL[l.location_type]}{l.is_provisional_code ? ' · prov.' : ''}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {editService && <SimpleModal title={editService.id ? 'Editar servicio' : 'Nuevo servicio'} fields={['code', 'name', 'notes', 'sort_order']} value={editService} withActive
        onClose={() => setEditService(null)} onSave={(v) => run(() => repo.saveService(v as unknown as Service))} />}
      {editSector && <SimpleModal title={editSector.id ? 'Editar sector' : 'Nuevo sector'} fields={['code', 'name', 'sort_order']} value={editSector} withActive
        extra={(v, set) => <Field label="Servicio">{(id) => <Select id={id} value={(v.service_id as string) ?? ''} onChange={(x) => set({ ...v, service_id: x })} placeholder="Seleccione…" options={s.services.map((x) => [x.id, x.name])} />}</Field>}
        onClose={() => setEditSector(null)} onSave={(v) => run(() => repo.saveSector(v as unknown as Sector))} />}
      {editRoom && <SimpleModal title={editRoom.id ? 'Editar habitación / área' : 'Nueva habitación / área'} fields={['code', 'name', 'sort_order']} value={editRoom} withActive
        extra={(v, set) => <Field label="Tipo">{(id) => <Select id={id} value={(v.kind as string) ?? 'habitacion'} onChange={(x) => set({ ...v, kind: x })} options={{ habitacion: 'Habitación', area: 'Área / agrupación de puestos' }} />}</Field>}
        onClose={() => setEditRoom(null)} onSave={(v) => run(() => repo.saveRoom(v as unknown as Room))} />}
      {editLoc && sec && <SimpleModal title={editLoc.id ? 'Editar cama / puesto' : 'Nueva cama / puesto'} fields={['code', 'label', 'sort_order']} value={editLoc} withActive
        extra={(v, set) => <>
          <Field label="Tipo de puesto">{(id) => <Select id={id} value={(v.location_type as string) ?? ''} onChange={(x) => set({ ...v, location_type: x as LocationType })} options={LOCATION_TYPE_LABEL} />}</Field>
          <Field label="Habitación / área">{(id) => <Select id={id} value={(v.room_id as string) ?? ''} onChange={(x) => set({ ...v, room_id: x || null })} placeholder="Sin habitación" options={s.rooms.filter((r) => r.sector_id === sec.id).map((r) => [r.id, r.kind === 'habitacion' ? `Habitación ${r.code}` : r.name])} />}</Field>
          <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={!!v.is_provisional_code} onChange={(e) => set({ ...v, is_provisional_code: e.target.checked })} />Código provisorio (nomenclatura a confirmar)</label>
        </>}
        onClose={() => setEditLoc(null)} onSave={(v) => run(() => repo.saveLocation(v as unknown as Location))} />}
    </div>
  );
}

const FIELD_LABEL: Record<string, string> = { code: 'Código', name: 'Nombre', notes: 'Notas', sort_order: 'Orden', label: 'Etiqueta' };

function SimpleModal({ title, fields, value, withActive, extra, onClose, onSave }: {
  title: string; fields: string[]; value: Record<string, unknown>; withActive?: boolean;
  extra?: (v: Record<string, unknown>, set: (v: Record<string, unknown>) => void) => React.ReactNode;
  onClose: () => void; onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
  const [v, setV] = useState<Record<string, unknown>>({ active: true, ...value });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!String(v.code ?? '').trim()) return setErr('El código es obligatorio.');
    if (fields.includes('name') && !String(v.name ?? '').trim()) return setErr('El nombre es obligatorio.');
    setBusy(true); setErr(null);
    try {
      const out: Record<string, unknown> = { ...v };
      if (out.sort_order !== undefined && out.sort_order !== '') out.sort_order = Number(out.sort_order); else delete out.sort_order;
      await onSave(out); onClose();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={title} footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={save}>Guardar</button></>}>
      {fields.map((k) => <Field key={k} label={FIELD_LABEL[k] ?? k}>{(id) => <input id={id} className="input" value={String(v[k] ?? '')} onChange={(e) => setV({ ...v, [k]: e.target.value })} />}</Field>)}
      {extra?.(v, setV)}
      {withActive && <label className="flex items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5" checked={v.active !== false} onChange={(e) => setV({ ...v, active: e.target.checked })} />Activo (desactivar en lugar de eliminar)</label>}
      {err && <ErrorBox error={err} />}
    </Modal>
  );
}

function Config() {
  const { repo, settings, refreshSettings, toast } = useApp();
  const [s, setS] = useState<Settings>(settings);
  const [busy, setBusy] = useState(false);
  async function save<K extends keyof Settings>(k: K) {
    setBusy(true);
    try { await repo.saveSetting(k, s[k]); await refreshSettings(); toast('Configuración guardada.'); }
    catch (e) { toast(friendlyError(e), 'error'); setS(settings); } finally { setBusy(false); }
  }
  const row = <K extends keyof Settings>(k: K, label: string, type: 'text' | 'number' | 'bool', hint?: string) => (
    <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 pb-3 dark:border-petrol-800">
      <div className="min-w-[240px] flex-1">
        {type === 'bool'
          ? <label className="flex min-h-[48px] items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5" checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />{label}</label>
          : <Field label={label} hint={hint}>{(id) => <input id={id} className="input" type={type === 'number' ? 'number' : 'text'} value={String(s[k])} onChange={(e) => setS({ ...s, [k]: type === 'number' ? Number(e.target.value) : e.target.value })} />}</Field>}
        {type === 'bool' && hint && <p className="hint">{hint}</p>}
      </div>
      <button className="btn-secondary" disabled={busy || s[k] === settings[k]} onClick={() => save(k)}>Guardar</button>
    </div>
  );
  return (
    <Card title="Parámetros del sistema">
      <div className="space-y-3">
        {row('hospital_name', 'Nombre de la institución', 'text')}
        {row('hospital_city', 'Localidad', 'text')}
        {row('braden_validity_hours', 'Vigencia de la valoración de Braden (horas)', 'number', 'Ajustar al protocolo institucional.')}
        {row('default_reassessment_hours', 'Intervalo sugerido de reevaluación de heridas (horas)', 'number', 'Valor sugerido; el profesional define la fecha en cada valoración.')}
        {row('signed_url_seconds', 'Duración de URL firmadas de fotos (segundos, 15–300)', 'number')}
        {row('photo_legal_basis', 'Base legal registrada para fotografías clínicas', 'text', 'Se guarda con cada fotografía. Verificar con el área legal.')}
        {row('ai_assistance_enabled', 'Habilitar asistencia de IA', 'bool', 'Solo es posible si existe un modelo con validación clínica y técnica aprobada.')}
        {row('allow_real_patient_data', 'Autorizar datos reales de pacientes', 'bool', 'Activar SOLO tras evaluación institucional de privacidad, seguridad y validación funcional (dejar constancia del acto administrativo).')}
      </div>
    </Card>
  );
}

function Audit() {
  const { repo } = useApp();
  const { data, error, loading, reload } = useAsync(() => repo.listAudit(300), [repo]);
  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return (
    <Card title="Registro de auditoría (últimos 300 eventos)">
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Se registran creaciones, modificaciones, validaciones, accesos a fichas y fotografías, exportaciones e inicios de sesión. No se almacenan valores clínicos en la auditoría.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead><tr className="text-left text-slate-500"><th className="py-2">Fecha</th><th>Usuario</th><th>Acción</th><th>Tabla</th><th>Registro</th><th>Campos</th></tr></thead>
          <tbody>{data?.map((a) => (
            <tr key={a.id} className="border-t border-slate-100 dark:border-petrol-800">
              <td className="py-1.5 whitespace-nowrap">{fmtDateTime(a.occurred_at)}</td><td>{a.actor_name ?? a.actor_id?.slice(0, 8) ?? 'sistema'}</td>
              <td><span className="chip bg-petrol-100 text-petrol-900">{a.action}</span></td><td>{a.table_name ?? '—'}</td>
              <td className="font-mono text-xs">{a.record_id?.slice(0, 12) ?? '—'}</td><td className="text-xs">{a.changed_fields?.join(', ') ?? ''}</td>
            </tr>))}</tbody>
        </table>
      </div>
    </Card>
  );
}

function AiModels() {
  const { repo } = useApp();
  const { data, loading } = useAsync(() => repo.listAiModels(), [repo]);
  if (loading) return <Spinner />;
  return (
    <Card title="Registro de modelos de IA">
      <Notice tone="ai">
        <p><b>Estado actual: sin modelos validados.</b> La aplicación funciona en modo de valoración manual asistida.</p>
        <p>Para incorporar un modelo (Fase 3) se requiere: validación clínica y técnica documentada, evaluación de desempeño y sesgos (incluidos fototipos de piel), aprobación institucional, acuerdo de tratamiento de datos si procesa fuera de la institución y piloto supervisado. La base de datos rechaza inferencias de modelos no validados.</p>
      </Notice>
      <ul className="mt-3 space-y-2">
        {(data ?? []).map((m) => <li key={m.id} className="rounded-xl border p-3 text-sm"><b>{m.name} {m.version}</b> · {m.provider} · {m.validation_status}<br />{m.intended_use}</li>)}
        {(data ?? []).length === 0 && <li className="text-sm text-slate-500">No hay modelos registrados.</li>}
      </ul>
    </Card>
  );
}
