'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { Card, ErrorBox, Field, KV, Notice, PageHeader, Segmented, Select, Spinner, StatusPill, fmtDateTime, fromLocalInput, toLocalInput } from '@/components/ui';
import { PatientFields, emptyPatient, validatePatient } from '@/components/PatientForm';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import { LOCATION_TYPE_LABEL, ageYears, fullName } from '@/lib/clinical';
import { countsAsBed } from '@/lib/hospital-structure';
import { friendlyError } from '@/lib/data/repo';
import type { OperationalStatus } from '@/lib/types';

export default function BedPage() {
  const id = useIdParam();
  const { repo, profile, toast } = useApp();
  const router = useRouter();
  const { data: l, error, loading, reload } = useAsync(() => repo.getLocation(id), [repo, id]);
  const candidates = useAsync(() => repo.searchPatients('', { includeDischarged: true }), [repo]);
  const [mode, setMode] = useState<'existente' | 'nuevo'>('existente');
  const [patientId, setPatientId] = useState('');
  const [np, setNp] = useState(emptyPatient());
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [dx, setDx] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<OperationalStatus>('bloqueada');
  const [reason, setReason] = useState('');

  if (loading) return <Spinner />;
  if (error || !l) return <ErrorBox error={error ?? 'Ubicación inexistente.'} onRetry={reload} />;

  const authorized = profile?.role === 'admin' || profile?.sector_ids.includes(l.sector_id);
  const canStatus = profile?.role === 'admin' || (profile?.role === 'supervisor' && authorized);
  const free = (candidates.data ?? []).filter((p) => !p.admission || p.admission.discharged_at);

  async function admit() {
    setErr(null);
    let pid = patientId;
    if (mode === 'nuevo') {
      const v = validatePatient(np);
      if (v) return setErr(v);
    } else if (!pid) return setErr('Seleccione un paciente.');
    setBusy(true);
    try {
      if (mode === 'nuevo') pid = (await repo.createPatient(np)).id;
      await repo.admitPatient(pid, l!.id, fromLocalInput(at), dx.trim() || null);
      toast('Ingreso registrado.');
      router.push(`/pacientes/${enc(pid)}`);
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  async function saveStatus(s: OperationalStatus) {
    setBusy(true); setErr(null);
    try { await repo.setLocationStatus(l!.id, s, s === 'disponible' ? null : reason.trim() || null); toast('Estado actualizado.'); await reload(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <PageHeader back={`/sectores/${enc(l.sector_id)}`} title={<span className="font-mono">{l.code}</span>}
        subtitle={<>{l.sector?.name} · {l.room?.kind === 'habitacion' ? `Habitación ${l.room.code}` : l.room?.name} · {LOCATION_TYPE_LABEL[l.location_type]}</>}
        actions={<StatusPill status={l.display_status} />} />

      {l.is_provisional_code && <Notice tone="info"><p>Código interno <b>provisorio</b> hasta confirmar la nomenclatura institucional. Puede modificarse desde Administración sin perder información clínica.</p></Notice>}
      {!countsAsBed(l.location_type) && <Notice tone="warn"><p>Este puesto ({LOCATION_TYPE_LABEL[l.location_type]}) <b>no es una cama de internación</b> y se excluye por defecto de los indicadores de internación.</p></Notice>}

      {l.display_status === 'ocupada' && l.patient && (
        <Card title="Paciente asignado">
          <KV items={[
            ['Paciente', <b key="n">{fullName(l.patient)}</b>],
            ['Historia clínica', <span key="m" className="font-mono">{l.patient.mrn}</span>],
            ['Edad', ageYears(l.patient.birth_date) != null ? `${ageYears(l.patient.birth_date)} años` : '—'],
            ['En esta ubicación desde', fmtDateTime(l.assignment?.started_at)],
            ['Diagnóstico de ingreso', l.admission?.admission_diagnosis ?? '—'],
            ['Valoraciones pendientes / alertas', `${l.pending ?? 0} / ${l.alerts ?? 0}`],
          ]} />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/pacientes/${enc(l.patient.id)}`} className="btn-primary flex-1 sm:flex-none">Abrir ficha del paciente<Icon name="chevron" /></Link>
            <Link href={`/pacientes/${enc(l.patient.id)}/lesion-nueva`} className="btn-secondary flex-1 sm:flex-none"><Icon name="plus" />Registrar lesión</Link>
          </div>
        </Card>
      )}
      {l.display_status === 'ocupada' && !l.patient && (
        <Notice tone="info" icon="lock"><p>Ubicación ocupada por un paciente de un sector no asignado a su usuario.</p></Notice>
      )}

      {l.display_status === 'libre' && (authorized ? (
        <Card title="Registrar ingreso en esta ubicación">
          <div className="space-y-4">
            <Segmented label="Paciente" value={mode} onChange={setMode} options={[['existente', 'Paciente ya registrado'], ['nuevo', 'Nuevo paciente ficticio']]} />
            {mode === 'existente' ? (
              <Field label="Paciente sin internación activa" hint={free.length ? undefined : 'No hay pacientes disponibles: registre uno nuevo.'}>
                {(fid) => <Select id={fid} value={patientId} onChange={setPatientId} placeholder="Seleccione…" options={free.map((p) => [p.id, `${fullName(p)} · ${p.mrn}`])} />}
              </Field>
            ) : <PatientFields value={np} onChange={setNp} />}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Fecha y hora de ingreso" required>{(fid) => <input id={fid} type="datetime-local" className="input" value={at} max={toLocalInput(new Date())} onChange={(e) => setAt(e.target.value)} />}</Field>
              <Field label="Diagnóstico de ingreso (si se dispone)">{(fid) => <input id={fid} className="input" value={dx} onChange={(e) => setDx(e.target.value)} />}</Field>
            </div>
            {err && <ErrorBox error={err} />}
            <button className="btn-primary w-full sm:w-auto" disabled={busy} onClick={admit}>{busy ? 'Guardando…' : 'Confirmar ingreso'}</button>
          </div>
        </Card>
      ) : <Notice tone="info" icon="lock"><p>Ubicación libre. Solo personal del sector puede registrar ingresos.</p></Notice>)}

      {(l.display_status === 'bloqueada' || l.display_status === 'fuera_servicio') && (
        <Notice tone="warn"><p><b>{l.display_status === 'bloqueada' ? 'Ubicación bloqueada' : 'Fuera de servicio'}</b>{l.status_reason ? `: ${l.status_reason}` : ''}. No admite asignaciones.</p></Notice>
      )}

      {canStatus && l.display_status !== 'ocupada' && (
        <Card title="Estado operativo (supervisión/administración)">
          {l.display_status === 'libre' ? (
            <div className="space-y-3">
              <Segmented label="Nuevo estado" value={status} onChange={setStatus} options={[['bloqueada', 'Bloquear'], ['fuera_servicio', 'Fuera de servicio']]} />
              <Field label="Motivo">{(fid) => <input id={fid} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: limpieza terminal, mantenimiento" />}</Field>
              <button className="btn-secondary" disabled={busy || !reason.trim()} onClick={() => saveStatus(status)}>Aplicar estado</button>
            </div>
          ) : <button className="btn-secondary" disabled={busy} onClick={() => saveStatus('disponible')}>Habilitar ubicación (disponible)</button>}
          {err && l.display_status !== 'libre' && <div className="mt-3"><ErrorBox error={err} /></div>}
        </Card>
      )}
    </div>
  );
}
