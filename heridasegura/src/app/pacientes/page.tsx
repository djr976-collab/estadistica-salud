'use client';
import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { Empty, ErrorBox, PageHeader, Select, Spinner, fmtDate } from '@/components/ui';
import { enc, useAsync } from '@/lib/use-async';
import { ageYears, fullName } from '@/lib/clinical';

function PatientsInner() {
  const { repo } = useApp();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [debounced, setDebounced] = useState(q);
  const [sector, setSector] = useState('');
  const [discharged, setDischarged] = useState(false);
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(t); }, [q]);
  const st = useAsync(() => repo.getStructure(), [repo]);
  const { data, error, loading, reload } = useAsync(() => repo.searchPatients(debounced, { sectorId: sector || null, includeDischarged: discharged }), [repo, debounced, sector, discharged]);

  return (
    <div>
      <PageHeader title="Pacientes" subtitle="Solo se muestran pacientes de los sectores autorizados" actions={<Link href="/pacientes/nuevo" className="btn-primary"><Icon name="plus" />Nuevo</Link>} />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_260px_auto]" role="search">
        <div>
          <label htmlFor="pq" className="sr-only">Buscar</label>
          <input id="pq" className="input" placeholder="Nombre, apellido, HC, habitación (30) o cama (30B)…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div>
          <label htmlFor="ps" className="sr-only">Sector</label>
          <Select id="ps" value={sector} onChange={setSector} placeholder="Todos los sectores" options={(st.data?.sectors ?? []).map((s) => [s.id, s.name])} />
        </div>
        <label className="flex min-h-[48px] items-center gap-2 text-sm font-semibold">
          <input type="checkbox" className="h-5 w-5" checked={discharged} onChange={(e) => setDischarged(e.target.checked)} />Incluir egresados
        </label>
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox error={error} onRetry={reload} />}
      {data && data.length === 0 && <Empty title="Sin resultados" icon="search">Verifique la búsqueda o registre un nuevo paciente.</Empty>}
      {data && data.length > 0 && (
        <ul className="grid gap-3 md:grid-cols-2">
          {data.map((p) => (
            <li key={p.id}>
              <Link href={`/pacientes/${enc(p.id)}`} className="card flex items-center gap-3 p-4 hover:border-petrol-400">
                <div className="flex h-14 w-16 shrink-0 flex-col items-center justify-center rounded-xl bg-petrol-100 text-petrol-900 dark:bg-petrol-800 dark:text-white">
                  <span className="font-mono text-lg font-bold leading-none">{p.location?.code ?? '—'}</span>
                  <span className="text-[10px]">{p.location ? p.location.sector?.code : p.admission?.discharged_at ? 'Egreso' : 'Sin cama'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{fullName(p)}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">HC <span className="font-mono">{p.mrn}</span>{ageYears(p.birth_date) != null && ` · ${ageYears(p.birth_date)} años`}</div>
                  <div className="text-xs text-slate-500">{p.admission ? (p.admission.discharged_at ? `Egreso ${fmtDate(p.admission.discharged_at)}` : `Ingreso ${fmtDate(p.admission.admitted_at)}`) : 'Sin internación registrada'}</div>
                </div>
                {p.active_wounds > 0 && <span className="chip border border-petrol-300 bg-petrol-50 text-petrol-900">{p.active_wounds} lesión(es)</span>}
                {p.is_fictitious && <span className="chip bg-amber-100 text-amber-900" title="Paciente ficticio">F</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PatientsPage() { return <Suspense fallback={<Spinner />}><PatientsInner /></Suspense>; }
