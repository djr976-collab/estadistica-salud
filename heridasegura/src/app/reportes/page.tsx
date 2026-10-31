'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { Icon } from '@/components/Icon';
import { Card, ErrorBox, Field, Notice, PageHeader, Select, Spinner } from '@/components/ui';
import { enc, useAsync } from '@/lib/use-async';
import { BRADEN_RISK_LABEL, ETIOLOGY_LABEL, POA_LABEL, PU_CATEGORIES, bradenRisk, fullName, woundAlerts } from '@/lib/clinical';
import { exportTablePdf } from '@/lib/export/pdf';
import { exportAnonymizedExcel } from '@/lib/export/excel';
import { friendlyError } from '@/lib/data/repo';

export default function ReportsPage() {
  const { repo, settings, profile, toast } = useApp();
  const { data, error, loading, reload } = useAsync(() => repo.getIndicatorDataset(), [repo]);
  const [sector, setSector] = useState('');
  const [patient, setPatient] = useState('');

  const current = useMemo(() => {
    if (!data) return [];
    return data.assignments.filter((a) => !a.ended_at).map((a) => {
      const l = data.locations.find((x) => x.id === a.location_id)!;
      return { a, l, p: data.patients.find((p) => p.id === a.patient_id)! };
    }).filter((x) => x.p && (!sector || x.l.sector_id === sector)).sort((x, y) => x.l.sort_order - y.l.sort_order);
  }, [data, sector]);

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorBox error={error ?? 'Error'} onRetry={reload} />;
  const sectorName = sector ? data.sectors.find((s) => s.id === sector)?.name ?? '' : 'Todos los sectores autorizados';

  async function woundsBySector() {
    const rows: (string | number)[][] = [];
    for (const { l, p } of current) {
      for (const w of data!.wounds.filter((x) => x.patient_id === p.id && x.status === 'activa')) {
        const as = data!.assessments.filter((x) => x.wound_id === w.id).sort((x, y) => x.assessed_at.localeCompare(y.assessed_at));
        rows.push([l.code, fullName(p), w.code, ETIOLOGY_LABEL[w.etiology], w.body_region, POA_LABEL[w.present_on_admission],
          w.current_pu_category ? PU_CATEGORIES[w.current_pu_category].short : '—', as.at(-1) ? new Date(as.at(-1)!.assessed_at).toLocaleDateString('es-AR') : 'Sin valorar',
          woundAlerts(w, as).map((x) => x.code).join(', ') || '—']);
      }
    }
    await exportTablePdf('Reporte de lesiones por sector', sectorName, ['Cama', 'Paciente', 'Lesión', 'Etiología', 'Localización', 'Origen', 'Categoría', 'Últ. valoración', 'Alertas'], rows, settings,
      'Alertas: ayudas para la reevaluación, no diagnósticos.');
    void repo.logAccess('REPORT', 'wounds', null, { type: 'lesiones_por_sector', sector });
  }

  async function bradenSummary() {
    const rows = current.map(({ a, l, p }) => {
      const b = data!.braden.filter((x) => x.patient_id === p.id && x.admission_id === a.admission_id).sort((x, y) => y.assessed_at.localeCompare(x.assessed_at))[0];
      const hours = b ? Math.round((Date.now() - new Date(b.assessed_at).getTime()) / 3_600_000) : null;
      return [l.code, fullName(p), b ? b.total : 'Pendiente', b ? BRADEN_RISK_LABEL[bradenRisk(b.total)] : '—', b ? new Date(b.assessed_at).toLocaleString('es-AR') : '—', hours != null ? (hours > settings.braden_validity_hours ? `Vencida (${hours} h)` : 'Vigente') : '—'];
    });
    await exportTablePdf('Resumen de riesgo según Braden', sectorName, ['Cama', 'Paciente', 'Total', 'Riesgo', 'Fecha', 'Vigencia'], rows, settings,
      `Vigencia según configuración institucional: ${settings.braden_validity_hours} h. Puntos de corte orientativos.`);
    void repo.logAccess('REPORT', 'braden_assessments', null, { type: 'resumen_braden', sector });
  }

  const patientWounds = data.wounds.filter((w) => w.patient_id === patient);

  return (
    <div className="space-y-4">
      <PageHeader title="Reportes" subtitle="Informes clínicos y de gestión. Toda exportación queda registrada en auditoría." />
      <Card title="Reportes por sector">
        <div className="space-y-3">
          <Field label="Sector">{(id) => <Select id={id} value={sector} onChange={setSector} placeholder="Todos los sectores autorizados" options={data.sectors.map((s) => [s.id, s.name])} />}</Field>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => woundsBySector().catch((e) => toast(friendlyError(e), 'error'))}><Icon name="download" />Lesiones por sector (PDF)</button>
            <button className="btn-secondary" onClick={() => bradenSummary().catch((e) => toast(friendlyError(e), 'error'))}><Icon name="download" />Resumen de riesgo Braden (PDF)</button>
            <Link href="/indicadores" className="btn-secondary"><Icon name="chart" />Indicadores de calidad (PDF/Excel)</Link>
          </div>
        </div>
      </Card>

      <Card title="Informe clínico individual / evolución fotográfica">
        <div className="space-y-3">
          <Field label="Paciente">{(id) => <Select id={id} value={patient} onChange={setPatient} placeholder="Seleccione…" options={data.patients.map((p) => [p.id, `${fullName(p)} · ${p.mrn}`])} />}</Field>
          {patient && (
            <ul className="space-y-2">
              <li><Link className="btn-ghost" href={`/pacientes/${enc(patient)}`}>Ficha del paciente (botón PDF: informe por paciente)</Link></li>
              {patientWounds.map((w) => <li key={w.id}><Link className="btn-ghost" href={`/lesiones/${enc(w.id)}`}>{w.code} · {w.body_region} (botón PDF: informe de lesión con evolución fotográfica)</Link></li>)}
            </ul>
          )}
        </div>
      </Card>

      {(profile?.role === 'admin' || profile?.role === 'supervisor') && (
        <Card title="Exportación anonimizada (docencia / investigación)">
          <Notice tone="warn">
            <p>Excluye nombre, HC, fecha de nacimiento, textos libres y fotografías; usa seudónimos aleatorios y días relativos al ingreso.</p>
            <p>Antes de difundir: evaluar riesgo de reidentificación (celdas pequeñas) y obtener el aval institucional / Comité de Ética.</p>
          </Notice>
          <button className="btn-secondary mt-3" onClick={async () => {
            try { await exportAnonymizedExcel(data); void repo.logAccess('EXPORT', null, null, { type: 'anonimizada' }); toast('Exportación anonimizada generada.'); }
            catch (e) { toast(friendlyError(e), 'error'); }
          }}><Icon name="download" />Exportar Excel anonimizado</button>
        </Card>
      )}
    </div>
  );
}
