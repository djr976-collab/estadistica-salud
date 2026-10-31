'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { BodyMarker } from '@/components/BodyMap';
import { LineChart } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { PhotoThumb, PhotoViewer, displayPhotos } from '@/components/Photo';
import { AlertChip, Card, Empty, ErrorBox, Field, KV, Modal, Notice, PageHeader, Spinner, fmtDateTime } from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import {
  ETIOLOGY_LABEL, EVOLUTION_LABEL, EXUDATE_LABEL, INTERVENTION_LABEL, LATERALITY_LABEL, MEASUREMENT_LABEL, POA_LABEL,
  PU_CATEGORIES, areaCm2, fullName, measurementsComparable, woundAlerts,
} from '@/lib/clinical';
import { friendlyError } from '@/lib/data/repo';
import type { WoundAssessment, WoundPhoto } from '@/lib/types';
import { exportWoundPdf } from '@/lib/export/pdf';

export default function WoundPage() {
  const id = useIdParam();
  const { repo, profile, toast, settings } = useApp();
  const { data, error, loading, reload } = useAsync(() => repo.getWound(id), [repo, id]);
  const [viewer, setViewer] = useState<WoundPhoto | null>(null);
  const [addendumFor, setAddendumFor] = useState<WoundAssessment | null>(null);

  if (loading) return <Spinner />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  if (!data) return <ErrorBox error="Lesión inexistente o sin autorización de acceso." />;
  const { wound: w, patient, assessments } = data;
  const photos = displayPhotos(data.photos);
  const alerts = woundAlerts(w, assessments);
  const points = assessments.map((a, i) => ({
    x: new Date(a.assessed_at), y: areaCm2(a),
    comparable: i === 0 || assessments[i - 1].measurement_method === 'no_medible' ? true : measurementsComparable(assessments[i - 1], a),
  }));
  const lastMeasured = [...assessments].reverse().find((a) => areaCm2(a) != null);
  const firstMeasured = assessments.find((a) => areaCm2(a) != null);
  const canReview = profile?.role === 'supervisor' || profile?.role === 'admin';

  async function review(a: WoundAssessment) {
    try { await repo.reviewAssessment(a.id); toast('Revisión registrada.'); reload(); } catch (e) { toast(friendlyError(e), 'error'); }
  }

  return (
    <div className="space-y-4">
      <PageHeader back={`/pacientes/${enc(patient.id)}`} title={<>{w.code} · {w.body_region}</>}
        subtitle={<>{fullName(patient)} · HC {patient.mrn}</>}
        actions={<>
          <button className="btn-secondary" onClick={async () => { await exportWoundPdf(repo, data, settings); void repo.logAccess('REPORT', 'wounds', w.id, { type: 'informe_lesion' }); }}><Icon name="download" />PDF</button>
          {photos.length >= 2 && <Link href={`/lesiones/${enc(w.id)}/comparar`} className="btn-secondary"><Icon name="compare" />Comparar</Link>}
        </>} />

      {w.status === 'activa'
        ? <Link href={`/lesiones/${enc(w.id)}/valoracion`} className="btn-primary w-full sm:w-auto"><Icon name="plus" />{assessments.length ? 'Nueva valoración de seguimiento' : 'Realizar valoración inicial'}</Link>
        : <Notice tone="info"><p>Lesión <b>{w.status.replace(/_/g, ' ')}</b> el {fmtDateTime(w.closed_at)}{w.closure_notes ? `: ${w.closure_notes}` : ''}. El historial se conserva.</p></Notice>}

      {alerts.length > 0 && <div className="flex flex-wrap gap-2">{alerts.map((a) => <AlertChip key={a.code} level={a.level}>{a.message}</AlertChip>)}</div>}

      <Card title="Datos de la lesión">
        <div className="flex gap-4">
          <div className="min-w-0 flex-1">
            <KV items={[
              ['Etiología', ETIOLOGY_LABEL[w.etiology] + (w.etiology_other ? ` (${w.etiology_other})` : '')],
              ['Localización', `${w.body_region} · ${LATERALITY_LABEL[w.laterality]}`],
              ['Detección', fmtDateTime(w.detected_at)],
              ['Origen', `${POA_LABEL[w.present_on_admission]}${w.poa_source ? ` — ${w.poa_source}` : ''}`],
              ...(w.etiology === 'lesion_por_presion' ? [
                ['Categoría inicial', w.initial_pu_category ? PU_CATEGORIES[w.initial_pu_category].label : 'Sin categoría confirmada'] as [string, string],
                ['Categoría vigente', w.current_pu_category ? `${PU_CATEGORIES[w.current_pu_category].label}${w.status === 'activa' && assessments.at(-1)?.evolution === 'mejoria' ? ' — en cicatrización' : ''}` : 'Sin categoría confirmada'] as [string, string],
              ] : []),
              ...(w.device_related ? [['Dispositivo', w.device_description ?? '—'] as [string, string]] : []),
              ['Primera valoración', fmtDateTime(assessments[0]?.assessed_at)],
              ['Valoraciones', String(assessments.length)],
            ]} />
          </div>
          <BodyMarker view={w.body_view} x={w.body_x} y={w.body_y} />
        </div>
      </Card>

      <Card title="Evolución de la superficie (cm²)">
        <LineChart title="Superficie" unit="cm²" points={points} />
        {firstMeasured && lastMeasured && firstMeasured !== lastMeasured && (
          measurementsComparable(firstMeasured, lastMeasured)
            ? <p className="text-sm">Cambio entre primera y última medición comparable: <b>{areaCm2(firstMeasured)} → {areaCm2(lastMeasured)} cm²</b> ({Math.round(((areaCm2(lastMeasured)! - areaCm2(firstMeasured)!) / areaCm2(firstMeasured)!) * 100)} %).</p>
            : <p className="text-sm text-amber-800 dark:text-amber-300">La primera y la última medición usan métodos distintos: no se calcula variación porcentual.</p>
        )}
        <p className="mt-1 text-xs text-slate-500">Superficie = largo × ancho (aproximación). Solo se comparan mediciones obtenidas con el mismo método.</p>
      </Card>

      <Card title="Fotografías cronológicas" actions={photos.length >= 2 ? <Link href={`/lesiones/${enc(w.id)}/comparar`} className="btn-ghost text-sm"><Icon name="compare" />Lado a lado</Link> : undefined}>
        {photos.length === 0 ? <Empty title="Sin fotografías" icon="camera" /> : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {photos.map((p) => (
              <figure key={p.id} className="shrink-0">
                <PhotoThumb photo={p} onOpen={() => setViewer(p)} className="h-32 w-32" />
                <figcaption className="mt-1 text-center text-xs">{fmtDateTime(p.taken_at)}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </Card>

      <Card title="Línea de tiempo de valoraciones">
        {assessments.length === 0 ? <Empty title="Sin valoraciones" /> : (
          <ol className="relative space-y-4 border-l-2 border-petrol-200 pl-5 dark:border-petrol-700">
            {[...assessments].reverse().map((a) => {
              const aPhotos = photos.filter((p) => p.assessment_id === a.id);
              const add = data.addenda.filter((x) => x.assessment_id === a.id);
              const iv = data.interventions.filter((x) => x.assessment_id === a.id);
              return (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[29px] top-1 h-4 w-4 rounded-full border-2 border-white bg-petrol-600 dark:border-petrol-900" aria-hidden />
                  <div className="card p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <b>{fmtDateTime(a.assessed_at)}</b>
                      <span className={`chip ${a.evolution === 'empeoramiento' ? 'bg-red-100 text-red-900' : a.evolution === 'mejoria' || a.evolution === 'resuelta' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-100 text-slate-800'}`}>{EVOLUTION_LABEL[a.evolution]}</span>
                      {a.pu_category && <span className="chip bg-turq-100 text-turq-700">{PU_CATEGORIES[a.pu_category].short} confirmada</span>}
                      {a.supervisor_reviewed_at && <span className="chip bg-emerald-100 text-emerald-900">✓ Revisada por supervisión</span>}
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Profesional: {a.assessed_by_name ?? '—'}</p>
                    <div className="mt-2 flex gap-3">
                      {aPhotos.map((p) => <PhotoThumb key={p.id} photo={p} onOpen={() => setViewer(p)} />)}
                      <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-sm sm:grid-cols-3">
                        <Item k="Medición" v={a.measurement_method === 'no_medible' ? 'No medible' : `${a.length_cm} × ${a.width_cm}${a.depth_cm != null ? ` × ${a.depth_cm}` : ''} cm (${areaCm2(a)} cm²)`} />
                        <Item k="Método" v={MEASUREMENT_LABEL[a.measurement_method].split(' (')[0]} />
                        <Item k="Tejido" v={[a.tissue_granulation_pct != null && `gran. ${a.tissue_granulation_pct}%`, a.tissue_slough_pct != null && `esf. ${a.tissue_slough_pct}%`, a.tissue_necrosis_pct != null && `necr. ${a.tissue_necrosis_pct}%`, a.tissue_epithelial_pct != null && `epit. ${a.tissue_epithelial_pct}%`, a.tissue_other].filter(Boolean).join(' · ') || '—'} />
                        <Item k="Exudado" v={[a.exudate_amount && EXUDATE_LABEL[a.exudate_amount], a.exudate_type].filter(Boolean).join(' · ') || '—'} />
                        <Item k="Bordes" v={a.edges} /><Item k="Perilesional" v={a.periwound_skin} />
                        <Item k="Dolor" v={a.pain_score != null ? `${a.pain_score}/10` : '—'} /><Item k="Olor" v={a.odor} />
                        <Item k="Próxima valoración" v={fmtDateTime(a.next_assessment_due)} />
                      </dl>
                    </div>
                    {a.clinical_signs.length > 0 && <p className="mt-2 text-sm"><b>Signos documentados:</b> {a.clinical_signs.join(', ')}</p>}
                    {a.observations && <p className="mt-1 text-sm"><b>Observaciones:</b> {a.observations}</p>}
                    {iv.length > 0 && <p className="mt-1 text-sm"><b>Intervenciones:</b> {iv.map((x) => INTERVENTION_LABEL[x.intervention]).join(', ')}</p>}
                    {add.map((x) => (
                      <div key={x.id} className="mt-2 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-2 text-sm dark:bg-amber-950">
                        <b>Adenda</b> · {fmtDateTime(x.created_at)} · {x.author_name ?? '—'}<br /><i>Motivo:</i> {x.reason}<br />{x.content}
                      </div>
                    ))}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn-ghost text-sm" onClick={() => setAddendumFor(a)}>Agregar adenda / corrección</button>
                      {canReview && !a.supervisor_reviewed_at && <button className="btn-ghost text-sm" onClick={() => review(a)}>Marcar como revisada</button>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </Card>

      <PhotoViewer photo={viewer} onClose={() => setViewer(null)} />
      {addendumFor && <AddendumModal assessment={addendumFor} onClose={() => setAddendumFor(null)} onDone={reload} />}
    </div>
  );
}

function Item({ k, v }: { k: string; v: string | null | undefined }) {
  return <div><dt className="text-xs text-slate-500">{k}</dt><dd>{v || '—'}</dd></div>;
}

function AddendumModal({ assessment, onClose, onDone }: { assessment: WoundAssessment; onClose: () => void; onDone: () => void }) {
  const { repo, toast } = useApp();
  const [reason, setReason] = useState('');
  const [content, setContent] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (reason.trim().length < 4 || content.trim().length < 4) return setErr('Indique motivo y contenido.');
    setBusy(true);
    try { await repo.addAddendum(assessment.id, reason.trim(), content.trim()); toast('Adenda registrada.'); onDone(); onClose(); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <Modal open onClose={onClose} title="Adenda trazable"
      footer={<><button className="btn-secondary" onClick={onClose}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={save}>Registrar adenda</button></>}>
      <Notice tone="info"><p>La valoración original del {fmtDateTime(assessment.assessed_at)} no se modifica. La adenda queda asociada, con fecha, hora y autor.</p></Notice>
      <Field label="Motivo" required>{(id) => <input id={id} className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej.: corrección de dato, información complementaria" />}</Field>
      <Field label="Contenido" required>{(id) => <textarea id={id} className="input min-h-[120px]" value={content} onChange={(e) => setContent(e.target.value)} />}</Field>
      {err && <ErrorBox error={err} />}
    </Modal>
  );
}
