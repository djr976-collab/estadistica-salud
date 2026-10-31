'use client';
import { INSUFFICIENT_EVIDENCE_MESSAGE, PU_CATEGORIES } from '@/lib/clinical';
import type { PhotoQuality, PuCategory } from '@/lib/types';

/**
 * Panel de asistencia: distingue explícitamente las 4 fuentes de información.
 * Sin modelo validado, funciona en "valoración manual asistida" y NO simula resultados de IA.
 */
export function AiPanel({ quality, professionalSummary, category, confirmed, providerAvailable }: {
  quality: PhotoQuality | null; professionalSummary: string[]; category: PuCategory | null; confirmed: boolean; providerAvailable: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-violet-300 bg-violet-50 p-3 text-sm text-violet-950 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-50">
        <p className="font-bold">{providerAvailable ? 'Asistencia de IA disponible (modelo validado)' : 'Modo de valoración manual asistida'}</p>
        {!providerAvailable && <p>No hay un modelo de visión artificial con validación clínica y técnica aprobada por la institución. No se generan inferencias, probabilidades ni clasificaciones automáticas.</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Layer n="1" title="Características técnicas de la imagen" tag="Control heurístico local (no IA)">
          {quality ? <p>{quality.width}×{quality.height} px · brillo {quality.brightness} · nitidez {quality.sharpness}. {quality.acceptable ? 'Calidad técnica aceptable.' : quality.warnings.join(' ')}</p> : <p>Sin fotografía en esta valoración.</p>}
        </Layer>
        <Layer n="2" title="Información ingresada por el profesional" tag="Valoración presencial">
          {professionalSummary.length ? <ul className="list-disc pl-4">{professionalSummary.map((s) => <li key={s}>{s}</li>)}</ul> : <p>Aún sin datos.</p>}
        </Layer>
        <Layer n="3" title="Inferencias del modelo" tag={providerAvailable ? 'Sugerencia — requiere revisión' : 'No disponible'}>
          <p>{providerAvailable ? 'Solicite el análisis para obtener sugerencias sujetas a su confirmación.' : 'No disponible: no existe un modelo validado. La IA nunca sustituye el juicio clínico.'}</p>
        </Layer>
        <Layer n="4" title="Clasificación clínica confirmada" tag="Responsabilidad profesional">
          {category && confirmed ? <p className="font-bold">{PU_CATEGORIES[category].label}</p> : <p className="font-semibold">{INSUFFICIENT_EVIDENCE_MESSAGE}</p>}
        </Layer>
      </div>
    </div>
  );
}

function Layer({ n, title, tag, children }: { n: string; title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 text-sm dark:border-petrol-700">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-petrol-700 text-xs font-bold text-white">{n}</span>
        <b>{title}</b>
        <span className="chip bg-slate-100 text-slate-700 dark:bg-petrol-800 dark:text-slate-200">{tag}</span>
      </div>
      {children}
    </div>
  );
}
