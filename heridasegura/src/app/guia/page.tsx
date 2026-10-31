'use client';
import { Card, Notice, PageHeader } from '@/components/ui';
import { PHOTO_GUIDE } from '@/components/PhotoCapture';
import { BRADEN_DIMENSIONS, DEVICE_RELATED_INFO, PU_CATEGORIES } from '@/lib/clinical';

export default function Guide() {
  return (
    <div className="space-y-4">
      <PageHeader title="Guía clínica y fotográfica" subtitle="Material de consulta rápida. No reemplaza guías vigentes ni protocolos institucionales." />
      <Notice tone="warn"><p>Síntesis de la clasificación internacional NPIAP/EPUAP/PPPIA de lesiones por presión. Verificar con la edición vigente de la Guía Internacional y el protocolo institucional. La IA nunca sustituye el juicio clínico.</p></Notice>
      <Card title="Clasificación de lesiones por presión">
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(PU_CATEGORIES).map(([k, c]) => (
            <div key={k} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-petrol-700">
              <p className="font-bold">{c.label}</p>
              <ul className="mt-1 list-disc pl-4">{c.criteria.map((x) => <li key={x}>{x}</li>)}</ul>
              {c.notes && <p className="mt-1 font-semibold text-petrol-800 dark:text-turq-200">{c.notes}</p>}
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm">{DEVICE_RELATED_INFO}</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
          <li><b>No usar estadificación inversa:</b> una LPP estadio 4 en cicatrización se documenta como «estadio 4 en cicatrización», no como estadio 3, 2 o 1.</li>
          <li>Los estadios se aplican solo a lesiones por presión: no a heridas quirúrgicas, úlceras vasculares, lesiones por humedad, desgarros cutáneos ni quemaduras.</li>
          <li>El estadio 1 exige comprobar eritema no blanqueable de forma presencial.</li>
        </ul>
      </Card>
      <Card title="Fotografía clínica estandarizada">
        <ol className="list-decimal space-y-1 pl-5 text-sm">{PHOTO_GUIDE.map((g) => <li key={g}>{g}</li>)}</ol>
      </Card>
      <Card title="Escala de Braden (6 dimensiones, 6–23 puntos)">
        <ul className="space-y-1 text-sm">{BRADEN_DIMENSIONS.map((d) => <li key={d.key}><b>{d.label}</b> (1–{d.max}): {d.options.join(' · ')}</li>)}</ul>
        <p className="mt-2 text-sm">Puntos de corte orientativos: ≤ 9 muy alto · 10–12 alto · 13–14 moderado · 15–18 leve · ≥ 19 sin riesgo según escala. Ajustar al protocolo institucional.</p>
      </Card>
      <Card title="Marco legal (verificar con el área legal)">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>Ley 25.326 de Protección de los Datos Personales: datos de salud como datos sensibles; finalidad, seguridad y confidencialidad.</li>
          <li>Ley 26.529 de Derechos del Paciente, Historia Clínica y Consentimiento Informado: integridad, inalterabilidad y confidencialidad del registro.</li>
          <li>Las fotografías clínicas forman parte del registro asistencial: uso exclusivo para la atención salvo autorización expresa.</li>
        </ul>
      </Card>
    </div>
  );
}
