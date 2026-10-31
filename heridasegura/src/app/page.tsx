'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { AlertChip, Card, Empty, ErrorBox, Notice, Spinner, Stat } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { buildWorklist } from '@/lib/worklist';
import { countsAsBed } from '@/lib/hospital-structure';
import { fullName } from '@/lib/clinical';

export default function Home() {
  const { repo, profile, settings } = useApp();
  const router = useRouter();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useAsync(() => repo.getIndicatorDataset(), [repo]);

  const mySectors = profile?.role === 'admin' ? null : profile?.sector_ids ?? [];
  const work = useMemo(() => (data ? buildWorklist(data, settings.braden_validity_hours, mySectors) : []), [data, settings, mySectors]);
  const sectors = useMemo(() => {
    if (!data) return [];
    const list = data.sectors.filter((s) => s.active && (!mySectors || mySectors.includes(s.id)));
    return list.map((s) => {
      const locs = data.locations.filter((l) => l.sector_id === s.id && l.active);
      const occ = new Set(data.assignments.filter((a) => !a.ended_at).map((a) => a.location_id));
      return { s, total: locs.length, beds: locs.filter((l) => countsAsBed(l.location_type)).length, occupied: locs.filter((l) => occ.has(l.id)).length };
    });
  }, [data, mySectors]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="h1">Hola, {profile?.full_name.split(' ')[0]}</h1>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); router.push(`/pacientes?q=${encodeURIComponent(q)}`); }} className="flex gap-2" role="search">
        <label htmlFor="home-q" className="sr-only">Buscar paciente</label>
        <input id="home-q" className="input flex-1" placeholder="Buscar por nombre, HC, habitación o cama…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn-primary" aria-label="Buscar"><Icon name="search" /></button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Link href="/servicios" className="btn-primary h-20 flex-col text-sm"><Icon name="bed" className="h-6 w-6" />Plano de camas</Link>
        <Link href="/pacientes" className="btn-secondary h-20 flex-col text-sm"><Icon name="users" className="h-6 w-6" />Pacientes</Link>
        <Link href="/pacientes/nuevo" className="btn-secondary h-20 flex-col text-sm"><Icon name="plus" className="h-6 w-6" />Nuevo paciente</Link>
        <Link href="/indicadores" className="btn-secondary h-20 flex-col text-sm"><Icon name="chart" className="h-6 w-6" />Indicadores</Link>
      </div>

      {repo.mode === 'demo' && (
        <Notice tone="warn"><p>Prototipo con <b>datos exclusivamente ficticios</b>. No registre información de pacientes reales hasta la evaluación y autorización institucional.</p></Notice>
      )}

      {loading && <Spinner />}
      {error && <ErrorBox error={error} onRetry={reload} />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Pacientes internados (visibles)" value={new Set(data.assignments.filter((a) => !a.ended_at).map((a) => a.patient_id)).size} />
            <Stat label="Lesiones activas" value={data.wounds.filter((w) => w.status === 'activa').length} />
            <Stat label="Alertas de prioridad alta" value={work.filter((w) => w.alert.level === 'alta').length} tone={work.some((w) => w.alert.level === 'alta') ? 'warn' : 'ok'} />
            <Stat label="Pendientes de Braden" value={work.filter((w) => w.alert.code === 'braden_pendiente').length} />
          </div>

          <Card title="Lista de trabajo — reevaluaciones sugeridas">
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">Las alertas son ayudas para la reevaluación profesional, no diagnósticos automáticos.</p>
            {work.length === 0 ? <Empty title="Sin alertas pendientes" icon="check" /> : (
              <ul className="divide-y divide-slate-100 dark:divide-petrol-800">
                {work.slice(0, 15).map((w, i) => (
                  <li key={i}>
                    <Link href={w.wound ? `/lesiones/${w.wound.id}` : `/pacientes/${w.patient.id}?tab=braden`} className="flex flex-wrap items-center gap-2 py-3 hover:bg-slate-50 dark:hover:bg-petrol-800">
                      <span className="w-20 shrink-0 font-mono text-sm font-bold text-petrol-700 dark:text-turq-300">{w.location?.code ?? '—'}</span>
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">{fullName(w.patient)}</span>
                        <span className="block text-sm text-slate-600 dark:text-slate-300">{w.wound ? `${w.wound.code} · ${w.wound.body_region}: ` : ''}{w.alert.message}</span>
                      </span>
                      <AlertChip level={w.alert.level}>{w.alert.level === 'alta' ? 'Prioridad alta' : 'Revisar'}</AlertChip>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title={mySectors ? 'Mis sectores' : 'Sectores'}>
            {sectors.length === 0 ? <Empty title="No tiene sectores asignados">Solicite a la administración la asignación de sectores.</Empty> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sectors.map(({ s, total, occupied }) => (
                  <Link key={s.id} href={`/sectores/${encodeURIComponent(s.id)}`} className="card flex items-center gap-3 p-4 hover:border-petrol-400">
                    <div className="flex-1">
                      <div className="font-bold">{s.name}</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300">{occupied} ocupadas de {total} ubicaciones</div>
                      <div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-petrol-800"><div className="h-2 rounded-full bg-turq-500" style={{ width: `${total ? (occupied / total) * 100 : 0}%` }} /></div>
                    </div>
                    <Icon name="chevron" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
