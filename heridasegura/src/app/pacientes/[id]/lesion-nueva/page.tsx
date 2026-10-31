'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { BodyMap, type BodyPick } from '@/components/BodyMap';
import { Card, ErrorBox, Field, Notice, PageHeader, Segmented, Select, Spinner, fromLocalInput, toLocalInput } from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import { DEVICE_RELATED_INFO, ETIOLOGY_LABEL, LATERALITY_LABEL, fullName } from '@/lib/clinical';
import { friendlyError } from '@/lib/data/repo';
import type { Laterality, WoundEtiology, YesNoUnknown } from '@/lib/types';

export default function NewWound() {
  const id = useIdParam();
  const { repo, toast } = useApp();
  const router = useRouter();
  const det = useAsync(() => repo.getPatient(id), [repo, id]);
  const [etiology, setEtiology] = useState<WoundEtiology | ''>('');
  const [other, setOther] = useState('');
  const [pick, setPick] = useState<BodyPick | null>(null);
  const [region, setRegion] = useState('');
  const [lat, setLat] = useState<Laterality>('no_aplica');
  const [detected, setDetected] = useState(toLocalInput(new Date()));
  const [poa, setPoa] = useState<YesNoUnknown>('desconocido');
  const [poaSource, setPoaSource] = useState('');
  const [device, setDevice] = useState(false);
  const [deviceDesc, setDeviceDesc] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (det.loading) return <Spinner />;
  if (!det.data) return <ErrorBox error={det.error ?? 'Paciente no disponible.'} />;
  const patient = det.data.patient;

  function onPick(p: BodyPick) {
    setPick(p); setRegion(p.region);
    if (p.side) setLat(p.side);
  }

  async function save() {
    setErr(null);
    if (!etiology) return setErr('Seleccione la etiología probable.');
    if (etiology === 'otra' && !other.trim()) return setErr('Especifique la etiología.');
    if (!region.trim()) return setErr('Marque la localización en el esquema corporal o escríbala.');
    if (poa !== 'desconocido' && !poaSource.trim()) return setErr('Indique la fuente verificable del dato "presente al ingreso".');
    if (device && !deviceDesc.trim()) return setErr('Describa el dispositivo médico relacionado.');
    if (new Date(detected) > new Date()) return setErr('La fecha de detección no puede ser futura.');
    setBusy(true);
    try {
      const w = await repo.createWound({
        patient_id: patient.id, etiology, etiology_other: etiology === 'otra' ? other.trim() : null,
        body_region: region.trim(), body_view: pick?.view ?? null, body_x: pick?.x ?? null, body_y: pick?.y ?? null,
        laterality: lat, detected_at: fromLocalInput(detected), present_on_admission: poa, poa_source: poaSource.trim() || null,
        device_related: etiology === 'lesion_por_presion' && device, device_description: etiology === 'lesion_por_presion' && device ? deviceDesc.trim() : null,
      });
      toast(`Lesión ${w.code} registrada. Complete la valoración inicial.`);
      router.push(`/lesiones/${enc(w.id)}/valoracion`);
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <PageHeader back={`/pacientes/${enc(patient.id)}`} title="Registrar lesión" subtitle={`${fullName(patient)} · HC ${patient.mrn}`} />
      {!det.data.admission && <Notice tone="warn"><p>El paciente no tiene internación activa. La lesión quedará asociada al paciente sin episodio.</p></Notice>}

      <Card title="1. Etiología probable">
        <Field label="Tipo de lesión" required>{(fid) => <Select id={fid} value={etiology} onChange={setEtiology} placeholder="Seleccione…" options={ETIOLOGY_LABEL} />}</Field>
        {etiology === 'otra' && <div className="mt-3"><Field label="Especifique" required>{(fid) => <input id={fid} className="input" value={other} onChange={(e) => setOther(e.target.value)} />}</Field></div>}
        {etiology === 'lesion_por_presion' && (
          <div className="mt-3 space-y-3">
            <label className="flex min-h-[48px] items-center gap-3 font-semibold"><input type="checkbox" className="h-5 w-5" checked={device} onChange={(e) => setDevice(e.target.checked)} />Relacionada con dispositivo médico</label>
            {device && <>
              <Field label="Dispositivo" required hint="Ej.: sonda nasogástrica, máscara de VNI, collar cervical.">{(fid) => <input id={fid} className="input" value={deviceDesc} onChange={(e) => setDeviceDesc(e.target.value)} />}</Field>
              <Notice tone="info"><p>{DEVICE_RELATED_INFO}</p></Notice>
            </>}
          </div>
        )}
        {etiology && etiology !== 'lesion_por_presion' && <div className="mt-3"><Notice tone="info"><p>Los estadios NPIAP/EPUAP <b>no se aplican</b> a esta etiología. Se valorará con criterios propios (lecho, bordes, exudado, piel perilesional, dimensiones).</p></Notice></div>}
        {etiology === 'dermatitis_humedad' && <div className="mt-3"><Notice tone="warn"><p>La dermatitis asociada a la humedad no debe registrarse como LPP estadio 2. Si coexisten, registre cada lesión por separado.</p></Notice></div>}
      </Card>

      <Card title="2. Localización anatómica">
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Toque la región en el esquema. Puede ajustar el nombre de la región.</p>
        <BodyMap value={pick} onChange={onPick} />
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Región anatómica" required>{(fid) => <input id={fid} className="input" value={region} onChange={(e) => setRegion(e.target.value)} />}</Field>
          <Field label="Lateralidad" required>{(fid) => <Select id={fid} value={lat} onChange={setLat} options={LATERALITY_LABEL} />}</Field>
        </div>
      </Card>

      <Card title="3. Detección y origen">
        <div className="space-y-3">
          <Field label="Fecha y hora de detección" required>{(fid) => <input id={fid} type="datetime-local" className="input" value={detected} max={toLocalInput(new Date())} onChange={(e) => setDetected(e.target.value)} />}</Field>
          <div>
            <span className="label">¿Presente al ingreso?</span>
            <Segmented label="Presente al ingreso" value={poa} onChange={setPoa} options={[['si', 'Sí, presente al ingreso'], ['no', 'No, adquirida en internación'], ['desconocido', 'Sin dato verificable']]} />
            <p className="hint">Registre "Sí" o "No" solo con respaldo verificable (valoración de piel al ingreso, epicrisis de derivación). Si no existe, deje "Sin dato verificable": los indicadores lo advierten.</p>
          </div>
          {poa !== 'desconocido' && <Field label="Fuente verificable" required>{(fid) => <input id={fid} className="input" value={poaSource} onChange={(e) => setPoaSource(e.target.value)} placeholder="Ej.: valoración de piel al ingreso del dd/mm, hoja de enfermería" />}</Field>}
        </div>
      </Card>

      {err && <ErrorBox error={err} />}
      <button className="btn-primary w-full" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Guardar y continuar con la valoración'}</button>
    </div>
  );
}
