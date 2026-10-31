'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { Card, ErrorBox, Notice, PageHeader, Segmented, Spinner, StatusPill, statusMeta } from '@/components/ui';
import { enc, useAsync, useIdParam } from '@/lib/use-async';
import { LOCATION_TYPE_LABEL } from '@/lib/clinical';
import type { DisplayStatus, LocationView } from '@/lib/types';

export default function SectorMap() {
  const id = useIdParam();
  const { repo, profile } = useApp();
  const [filter, setFilter] = useState<'todas' | DisplayStatus>('todas');
  const st = useAsync(() => repo.getStructure(), [repo]);
  const occ = useAsync(() => repo.getOccupancy(id), [repo, id]);
  const sector = st.data?.sectors.find((s) => s.id === id);
  const service = st.data?.services.find((s) => s.id === sector?.service_id);
  const authorized = profile?.role === 'admin' || profile?.sector_ids.includes(id);

  const rooms = useMemo(() => {
    if (!st.data || !occ.data) return [];
    const rs = st.data.rooms.filter((r) => r.sector_id === id && r.active).sort((a, b) => a.sort_order - b.sort_order);
    return rs.map((r) => ({ room: r, locs: occ.data!.filter((l) => l.room_id === r.id && l.active).sort((a, b) => a.sort_order - b.sort_order) }))
      .concat(occ.data.some((l) => !l.room_id && l.active) ? [{ room: { id: 'none', name: 'Sin habitación asignada', code: '', kind: 'area' as const, sector_id: id, sort_order: 9999, active: true }, locs: occ.data.filter((l) => !l.room_id && l.active) }] : []);
  }, [st.data, occ.data, id]);

  if (st.loading || occ.loading) return <Spinner />;
  if (st.error || occ.error) return <ErrorBox error={st.error ?? occ.error ?? ''} onRetry={() => { st.reload(); occ.reload(); }} />;
  if (!sector) return <ErrorBox error="Sector inexistente." />;

  const counts = (occ.data ?? []).filter((l) => l.active).reduce<Record<string, number>>((a, l) => ({ ...a, [l.display_status]: (a[l.display_status] ?? 0) + 1 }), {});

  return (
    <div>
      <PageHeader back="/servicios" title={sector.name} subtitle={<>{service?.name} · {(occ.data ?? []).filter((l) => l.active).length} ubicaciones</>} />
      {!authorized && <div className="mb-3"><Notice tone="info" icon="lock"><p>No tiene asignado este sector: puede ver la ocupación, pero no la identidad ni la ficha de los pacientes.</p></Notice></div>}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented label="Filtrar por estado" value={filter} onChange={setFilter} options={[
          ['todas', `Todas (${(occ.data ?? []).filter((l) => l.active).length})`], ['libre', `Libres (${counts.libre ?? 0})`],
          ['ocupada', `Ocupadas (${counts.ocupada ?? 0})`], ['bloqueada', `Bloqueadas (${counts.bloqueada ?? 0})`],
          ['fuera_servicio', `Fuera de servicio (${counts.fuera_servicio ?? 0})`],
        ]} />
      </div>
      <div className="mb-4 flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-300" aria-label="Referencias">
        {(Object.keys(statusMeta) as DisplayStatus[]).map((k) => <span key={k} className="flex items-center gap-1"><StatusPill status={k} /></span>)}
        <span className="flex items-center gap-1"><span className="chip border border-red-300 bg-red-50 text-red-900">▲ n</span> alertas</span>
        <span className="flex items-center gap-1"><span className="chip border border-amber-300 bg-amber-50 text-amber-950">◷ n</span> valoraciones pendientes</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {rooms.map(({ room, locs }) => {
          const shown = locs.filter((l) => filter === 'todas' || l.display_status === filter);
          if (!shown.length) return null;
          return (
            <Card key={room.id} title={room.kind === 'habitacion' ? `Habitación ${room.code}` : room.name}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {shown.map((l) => <BedTile key={l.id} l={l} />)}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function BedTile({ l }: { l: LocationView }) {
  const m = statusMeta[l.display_status];
  return (
    <Link href={`/camas/${enc(l.id)}`} aria-label={`${LOCATION_TYPE_LABEL[l.location_type]} ${l.code}: ${m.label}${l.patient ? `, ${l.patient.last_name}` : ''}`}
      className={`flex min-h-[112px] flex-col gap-1 rounded-xl border-2 p-3 transition hover:shadow-md ${m.cls}`}>
      <div className="flex items-start justify-between gap-1">
        <span className="font-mono text-lg font-bold">{l.code}</span>
        <span aria-hidden className="text-lg">{m.symbol}</span>
      </div>
      <span className="text-xs font-semibold">{m.label}{l.is_provisional_code && ' · cód. provisorio'}</span>
      {l.location_type !== 'cama_internacion' && <span className="text-xs">{LOCATION_TYPE_LABEL[l.location_type]}</span>}
      {l.patient && <span className="truncate text-sm font-semibold">{l.patient.last_name}</span>}
      {l.display_status === 'ocupada' && !l.patient && <span className="flex items-center gap-1 text-xs"><Icon name="lock" className="h-3 w-3" />Paciente de otro sector</span>}
      {l.status_reason && l.display_status !== 'ocupada' && <span className="line-clamp-2 text-xs">{l.status_reason}</span>}
      <div className="mt-auto flex flex-wrap gap-1">
        {!!l.alerts && <span className="chip border border-red-300 bg-red-50 text-red-900">▲ {l.alerts}</span>}
        {!!l.pending && <span className="chip border border-amber-300 bg-amber-50 text-amber-950" title="Valoraciones pendientes">◷ {l.pending}</span>}
      </div>
    </Link>
  );
}
