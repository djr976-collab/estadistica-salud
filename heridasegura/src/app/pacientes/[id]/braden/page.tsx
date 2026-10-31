'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Card, ErrorBox, Field, Notice, PageHeader, Spinner, fromLocalInput, toLocalInput } from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import { BRADEN_DIMENSIONS, BRADEN_RISK_LABEL, bradenRisk, bradenTotal, fullName, type BradenScores } from '@/lib/clinical';
import { friendlyError } from '@/lib/data/repo';

export default function BradenPage() {
  const id = useIdParam();
  const { repo, toast } = useApp();
  const router = useRouter();
  const det = useAsync(() => repo.getPatient(id), [repo, id]);
  const [s, setS] = useState<Partial<BradenScores>>({});
  const [at, setAt] = useState(toLocalInput(new Date()));
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const total = bradenTotal(s);

  if (det.loading) return <Spinner />;
  if (!det.data) return <ErrorBox error={det.error ?? 'Paciente no disponible.'} />;

  async function save() {
    if (total == null) return setErr('Complete las seis dimensiones.');
    setBusy(true); setErr(null);
    try {
      await repo.createBraden({ patient_id: id, assessed_at: fromLocalInput(at), notes: notes.trim() || null, ...(s as BradenScores) });
      toast(`Braden registrada: ${total} puntos.`);
      router.push(`/pacientes/${enc(id)}?tab=braden`);
    } catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <PageHeader back={`/pacientes/${enc(id)}?tab=braden`} title="Escala de Braden" subtitle={fullName(det.data.patient)} />
      {!det.data.admission && <Notice tone="warn"><p>El paciente no tiene internación activa: la valoración quedará sin episodio asociado.</p></Notice>}
      {BRADEN_DIMENSIONS.map((d) => (
        <Card key={d.key} title={d.label}>
          <div role="radiogroup" aria-label={d.label} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {d.options.map((label, i) => {
              const v = i + 1, on = s[d.key] === v;
              return (
                <button key={v} type="button" role="radio" aria-checked={on} onClick={() => setS({ ...s, [d.key]: v })}
                  className={`flex min-h-[56px] items-center gap-3 rounded-xl border-2 p-3 text-left ${on ? 'border-petrol-700 bg-petrol-50 dark:border-turq-400 dark:bg-petrol-800' : 'border-slate-200 hover:border-petrol-300 dark:border-petrol-700'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg font-bold ${on ? 'bg-petrol-700 text-white dark:bg-turq-500 dark:text-petrol-950' : 'bg-slate-100 dark:bg-petrol-900'}`}>{v}</span>
                  <span className="text-sm font-semibold">{label}</span>
                </button>
              );
            })}
          </div>
        </Card>
      ))}
      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha y hora" required>{(fid) => <input id={fid} type="datetime-local" className="input" value={at} max={toLocalInput(new Date())} onChange={(e) => setAt(e.target.value)} />}</Field>
          <Field label="Observaciones">{(fid) => <input id={fid} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} />}</Field>
        </div>
      </Card>
      <div className="sticky bottom-20 z-20 md:bottom-4">
        <div className="card flex flex-wrap items-center gap-3 p-4 shadow-lg">
          <div className="flex-1" aria-live="polite">
            <div className="text-sm text-slate-600 dark:text-slate-300">Puntaje total ({Object.keys(s).length}/6 dimensiones)</div>
            <div className="text-2xl font-bold">{total ?? '—'} {total != null && <span className="text-base font-semibold">· {BRADEN_RISK_LABEL[bradenRisk(total)]}</span>}</div>
          </div>
          <button className="btn-primary" disabled={busy || total == null} onClick={save}>{busy ? 'Guardando…' : 'Confirmar valoración'}</button>
        </div>
        {err && <div className="mt-2"><ErrorBox error={err} /></div>}
      </div>
      <p className="text-xs text-slate-500">Escala de Braden (Bergstrom y Braden). Puntos de corte orientativos; la interpretación y las medidas preventivas deben ajustarse al protocolo institucional y al juicio clínico.</p>
    </div>
  );
}
