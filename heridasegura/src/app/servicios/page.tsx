'use client';
import Link from 'next/link';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { Card, ErrorBox, PageHeader, Spinner } from '@/components/ui';
import { enc, useAsync } from '@/lib/use-async';
import { countsAsBed } from '@/lib/hospital-structure';
import { LOCATION_TYPE_LABEL } from '@/lib/clinical';

export default function ServicesPage() {
  const { repo, profile, settings } = useApp();
  const { data, error, loading, reload } = useAsync(() => repo.getStructure(), [repo]);
  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error ?? 'Error'} onRetry={reload} />;
  const services = data.services.filter((s) => s.active).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader title="Servicios y sectores" subtitle={`${settings.hospital_name} → Servicio → Sector → Habitación → Cama/Puesto`} />
      <div className="grid gap-4 md:grid-cols-2">
        {services.map((svc) => {
          const sectors = data.sectors.filter((s) => s.service_id === svc.id && s.active).sort((a, b) => a.sort_order - b.sort_order);
          return (
            <Card key={svc.id} title={svc.name}>
              {svc.notes && <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">{svc.notes}</p>}
              <ul className="space-y-2">
                {sectors.map((s) => {
                  const locs = data.locations.filter((l) => l.sector_id === s.id && l.active);
                  const types = [...new Set(locs.map((l) => l.location_type))];
                  const mine = profile?.role === 'admin' || profile?.sector_ids.includes(s.id);
                  return (
                    <li key={s.id}>
                      <Link href={`/sectores/${enc(s.id)}`} className="flex min-h-[64px] items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-petrol-400 hover:bg-petrol-50 dark:border-petrol-700 dark:hover:bg-petrol-800">
                        <div className="flex-1">
                          <div className="font-semibold">{s.name}</div>
                          <div className="text-sm text-slate-600 dark:text-slate-300">
                            {locs.filter((l) => countsAsBed(l.location_type)).length} camas/boxes
                            {locs.some((l) => !countsAsBed(l.location_type)) && ` · ${locs.filter((l) => !countsAsBed(l.location_type)).length} puestos no de internación`}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">{types.map((t) => LOCATION_TYPE_LABEL[t]).join(' · ')}</div>
                        </div>
                        {mine ? <span className="chip bg-turq-100 text-turq-700">Autorizado</span> : <span className="chip bg-slate-100 text-slate-600"><Icon name="lock" className="h-3 w-3" />Solo ocupación</span>}
                        <Icon name="chevron" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
