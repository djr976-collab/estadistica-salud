'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { PhotoViewer, displayPhotos, usePhotoUrl } from '@/components/Photo';
import { Card, Empty, ErrorBox, Field, Notice, PageHeader, Select, Spinner, fmtDateTime } from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import { EVOLUTION_LABEL, areaCm2, fullName, measurementsComparable } from '@/lib/clinical';
import type { WoundAssessment, WoundPhoto } from '@/lib/types';

export default function ComparePage() {
  const id = useIdParam();
  const { repo } = useApp();
  const { data, error, loading, reload } = useAsync(() => repo.getWound(id), [repo, id]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [viewer, setViewer] = useState<WoundPhoto | null>(null);
  const photos = data ? displayPhotos(data.photos) : [];
  useEffect(() => {
    if (photos.length >= 2 && !a && !b) { setA(photos[0].id); setB(photos[photos.length - 1].id); }
  }, [photos, a, b]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error ?? 'No disponible'} onRetry={reload} />;
  const pa = photos.find((p) => p.id === a), pb = photos.find((p) => p.id === b);
  const asA = data.assessments.find((x) => x.id === pa?.assessment_id), asB = data.assessments.find((x) => x.id === pb?.assessment_id);
  const opts = photos.map((p) => [p.id, fmtDateTime(p.taken_at)] as [string, string]);

  return (
    <div className="space-y-4">
      <PageHeader back={`/lesiones/${enc(id)}`} title="Comparación fotográfica" subtitle={`${data.wound.code} · ${data.wound.body_region} · ${fullName(data.patient)}`} />
      {photos.length < 2 ? <Empty title="Se necesitan al menos dos fotografías" icon="camera" /> : (
        <>
          <Notice tone="info"><p>La comparación visual depende de condiciones de toma equivalentes (distancia, ángulo, luz). Las diferencias aparentes deben confirmarse con la valoración clínica y mediciones comparables.</p></Notice>
          <div className="grid gap-3 md:grid-cols-2">
            <Side label="Imagen A" value={a} onChange={setA} opts={opts} photo={pa} assessment={asA} onOpen={setViewer} />
            <Side label="Imagen B" value={b} onChange={setB} opts={opts} photo={pb} assessment={asB} onOpen={setViewer} />
          </div>
          {asA && asB && (
            <Card title="Diferencias documentadas">
              {measurementsComparable(asA, asB)
                ? <p>Superficie: {areaCm2(asA)} → {areaCm2(asB)} cm² ({Math.round(((areaCm2(asB)! - areaCm2(asA)!) / areaCm2(asA)!) * 100)} %), mediciones comparables ({asA.measurement_method === 'regla_milimetrada' ? 'regla' : 'foto calibrada'}).</p>
                : <p className="text-amber-800 dark:text-amber-300">Mediciones no comparables (método distinto o no medido).</p>}
              <p className="mt-1">Evolución documentada en B: <b>{EVOLUTION_LABEL[asB.evolution]}</b>.</p>
            </Card>
          )}
        </>
      )}
      <PhotoViewer photo={viewer} onClose={() => setViewer(null)} />
    </div>
  );
}

function Side({ label, value, onChange, opts, photo, assessment, onOpen }: {
  label: string; value: string; onChange: (v: string) => void; opts: [string, string][]; photo?: WoundPhoto; assessment?: WoundAssessment; onOpen: (p: WoundPhoto) => void;
}) {
  const { url } = usePhotoUrl(photo);
  return (
    <Card>
      <Field label={label}>{(fid) => <Select id={fid} value={value} onChange={onChange} options={opts} />}</Field>
      <button type="button" className="mt-3 block aspect-square w-full overflow-hidden rounded-xl bg-slate-900" onClick={() => photo && onOpen(photo)} aria-label="Ampliar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt={`${label}: fotografía del ${photo ? fmtDateTime(photo.taken_at) : ''}`} className="h-full w-full object-contain" draggable={false} /> : <span className="text-white">Cargando…</span>}
      </button>
      {assessment && <p className="mt-2 text-sm">{assessment.measurement_method !== 'no_medible' ? `${assessment.length_cm} × ${assessment.width_cm} cm` : 'Sin medición'} · {EVOLUTION_LABEL[assessment.evolution]}</p>}
    </Card>
  );
}
