'use client';
import { useMemo, useState } from 'react';
import { useApp } from '@/components/AppProvider';
import { BarList } from '@/components/Charts';
import { Icon } from '@/components/Icon';
import { Card, ErrorBox, Field, Notice, PageHeader, Select, Spinner, Stat } from '@/components/ui';
import { useAsync } from '@/lib/use-async';
import { computeIndicators, type Ratio } from '@/lib/indicators';
import { ETIOLOGY_LABEL, EVOLUTION_LABEL, PU_CATEGORIES } from '@/lib/clinical';
import { exportIndicatorsPdf } from '@/lib/export/pdf';
import { exportIndicatorsExcel } from '@/lib/export/excel';

const day = (d: Date) => d.toISOString().slice(0, 10);
const fmt = (r: Ratio) => (r.pct == null ? '—' : `${r.pct} %`);

export default function IndicatorsPage() {
  const { repo, settings, toast } = useApp();
  const { data, error, loading, reload } = useAsync(() => repo.getIndicatorDataset(), [repo]);
  const [service, setService] = useState('');
  const [sector, setSector] = useState('');
  const [from, setFrom] = useState(day(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(day(new Date()));
  const [onlyBeds, setOnlyBeds] = useState(true);

  const filter = useMemo(() => ({
    serviceId: service || null, sectorId: sector || null, from: new Date(from + 'T00:00:00'), to: new Date(to + 'T23:59:59'),
    onlyInpatientBeds: onlyBeds, braderValidityHours: settings.braden_validity_hours,
  }), [service, sector, from, to, onlyBeds, settings.braden_validity_hours]);
  const r = useMemo(() => (data ? computeIndicators(data, filter) : null), [data, filter]);
  const scope = data ? (sector ? data.sectors.find((s) => s.id === sector)?.name : service ? data.services.find((s) => s.id === service)?.name : 'Hospital (sectores autorizados)') ?? '' : '';

  if (loading) return <Spinner />;
  if (error || !data || !r) return <ErrorBox error={error ?? 'Error'} onRetry={reload} />;
  const stageLabels = Object.fromEntries([...Object.entries(PU_CATEGORIES).map(([k, v]) => [k, v.short + ' · ' + v.label.split(' — ')[0]]), ['sin_clasificar', 'Sin categoría confirmada']]);
  const totalLpp = Object.values(r.byStage).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <PageHeader title="Indicadores de calidad" subtitle="Lesiones por presión y seguimiento de heridas"
        actions={<>
          <button className="btn-secondary" onClick={async () => { await exportIndicatorsPdf(r, filter, scope, settings); void repo.logAccess('EXPORT', 'indicators', null, { format: 'pdf' }); toast('PDF generado.'); }}><Icon name="download" />PDF</button>
          <button className="btn-secondary" onClick={async () => { await exportIndicatorsExcel(r, filter, scope); void repo.logAccess('EXPORT', 'indicators', null, { format: 'xlsx' }); toast('Excel generado.'); }}><Icon name="download" />Excel</button>
        </>} />

      <Card title="Filtros">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Servicio">{(id) => <Select id={id} value={service} onChange={(v) => { setService(v); setSector(''); }} placeholder="Todos" options={data.services.map((s) => [s.id, s.name])} />}</Field>
          <Field label="Sector">{(id) => <Select id={id} value={sector} onChange={setSector} placeholder="Todos" options={data.sectors.filter((s) => !service || s.service_id === service).map((s) => [s.id, s.name])} />}</Field>
          <Field label="Desde">{(id) => <input id={id} type="date" className="input" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />}</Field>
          <Field label="Hasta (fecha de corte)">{(id) => <input id={id} type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />}</Field>
          <label className="flex min-h-[48px] items-center gap-2 self-end text-sm font-semibold"><input type="checkbox" className="h-5 w-5" checked={onlyBeds} onChange={(e) => setOnlyBeds(e.target.checked)} />Solo camas de internación</label>
        </div>
        <p className="hint mt-2">Camas de internación incluye camas de sala, camas y boxes de UTI y camas coronarias. Excluye shockroom, observación y camillas.</p>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pacientes internados (actual)" value={r.census} sub={`${r.locationsInScope.occupied} ocupadas / ${r.locationsInScope.beds} camas${r.locationsInScope.nonBeds ? ` + ${r.locationsInScope.nonBeds} puestos` : ''}`} />
        <Stat label="Prevalencia puntual de LPP" value={fmt(r.prevalence)} sub={`${r.prevalence.num} / ${r.prevalence.den} pacientes internados al ${new Date(to).toLocaleDateString('es-AR')}`} />
        <Stat label="Incidencia acumulada LPP adquirida" value={fmt(r.cumulativeIncidence)} sub={`${r.cumulativeIncidence.num} / ${r.cumulativeIncidence.den} episodios en riesgo en el período`} />
        <Stat label="Densidad de incidencia" value={r.incidenceDensity.per1000 ?? '—'} sub={`LPP adquiridas por 1000 pacientes-día (${r.incidenceDensity.cases} / ${r.incidenceDensity.patientDays} pac-día)`} />
        <Stat label="Prevalencia de LPP adquirida" value={fmt(r.prevalenceAcquired)} sub={`${r.prevalenceAcquired.num} / ${r.prevalenceAcquired.den}`} />
        <Stat label="Pacientes con Braden en el episodio" value={fmt(r.bradenCoverage)} sub={`${r.bradenCoverage.num} / ${r.bradenCoverage.den} · ${r.pendingBraden} pendientes`} tone={r.pendingBraden ? 'warn' : 'ok'} />
        <Stat label={`Braden vigente (≤ ${settings.braden_validity_hours} h)`} value={fmt(r.bradenCurrent)} sub={`${r.bradenCurrent.num} / ${r.bradenCurrent.den}`} />
        <Stat label="Cumplimiento de seguimientos programados" value={fmt(r.followUpCompliance)} sub={`${r.followUpCompliance.num} / ${r.followUpCompliance.den} a tiempo · ${r.overdueFollowUps} vencidos hoy`} tone={r.overdueFollowUps ? 'warn' : 'ok'} />
      </div>

      <Notice tone="warn">
        <p className="font-bold">Advertencias metodológicas</p>
        <ul className="list-disc pl-5">{r.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      </Notice>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="LPP activas por categoría (vigente)"><BarList data={r.byStage} labels={stageLabels} total={totalLpp} /></Card>
        <Card title="LPP activas por localización anatómica"><BarList data={r.byRegion} total={totalLpp} /></Card>
        <Card title="LPP activas según origen"><BarList data={{ 'Presentes al ingreso': r.byOrigin.presente_ingreso, 'Adquiridas en internación': r.byOrigin.adquirida, 'Sin dato verificable': r.byOrigin.sin_dato }} total={totalLpp} /></Card>
        <Card title="Lesiones activas por etiología"><BarList data={r.byEtiology} labels={ETIOLOGY_LABEL} /></Card>
        <Card title="Evolución (última valoración de lesiones activas)"><BarList data={r.latestEvolution} labels={{ ...EVOLUTION_LABEL, sin_valoracion: 'Sin valoración' }} /></Card>
        <Card title="Comparación por sector">
          {r.bySector.length === 0 ? <p className="text-sm text-slate-500">Sin lesiones activas.</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500"><th className="py-2">Sector</th><th className="text-right">Lesiones activas</th><th className="text-right">LPP</th></tr></thead>
              <tbody>{r.bySector.map((s) => <tr key={s.sectorId} className="border-t border-slate-100 dark:border-petrol-800"><td className="py-2">{s.name}</td><td className="text-right font-bold">{s.active}</td><td className="text-right">{s.lpp}</td></tr>)}</tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Definiciones operativas">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><b>Prevalencia puntual:</b> pacientes con ≥ 1 LPP activa en la fecha de corte ÷ pacientes internados en esa fecha (en el alcance filtrado).</li>
          <li><b>Incidencia acumulada:</b> episodios con ≥ 1 LPP adquirida (no presente al ingreso) detectada en el período ÷ episodios internados en el período sin LPP presente al ingreso.</li>
          <li><b>Densidad de incidencia:</b> LPP adquiridas detectadas en el período ÷ pacientes-día en el período × 1000.</li>
          <li>La lesión se atribuye al sector en el que se encontraba el paciente al momento de la detección.</li>
          <li>Definiciones a validar por Epidemiología / Calidad institucional antes de su uso oficial.</li>
        </ul>
      </Card>
    </div>
  );
}
