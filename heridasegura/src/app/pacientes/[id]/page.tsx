'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { LineChart } from '@/components/Charts';
import {
  AlertChip, Card, Empty, ErrorBox, Field, KV, Modal, Notice, PageHeader, Segmented, Select, Spinner,
  fmtDate, fmtDateTime, fromLocalInput, toLocalInput,
} from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import {
  BRADEN_RISK_LABEL, ETIOLOGY_LABEL, EVOLUTION_LABEL, INTERVENTION_LABEL, LOCATION_TYPE_LABEL, PU_CATEGORIES,
  POA_LABEL, ageYears, bradenAlerts, bradenRisk, fullName, woundAlerts,
} from '@/lib/clinical';
import { friendlyError, type Repo } from '@/lib/data/repo';
import type { AdmissionStatus, Compliance, InterventionType, LocationView, MovementType, PatientDetail } from '@/lib/types';
import { exportPatientPdf } from '@/lib/export/pdf';

type Tab = 'lesiones' | 'braden' | 'intervenciones' | 'movimientos';

function PatientInner() {
  const id = useIdParam();
  const sp = useSearchParams();
  const { repo, settings } = useApp();
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) ?? 'lesiones');
  const det = useAsync(() => repo.getPatient(id), [repo, id]);
  const wounds = useAsync(() => repo.listWounds(id), [repo, id]);
  const braden = useAsync(() => repo.listBraden(id), [repo, id]);
  const interv = useAsync(() => repo.listInterventions(id), [repo, id]);
  const [modal, setModal] = useState<null | 'move' | 'discharge' | 'admit' | 'intervention'>(null);

  if (det.loading) return <Spinner />;
  if (det.error) return <ErrorBox error={det.error} onRetry={det.reload} />;
  if (!det.data) return <ErrorBox error="Paciente inexistente o sin autorización de acceso para su usuario." />;
  const d = det.data;
  const p = d.patient;
  const reloadAll = () => { det.reload(); wounds.reload(); braden.reload(); interv.reload(); };
  const latestBraden = braden.data?.find((b) => !d.admission || b.admission_id === d.admission.id);
  const bAlerts = d.admission ? bradenAlerts(latestBraden, settings.braden_validity_hours) : [];

  return (
    <div className="space-y-4">
      <PageHeader back={d.location ? `/sectores/${enc(d.location.sector_id)}` : '/pacientes'} title={fullName(p)}
        subtitle={<>HC <span className="font-mono">{p.mrn}</span>{ageYears(p.birth_date) != null && ` · ${ageYears(p.birth_date)} años`} · Nac. {fmtDate(p.birth_date)}{p.is_fictitious && <span className="chip ml-2 bg-amber-100 text-amber-900">Paciente ficticio</span>}</>}
        actions={<button className="btn-secondary" onClick={async () => {
          await exportPatientPdf(repo, d, wounds.data ?? [], braden.data ?? [], interv.data ?? [], settings);
          void repo.logAccess('REPORT', 'patients', p.id, { type: 'informe_paciente' });
        }}><Icon name="download" />PDF</button>} />

      <Card title="Internación y ubicación actual">
        {d.admission ? (
          <>
            <KV items={[
              ['Ubicación', d.location ? <b key="l" className="font-mono text-lg">{d.location.code}</b> : 'Sin ubicación asignada'],
              ['Servicio / sector', d.location?.sector?.name ?? '—'],
              ['Habitación / área', d.location?.room ? (d.location.room.kind === 'habitacion' ? `Habitación ${d.location.room.code}` : d.location.room.name) : '—'],
              ['Tipo de puesto', d.location ? LOCATION_TYPE_LABEL[d.location.location_type] : '—'],
              ['Fecha de ingreso', fmtDateTime(d.admission.admitted_at)],
              ['Diagnóstico de ingreso', d.admission.admission_diagnosis ?? '—'],
              ['Estado', 'Internado/a'],
            ]} />
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setModal('move')}><Icon name="move" />Cambio de cama / traslado</button>
              <button className="btn-secondary" onClick={() => setModal('discharge')}><Icon name="exit" />Registrar egreso</button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p>{d.admissions[0]?.discharged_at ? `Último egreso: ${fmtDateTime(d.admissions[0].discharged_at)} (${d.admissions[0].status}).` : 'Sin internación activa.'}</p>
            <button className="btn-primary" onClick={() => setModal('admit')}><Icon name="bed" />Registrar ingreso / asignar cama</button>
          </div>
        )}
      </Card>

      {bAlerts.length > 0 && (
        <div className="flex flex-wrap gap-2">{bAlerts.map((a) => <AlertChip key={a.code} level={a.level}>{a.message}</AlertChip>)}</div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Secciones de la ficha">
        {([['lesiones', `Lesiones (${wounds.data?.length ?? 0})`], ['braden', 'Escala de Braden'], ['intervenciones', 'Intervenciones'], ['movimientos', 'Movimientos']] as [Tab, string][]).map(([k, v]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'tab-active' : ''}`} onClick={() => setTab(k)}>{v}</button>
        ))}
      </div>

      {tab === 'lesiones' && (
        <div className="space-y-3">
          <Link href={`/pacientes/${enc(p.id)}/lesion-nueva`} className="btn-primary w-full sm:w-auto"><Icon name="plus" />Registrar nueva lesión</Link>
          {wounds.loading && <Spinner />}
          {wounds.error && <ErrorBox error={wounds.error} onRetry={wounds.reload} />}
          {wounds.data?.length === 0 && <Empty title="Sin lesiones registradas" />}
          <ul className="grid gap-3 md:grid-cols-2">
            {wounds.data?.map((w) => {
              const alerts = woundAlerts(w, w.last ? [w.last] : []);
              return (
                <li key={w.id}>
                  <Link href={`/lesiones/${enc(w.id)}`} className="card block p-4 hover:border-petrol-400">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-petrol-700 dark:text-turq-300">{w.code}</span>
                      <span className={`chip ${w.status === 'activa' ? 'bg-petrol-100 text-petrol-900' : 'bg-slate-200 text-slate-700'}`}>{w.status === 'activa' ? '● Activa' : `○ ${w.status.replace(/_/g, ' ')}`}</span>
                      {w.current_pu_category && <span className="chip bg-turq-100 text-turq-700">{PU_CATEGORIES[w.current_pu_category].short}{w.initial_pu_category && w.initial_pu_category !== w.current_pu_category ? ` (inicial ${PU_CATEGORIES[w.initial_pu_category].short})` : ''}</span>}
                    </div>
                    <div className="mt-2 font-bold">{w.body_region}{w.laterality !== 'no_aplica' && w.laterality !== 'linea_media' ? ` ${w.laterality}` : ''}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300">{ETIOLOGY_LABEL[w.etiology]}{w.device_related && ' · relacionada con dispositivo'}</div>
                    <div className="text-xs text-slate-500">Detección {fmtDate(w.detected_at)} · {POA_LABEL[w.present_on_admission]}</div>
                    <div className="mt-2 text-sm">{w.last ? <>Última valoración {fmtDateTime(w.last.assessed_at)} · {EVOLUTION_LABEL[w.last.evolution]}</> : <b className="text-red-800 dark:text-red-300">Sin valoración</b>} · {w.photos_count} foto(s)</div>
                    {alerts.length > 0 && <div className="mt-2 flex flex-wrap gap-1">{alerts.map((a) => <AlertChip key={a.code} level={a.level}>{a.message}</AlertChip>)}</div>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === 'braden' && (
        <div className="space-y-3">
          <Link href={`/pacientes/${enc(p.id)}/braden`} className="btn-primary w-full sm:w-auto"><Icon name="plus" />Nueva valoración de Braden</Link>
          {braden.data && braden.data.length > 0 ? (
            <>
              <Card title="Evolución del riesgo (puntaje total 6–23)">
                <LineChart title="Braden" unit="puntos" yMin={6} yMax={23} points={[...braden.data].reverse().map((b) => ({ x: new Date(b.assessed_at), y: b.total }))}
                  bands={[{ from: 6, to: 12.5, label: 'alto', cls: 'fill-red-50 dark:fill-red-950/40' }, { from: 12.5, to: 18.5, label: 'mod', cls: 'fill-amber-50 dark:fill-amber-950/30' }]} />
                <p className="text-xs text-slate-500">Bandas: riesgo alto/muy alto (≤ 12) y moderado/leve (13–18). Verificar puntos de corte con el protocolo institucional.</p>
              </Card>
              <Card title="Historial">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-left text-slate-500"><th className="py-2">Fecha</th><th>Total</th><th>Riesgo</th><th className="hidden sm:table-cell">S/H/A/M/N/F</th><th>Profesional</th></tr></thead>
                    <tbody>{braden.data.map((b) => (
                      <tr key={b.id} className="border-t border-slate-100 dark:border-petrol-800">
                        <td className="py-2">{fmtDateTime(b.assessed_at)}</td><td className="font-bold">{b.total}</td><td>{BRADEN_RISK_LABEL[bradenRisk(b.total)]}</td>
                        <td className="hidden font-mono sm:table-cell">{[b.sensory, b.moisture, b.activity, b.mobility, b.nutrition, b.friction].join('/')}</td><td>{b.assessed_by_name ?? '—'}</td>
                      </tr>))}</tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : <Empty title="Sin valoraciones de Braden" />}
        </div>
      )}

      {tab === 'intervenciones' && (
        <div className="space-y-3">
          <button className="btn-primary w-full sm:w-auto" onClick={() => setModal('intervention')} disabled={!d.admission}><Icon name="plus" />Registrar intervención</button>
          {interv.data?.length === 0 && <Empty title="Sin intervenciones registradas" />}
          <ul className="space-y-2">
            {interv.data?.map((i) => (
              <li key={i.id} className="card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{INTERVENTION_LABEL[i.intervention]}</b>
                  <span className={`chip ${i.compliance === 'realizada' ? 'bg-emerald-100 text-emerald-900' : i.compliance === 'parcial' ? 'bg-amber-100 text-amber-900' : 'bg-red-100 text-red-900'}`}>
                    {i.compliance === 'realizada' ? '✓ Realizada' : i.compliance === 'parcial' ? '◐ Parcial' : '✕ No realizada'}
                  </span>
                </div>
                {i.description && <p className="text-sm">{i.description}</p>}
                {i.reason_not_done && <p className="text-sm text-amber-900 dark:text-amber-200">Motivo: {i.reason_not_done}</p>}
                <p className="text-xs text-slate-500">{fmtDateTime(i.performed_at)} · {i.performed_by_name ?? '—'}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === 'movimientos' && (
        <Card title="Historial de ubicaciones">
          <ol className="relative space-y-3 border-l-2 border-petrol-200 pl-4 dark:border-petrol-700">
            {d.assignments.map((a) => (
              <li key={a.id}>
                <div className="font-semibold"><span className="font-mono">{a.location?.code}</span> · {a.location?.sector?.name}</div>
                <div className="text-sm text-slate-600 dark:text-slate-300">{a.movement === 'ingreso' ? 'Ingreso' : a.movement === 'traslado' ? 'Traslado' : 'Cambio de cama'} · {fmtDateTime(a.started_at)} → {a.ended_at ? fmtDateTime(a.ended_at) : 'actual'}</div>
                {a.notes && <div className="text-sm">{a.notes}</div>}
              </li>
            ))}
            {d.assignments.length === 0 && <li>Sin movimientos.</li>}
          </ol>
          <div className="mt-4 text-sm text-slate-600 dark:text-slate-300">Episodios: {d.admissions.map((a) => `${fmtDate(a.admitted_at)}–${a.discharged_at ? fmtDate(a.discharged_at) : 'actual'}`).join(' · ') || '—'}</div>
        </Card>
      )}

      {modal === 'move' && d.admission && <MoveModal repo={repo} detail={d} onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal === 'admit' && <MoveModal repo={repo} detail={d} admit onClose={() => setModal(null)} onDone={reloadAll} />}
      {modal === 'discharge' && d.admission && <DischargeModal repo={repo} detail={d} onClose={() => setModal(null)} onDone={reloadAll} activeWounds={(wounds.data ?? []).filter((w) => w.status === 'activa').length} />}
      {modal === 'intervention' && <InterventionModal repo={repo} patientId={p.id} wounds={(wounds.data ?? []).filter((w) => w.status === 'activa').map((w) => [w.id, `${w.code} · ${w.body_region}`])} onClose={() => setModal(null)} onDone={interv.reload} />}
    </div>
  );
}

function MoveModal({ repo, detail, admit, onClose, onDone }: { repo: Repo; detail: PatientDetail; admit?: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useApp();
  const st = useAsync(() => repo.getStructure(), [repo]);
  const [sector, setSector] = useState(detail.location?.sector_id ?? '');
  const [locs, setLocs] = useState<LocationView[]>([]);
  const [loc, setLoc] = useState('');
  const [movement, setMovement] = useState<MovementType>('cambio_cama');
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setLoc('');
    if (sector) repo.getOccupancy(sector).then((r) => setLocs(r.filter((l) => l.active && l.display_status === 'libre'))).catch((e) => setErr(friendlyError(e)));
  }, [sector, repo]);
  useEffect(() => { if (!admit && sector && detail.location) setMovement(sector === detail.location.sector_id ? 'cambio_cama' : 'traslado'); }, [sector, admit, detail.location]);

  async function save() {
    if (!loc) return setErr('Seleccione la ubicación de destino.');
    setBusy(true); setErr(null);
    try {
      if (admit) await repo.admitPatient(detail.patient.id, loc, fromLocalInput(at), notes.trim() || null);
      else await repo.movePatient(detail.admission!.id, loc, movement, fromLocalInput(at), notes.trim() || null);
      toast(admit ? 'Ingreso registrado.' : 'Movimiento registrado. Las lesiones continúan asociadas al paciente.');
      onDone(); onClose();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title={admit ? 'Registrar ingreso' : 'Cambio de cama o traslado'}
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Confirmar'}</button></>}>
      <Field label="Sector de destino" required>{(id) => <Select id={id} value={sector} onChange={setSector} placeholder="Seleccione…" options={(st.data?.sectors ?? []).filter((s) => s.active).map((s) => [s.id, s.name])} />}</Field>
      <Field label="Ubicación libre" required hint={sector && !locs.length ? 'No hay ubicaciones libres en este sector.' : undefined}>
        {(id) => <Select id={id} value={loc} onChange={setLoc} placeholder="Seleccione…" options={locs.map((l) => [l.id, `${l.code} · ${LOCATION_TYPE_LABEL[l.location_type]}${l.room?.kind === 'habitacion' ? ` · Hab. ${l.room.code}` : ''}`])} />}
      </Field>
      {!admit && <Segmented label="Tipo de movimiento" value={movement} onChange={setMovement} options={[['cambio_cama', 'Cambio de cama'], ['traslado', 'Traslado de sector']]} />}
      <Field label={admit ? 'Fecha y hora de ingreso' : 'Fecha y hora del movimiento'} required>{(id) => <input id={id} type="datetime-local" className="input" value={at} onChange={(e) => setAt(e.target.value)} />}</Field>
      <Field label={admit ? 'Diagnóstico de ingreso' : 'Observaciones'}>{(id) => <input id={id} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      {err && <ErrorBox error={err} />}
    </Modal>
  );
}

function DischargeModal({ repo, detail, onClose, onDone, activeWounds }: { repo: Repo; detail: PatientDetail; onClose: () => void; onDone: () => void; activeWounds: number }) {
  const { toast } = useApp();
  const [status, setStatus] = useState<AdmissionStatus>('alta');
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true); setErr(null);
    try { await repo.dischargePatient(detail.admission!.id, status, fromLocalInput(at), notes.trim() || null); toast('Egreso registrado. La ubicación quedó libre.'); onDone(); onClose(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar egreso"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-danger" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Confirmar egreso'}</button></>}>
      <Field label="Tipo de egreso" required>{(id) => <Select id={id} value={status} onChange={setStatus} options={{ alta: 'Alta', traslado_externo: 'Traslado a otra institución', fallecimiento: 'Fallecimiento', otro: 'Otro' }} />}</Field>
      <Field label="Fecha y hora" required>{(id) => <input id={id} type="datetime-local" className="input" value={at} onChange={(e) => setAt(e.target.value)} />}</Field>
      <Field label="Observaciones">{(id) => <textarea id={id} className="input min-h-[80px]" value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
      {activeWounds > 0 && <Notice tone="warn"><p>El paciente tiene {activeWounds} lesión(es) activa(s). Documente su estado al egreso con una valoración antes de confirmar; las lesiones conservan su historial.</p></Notice>}
      {err && <ErrorBox error={err} />}
    </Modal>
  );
}

function InterventionModal({ repo, patientId, wounds, onClose, onDone }: { repo: Repo; patientId: string; wounds: [string, string][]; onClose: () => void; onDone: () => void }) {
  const { toast } = useApp();
  const [type, setType] = useState<InterventionType | ''>('');
  const [wound, setWound] = useState('');
  const [desc, setDesc] = useState('');
  const [comp, setComp] = useState<Compliance>('realizada');
  const [reason, setReason] = useState('');
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!type) return setErr('Seleccione el tipo de intervención.');
    if (comp !== 'realizada' && !reason.trim()) return setErr('Indique el motivo.');
    if (type === 'otra' && !desc.trim()) return setErr('Describa la intervención.');
    setBusy(true); setErr(null);
    try {
      await repo.createIntervention({ patient_id: patientId, wound_id: wound || null, assessment_id: null, intervention: type, description: desc.trim() || null, compliance: comp, reason_not_done: comp === 'realizada' ? null : reason.trim(), performed_at: fromLocalInput(at) });
      toast('Intervención registrada.'); onDone(); onClose();
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Registrar intervención de enfermería"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={save}>Guardar</button></>}>
      <Field label="Intervención" required>{(id) => <Select id={id} value={type} onChange={setType} placeholder="Seleccione…" options={INTERVENTION_LABEL} />}</Field>
      <Field label="Lesión relacionada (opcional)">{(id) => <Select id={id} value={wound} onChange={setWound} placeholder="Preventiva / general" options={wounds} />}</Field>
      <Field label="Descripción" hint="Ej.: frecuencia de rotación, superficie utilizada, producto aplicado según protocolo.">{(id) => <textarea id={id} className="input min-h-[80px]" value={desc} onChange={(e) => setDesc(e.target.value)} />}</Field>
      <Segmented label="Cumplimiento" value={comp} onChange={setComp} options={[['realizada', 'Realizada'], ['parcial', 'Parcial'], ['no_realizada', 'No realizada']]} />
      {comp !== 'realizada' && <Field label="Motivo" required>{(id) => <input id={id} className="input" value={reason} onChange={(e) => setReason(e.target.value)} />}</Field>}
      <Field label="Fecha y hora" required>{(id) => <input id={id} type="datetime-local" className="input" value={at} onChange={(e) => setAt(e.target.value)} />}</Field>
      {err && <ErrorBox error={err} />}
    </Modal>
  );
}

export default function PatientPage() { return <Suspense fallback={<Spinner />}><PatientInner /></Suspense>; }
