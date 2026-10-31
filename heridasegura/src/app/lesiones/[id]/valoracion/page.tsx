'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { AiPanel } from '@/components/AiPanel';
import { PhotoCapture, type CapturedPhoto } from '@/components/PhotoCapture';
import { Card, ErrorBox, Field, Notice, PageHeader, Segmented, Select, Spinner, fromLocalInput, toLocalInput } from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import {
  BLANCHING_LABEL, CLINICAL_SIGNS, DEVICE_RELATED_INFO, ETIOLOGY_LABEL, EVOLUTION_LABEL, EXUDATE_LABEL, INTERVENTION_LABEL,
  MEASUREMENT_LABEL, PU_CATEGORIES, fullName, isPressureInjury, puTransitionError, validateAssessment,
} from '@/lib/clinical';
import { friendlyError } from '@/lib/data/repo';
import type { Blanching, Evolution, ExudateAmount, InterventionType, MeasurementMethod, PuCategory } from '@/lib/types';

interface Form {
  assessed_at: string; pu_category: PuCategory | ''; blanching: Blanching; confirmed: boolean;
  method: MeasurementMethod; length: string; width: string; depth: string; undermining: string;
  gran: string; slough: string; necro: string; epi: string; tissue_other: string;
  edges: string; exudate_amount: ExudateAmount | ''; exudate_type: string; odor: string; periwound: string;
  pain: string; signs: string[]; evolution: Evolution | ''; observations: string; next_due: string;
  closure_confirmed: boolean; interventions: InterventionType[];
}

const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));

export default function AssessmentPage() {
  const id = useIdParam();
  const { repo, settings, toast } = useApp();
  const router = useRouter();
  const wd = useAsync(() => repo.getWound(id), [repo, id]);
  const models = useAsync(() => repo.listAiModels(), [repo]);
  const draftKey = `hs-draft-${id}`;
  const [f, setF] = useState<Form | null>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Inicializa el formulario (recupera borrador de la sesión si existe)
  useEffect(() => {
    if (!wd.data || f) return;
    const first = wd.data.assessments.length === 0;
    const base: Form = {
      assessed_at: toLocalInput(new Date()), pu_category: '', blanching: isPressureInjury(wd.data.wound.etiology) ? 'no_evaluado' : 'no_aplica',
      confirmed: false, method: 'regla_milimetrada', length: '', width: '', depth: '', undermining: '', gran: '', slough: '', necro: '', epi: '',
      tissue_other: '', edges: '', exudate_amount: '', exudate_type: '', odor: '', periwound: '', pain: '', signs: [],
      evolution: first ? 'primera_valoracion' : '', observations: '',
      next_due: toLocalInput(new Date(Date.now() + settings.default_reassessment_hours * 3_600_000)), closure_confirmed: false, interventions: [],
    };
    let saved: Form | null = null;
    try { const raw = sessionStorage.getItem(draftKey); if (raw) saved = { ...base, ...JSON.parse(raw) }; } catch { /* noop */ }
    setF(saved ?? base);
  }, [wd.data, f, draftKey, settings.default_reassessment_hours]);
  useEffect(() => { if (f) try { sessionStorage.setItem(draftKey, JSON.stringify(f)); } catch { /* noop */ } }, [f, draftKey]);

  const w = wd.data?.wound;
  const lpp = w ? isPressureInjury(w.etiology) : false;
  const area = f && f.method !== 'no_medible' && num(f.length) && num(f.width) ? Math.round(num(f.length)! * num(f.width)! * 100) / 100 : null;
  const summary = useMemo(() => {
    if (!f) return [];
    const s: string[] = [];
    if (f.pu_category) s.push(`Categoría propuesta: ${PU_CATEGORIES[f.pu_category].short}${f.confirmed ? ' (confirmada)' : ' (sin confirmar)'}`);
    if (lpp && f.blanching !== 'no_aplica') s.push(BLANCHING_LABEL[f.blanching]);
    if (area) s.push(`Superficie ${area} cm² (${MEASUREMENT_LABEL[f.method]})`);
    if (f.exudate_amount) s.push(`Exudado ${EXUDATE_LABEL[f.exudate_amount].toLowerCase()}`);
    if (f.pain) s.push(`Dolor ${f.pain}/10`);
    if (f.signs.length) s.push(`Signos: ${f.signs.join(', ')}`);
    return s;
  }, [f, lpp, area]);

  if (wd.loading || !f) return wd.error ? <ErrorBox error={wd.error} onRetry={wd.reload} /> : <Spinner />;
  if (!wd.data || !w) return <ErrorBox error="Lesión no disponible." />;
  if (w.status !== 'activa') return <ErrorBox error="La lesión está cerrada; no admite nuevas valoraciones. Registre una nueva lesión si reaparece." />;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v });
  const toggle = <K extends 'signs' | 'interventions'>(k: K, v: Form[K][number]) =>
    setF({ ...f, [k]: (f[k] as string[]).includes(v) ? (f[k] as string[]).filter((x) => x !== v) : [...(f[k] as string[]), v] });

  async function save() {
    const draft = {
      etiology: w!.etiology, current_category: w!.current_pu_category, pu_category: f!.pu_category || null, blanching: f!.blanching,
      classification_confirmed: f!.confirmed, measurement_method: f!.method,
      length_cm: f!.method === 'no_medible' ? null : num(f!.length), width_cm: f!.method === 'no_medible' ? null : num(f!.width), depth_cm: f!.method === 'no_medible' ? null : num(f!.depth),
      tissue: [num(f!.gran), num(f!.slough), num(f!.necro), num(f!.epi)], pain_score: num(f!.pain),
      assessed_at: fromLocalInput(f!.assessed_at), next_assessment_due: f!.next_due && !['resuelta', 'derivada'].includes(f!.evolution) ? fromLocalInput(f!.next_due) : null,
      evolution: (f!.evolution || 'sin_cambios') as Evolution, closure_confirmed: f!.closure_confirmed,
    };
    const errs = validateAssessment(draft);
    if (!f!.evolution) errs.unshift('Indique la evolución observada.');
    if (photo && !photo.identifiers_excluded) errs.push('Confirme que la fotografía no contiene datos identificatorios.');
    setErrors(errs);
    if (errs.length) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setBusy(true);
    try {
      const a = await repo.createAssessment({
        wound_id: w!.id, assessed_at: draft.assessed_at, pu_category: draft.pu_category, blanching: draft.blanching,
        classification_confirmed: draft.classification_confirmed, measurement_method: draft.measurement_method,
        length_cm: draft.length_cm, width_cm: draft.width_cm, depth_cm: draft.depth_cm, undermining_tunneling: f!.undermining.trim() || null,
        tissue_granulation_pct: num(f!.gran), tissue_slough_pct: num(f!.slough), tissue_necrosis_pct: num(f!.necro), tissue_epithelial_pct: num(f!.epi),
        tissue_other: f!.tissue_other.trim() || null, edges: f!.edges.trim() || null, exudate_amount: f!.exudate_amount || null,
        exudate_type: f!.exudate_type.trim() || null, odor: f!.odor.trim() || null, periwound_skin: f!.periwound.trim() || null,
        pain_score: draft.pain_score, clinical_signs: f!.signs, evolution: draft.evolution, observations: f!.observations.trim() || null,
        next_assessment_due: draft.next_assessment_due,
      });
      if (photo) {
        const orig = await repo.uploadPhoto({
          wound: w!, file: photo.original, assessment_id: a.id, derived_from_id: null, taken_at: photo.taken_at,
          width_px: photo.edited ? null : photo.width, height_px: photo.edited ? null : photo.height, quality: photo.quality,
          has_scale_reference: photo.has_scale_reference, px_per_cm: photo.edited ? null : photo.px_per_cm, identifiers_excluded: photo.identifiers_excluded,
        });
        if (photo.edited) await repo.uploadPhoto({
          wound: w!, file: new File([photo.edited], 'editada.jpg', { type: 'image/jpeg' }), assessment_id: a.id, derived_from_id: orig.id,
          taken_at: photo.taken_at, width_px: photo.width, height_px: photo.height, quality: photo.quality,
          has_scale_reference: photo.has_scale_reference, px_per_cm: photo.px_per_cm, identifiers_excluded: photo.identifiers_excluded,
        });
      }
      for (const it of f!.interventions)
        await repo.createIntervention({ patient_id: w!.patient_id, wound_id: w!.id, assessment_id: a.id, intervention: it, description: null, compliance: 'realizada', reason_not_done: null, performed_at: draft.assessed_at });
      try { sessionStorage.removeItem(draftKey); } catch { /* noop */ }
      toast('Valoración confirmada y registrada.');
      router.push(`/lesiones/${enc(w!.id)}`);
    } catch (e) {
      setErrors([friendlyError(e)]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally { setBusy(false); }
  }

  const categories = Object.keys(PU_CATEGORIES) as PuCategory[];

  return (
    <div className="space-y-4">
      <PageHeader back={`/lesiones/${enc(w.id)}`} title={`Valoración · ${w.code}`}
        subtitle={<>{fullName(wd.data.patient)} · {w.body_region} · {ETIOLOGY_LABEL[w.etiology]}</>} />
      {errors.length > 0 && (
        <div role="alert" className="rounded-xl border-2 border-red-300 bg-red-50 p-3 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
          <p className="font-bold">Revise antes de confirmar:</p>
          <ul className="list-disc pl-5">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <Card title="1. Fecha y profesional">
        <Field label="Fecha y hora de la valoración" required hint="El profesional responsable es el usuario autenticado.">
          {(fid) => <input id={fid} type="datetime-local" className="input" value={f.assessed_at} max={toLocalInput(new Date())} onChange={(e) => set('assessed_at', e.target.value)} />}
        </Field>
      </Card>

      <Card title="2. Fotografía clínica">
        <PhotoCapture onChange={setPhoto} />
      </Card>

      {lpp && (
        <Card title="3. Clasificación de la lesión por presión (NPIAP/EPUAP/PPPIA)">
          <div className="space-y-3">
            <Notice tone="warn"><p>La clasificación surge de la <b>exploración clínica presencial</b> combinada con la observación. Nunca se asigna automáticamente ni a partir de una fotografía aislada.</p></Notice>
            {w.current_pu_category && <Notice tone="info"><p>Categoría vigente: <b>{PU_CATEGORIES[w.current_pu_category].label}</b>. No se utiliza estadificación inversa: en la cicatrización se conserva la categoría (p. ej., «estadio 3 en cicatrización») y se documenta la evolución. Deje la misma categoría o seleccione una progresión válida.</p></Notice>}
            {w.device_related && <Notice tone="info"><p>{DEVICE_RELATED_INFO}</p></Notice>}
            <div>
              <span className="label">Evaluación del blanqueamiento (presencial)</span>
              <Segmented label="Blanqueamiento" value={f.blanching} onChange={(v) => set('blanching', v)} options={[['no_blanqueable', 'Eritema NO blanqueable'], ['blanqueable', 'Eritema blanqueable'], ['no_evaluado', 'No evaluado'], ['no_aplica', 'No aplica (piel no intacta)']]} />
              {f.blanching === 'blanqueable' && <p className="hint">El eritema blanqueable no constituye LPP estadio 1: registre la valoración preventiva y reevalúe.</p>}
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {categories.map((c) => {
                const info = PU_CATEGORIES[c];
                const block = puTransitionError(w.current_pu_category, c);
                const blanchBlock = c === 'estadio_1' && f.blanching !== 'no_blanqueable' ? 'Requiere constatar eritema no blanqueable.' : null;
                const on = f.pu_category === c;
                return (
                  <button key={c} type="button" disabled={!!block} aria-pressed={on} onClick={() => set('pu_category', on ? '' : c)}
                    className={`rounded-xl border-2 p-3 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-petrol-700 bg-petrol-50 dark:border-turq-400 dark:bg-petrol-800' : 'border-slate-200 hover:border-petrol-300 dark:border-petrol-700'}`}>
                    <div className="font-bold">{on && '✓ '}{info.label}</div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-700 dark:text-slate-300">{info.criteria.map((x) => <li key={x}>{x}</li>)}</ul>
                    {info.notes && <p className="mt-1 font-semibold text-petrol-800 dark:text-turq-200">{info.notes}</p>}
                    {(block || (on && blanchBlock)) && <p className="mt-1 font-semibold text-red-800 dark:text-red-300">{block ?? blanchBlock}</p>}
                  </button>
                );
              })}
            </div>
            <label className="flex min-h-[48px] items-start gap-3 rounded-xl border-2 border-petrol-300 p-3 font-semibold dark:border-petrol-600">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={f.confirmed} onChange={(e) => set('confirmed', e.target.checked)} disabled={!f.pu_category} />
              Confirmo que la categoría seleccionada surge de mi valoración clínica presencial, bajo mi responsabilidad profesional.
            </label>
            {!f.pu_category && <Notice tone="info"><p>Si no selecciona categoría, la lesión quedará como «sin categoría confirmada»: No es posible determinar la clasificación con la información disponible. Se requiere valoración clínica.</p></Notice>}
            <p className="hint">Criterios sintetizados de la clasificación internacional NPIAP/EPUAP/PPPIA. Verificar con la guía vigente y el protocolo institucional.</p>
          </div>
        </Card>
      )}

      <Card title={`${lpp ? 4 : 3}. Dimensiones`}>
        <div className="space-y-3">
          <Field label="Método de medición" required>{(fid) => <Select id={fid} value={f.method} onChange={(v) => setF({ ...f, method: v, ...(v === 'no_medible' ? { length: '', width: '', depth: '' } : {}) })} options={MEASUREMENT_LABEL} />}</Field>
          {f.method === 'foto_calibrada' && !photo?.px_per_cm && <Notice tone="warn"><p>Para usar medición fotográfica, la foto debe incluir una referencia de escala calibrada en el plano de la herida.</p></Notice>}
          {f.method !== 'no_medible' && (
            <div className="grid grid-cols-3 gap-3">
              <Field label="Largo (cm)" required hint="Eje cabeza-pies">{(fid) => <input id={fid} className="input" inputMode="decimal" value={f.length} onChange={(e) => set('length', e.target.value)} />}</Field>
              <Field label="Ancho (cm)" required hint="Perpendicular">{(fid) => <input id={fid} className="input" inputMode="decimal" value={f.width} onChange={(e) => set('width', e.target.value)} />}</Field>
              <Field label="Profundidad (cm)" hint="Si corresponde">{(fid) => <input id={fid} className="input" inputMode="decimal" value={f.depth} onChange={(e) => set('depth', e.target.value)} />}</Field>
            </div>
          )}
          {area && <p className="font-semibold">Superficie (largo × ancho): {area} cm² <span className="font-normal text-slate-500">— aproximación rectangular; compare solo mediciones con el mismo método.</span></p>}
          <Field label="Socavamiento / tunelización">{(fid) => <input id={fid} className="input" value={f.undermining} onChange={(e) => set('undermining', e.target.value)} placeholder="Ej.: socavamiento 1 cm entre hora 2 y 5" />}</Field>
        </div>
      </Card>

      <Card title={`${lpp ? 5 : 4}. Lecho, bordes, exudado y piel perilesional`}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([['gran', 'Granulación %'], ['slough', 'Esfacelo %'], ['necro', 'Necrosis/escara %'], ['epi', 'Epitelización %']] as const).map(([k, l]) => (
              <Field key={k} label={l}>{(fid) => <input id={fid} className="input" inputMode="numeric" value={f[k]} onChange={(e) => set(k, e.target.value)} />}</Field>
            ))}
          </div>
          <Field label="Otro tejido / descripción del lecho">{(fid) => <input id={fid} className="input" value={f.tissue_other} onChange={(e) => set('tissue_other', e.target.value)} />}</Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Bordes">{(fid) => <input id={fid} className="input" value={f.edges} onChange={(e) => set('edges', e.target.value)} placeholder="Definidos, macerados, epíbole…" />}</Field>
            <Field label="Piel perilesional">{(fid) => <input id={fid} className="input" value={f.periwound} onChange={(e) => set('periwound', e.target.value)} placeholder="Íntegra, eritematosa, macerada…" />}</Field>
            <Field label="Exudado: cantidad">{(fid) => <Select id={fid} value={f.exudate_amount} onChange={(v) => set('exudate_amount', v)} placeholder="Seleccione…" options={EXUDATE_LABEL} />}</Field>
            <Field label="Exudado: características">{(fid) => <input id={fid} className="input" value={f.exudate_type} onChange={(e) => set('exudate_type', e.target.value)} placeholder="Seroso, serohemático, purulento…" />}</Field>
            <Field label="Olor (cuando corresponda)">{(fid) => <input id={fid} className="input" value={f.odor} onChange={(e) => set('odor', e.target.value)} />}</Field>
            <Field label={`Dolor (escala numérica 0–10): ${f.pain || '—'}`}>{(fid) => <input id={fid} type="range" min={0} max={10} step={1} className="h-12 w-full accent-petrol-700" value={f.pain || 0} onChange={(e) => set('pain', e.target.value)} aria-valuetext={`${f.pain || 0} de 10`} />}</Field>
          </div>
          <fieldset>
            <legend className="label">Signos clínicos asociados (documentados)</legend>
            <div className="flex flex-wrap gap-2">
              {CLINICAL_SIGNS.map((s) => (
                <label key={s} className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 text-sm ${f.signs.includes(s) ? 'border-petrol-700 bg-petrol-50 font-semibold dark:bg-petrol-800' : 'border-slate-300 dark:border-petrol-700'}`}>
                  <input type="checkbox" checked={f.signs.includes(s)} onChange={() => toggle('signs', s)} />{s}
                </label>
              ))}
            </div>
            <p className="hint">Documentar signos no equivale a diagnosticar infección: comunique al equipo tratante según protocolo.</p>
          </fieldset>
        </div>
      </Card>

      <Card title={`${lpp ? 6 : 5}. Evolución, intervenciones y próxima valoración`}>
        <div className="space-y-3">
          <Field label="Evolución observada" required>{(fid) => <Select id={fid} value={f.evolution} onChange={(v) => set('evolution', v)} placeholder="Seleccione…" options={Object.fromEntries(Object.entries(EVOLUTION_LABEL).filter(([k]) => wd.data!.assessments.length === 0 ? k === 'primera_valoracion' : k !== 'primera_valoracion'))} />}</Field>
          {(f.evolution === 'resuelta' || f.evolution === 'derivada') && (
            <label className="flex items-start gap-3 rounded-xl border-2 border-amber-400 p-3 font-semibold">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={f.closure_confirmed} onChange={(e) => set('closure_confirmed', e.target.checked)} />
              Confirmo clínicamente la {f.evolution === 'resuelta' ? 'resolución' : 'derivación'} de la lesión (la lesión se cerrará y no admitirá nuevas valoraciones).
            </label>
          )}
          <fieldset>
            <legend className="label">Intervenciones realizadas en esta valoración</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(INTERVENTION_LABEL) as InterventionType[]).filter((k) => k !== 'otra').map((k) => (
                <label key={k} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm dark:border-petrol-700">
                  <input type="checkbox" checked={f.interventions.includes(k)} onChange={() => toggle('interventions', k)} />{INTERVENTION_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>
          <Field label="Observaciones">{(fid) => <textarea id={fid} className="input min-h-[96px]" value={f.observations} onChange={(e) => set('observations', e.target.value)} />}</Field>
          {!['resuelta', 'derivada'].includes(f.evolution) && (
            <Field label="Próxima valoración programada" hint={`Sugerido según configuración: ${settings.default_reassessment_hours} h (ajustar a protocolo y condición clínica).`}>
              {(fid) => <input id={fid} type="datetime-local" className="input" value={f.next_due} onChange={(e) => set('next_due', e.target.value)} />}
            </Field>
          )}
        </div>
      </Card>

      <Card title="Asistencia e información disponible">
        <AiPanel quality={photo?.quality ?? null} professionalSummary={summary} category={f.pu_category || null} confirmed={f.confirmed}
          providerAvailable={settings.ai_assistance_enabled && (models.data ?? []).some((m) => m.validation_status === 'validado')} />
      </Card>

      <div className="sticky bottom-20 z-20 md:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-4 shadow-lg">
          <p className="flex-1 text-sm">Al confirmar, el registro queda firmado con su usuario y no podrá editarse (las correcciones se hacen por adenda).</p>
          <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Confirmar valoración'}</button>
        </div>
      </div>
    </div>
  );
}
