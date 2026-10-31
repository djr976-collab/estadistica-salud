'use client';
// Esquema corporal anterior/posterior con regiones seleccionables (incluye prominencias óseas frecuentes).
import { useState } from 'react';
import type { BodyView } from '@/lib/types';

interface Region { name: string; x: number; y: number; side?: 'derecha' | 'izquierda' | 'linea_media' }
// Coordenadas en % (x: izquierda→derecha de la imagen, y: arriba→abajo).
// Vista anterior: el lado derecho del paciente se ve a la izquierda de la imagen.
const ANTERIOR: Region[] = [
  { name: 'Frente / cara', x: 50, y: 3.5, side: 'linea_media' }, { name: 'Pabellón auricular', x: 41, y: 6, side: 'derecha' }, { name: 'Pabellón auricular', x: 59, y: 6, side: 'izquierda' },
  { name: 'Nariz / mucosa nasal', x: 50, y: 8.5, side: 'linea_media' }, { name: 'Mentón / cuello', x: 50, y: 12, side: 'linea_media' },
  { name: 'Hombro', x: 33, y: 18, side: 'derecha' }, { name: 'Hombro', x: 67, y: 18, side: 'izquierda' },
  { name: 'Tórax / esternón', x: 50, y: 24, side: 'linea_media' }, { name: 'Mama / región submamaria', x: 41, y: 26, side: 'derecha' }, { name: 'Mama / región submamaria', x: 59, y: 26, side: 'izquierda' },
  { name: 'Abdomen', x: 50, y: 36, side: 'linea_media' }, { name: 'Cresta ilíaca', x: 39, y: 42, side: 'derecha' }, { name: 'Cresta ilíaca', x: 61, y: 42, side: 'izquierda' },
  { name: 'Ingle / periné', x: 50, y: 48, side: 'linea_media' }, { name: 'Antebrazo / muñeca', x: 24, y: 42, side: 'derecha' }, { name: 'Antebrazo / muñeca', x: 76, y: 42, side: 'izquierda' },
  { name: 'Mano', x: 21, y: 50, side: 'derecha' }, { name: 'Mano', x: 79, y: 50, side: 'izquierda' },
  { name: 'Muslo', x: 43, y: 58, side: 'derecha' }, { name: 'Muslo', x: 57, y: 58, side: 'izquierda' },
  { name: 'Rodilla', x: 43, y: 69, side: 'derecha' }, { name: 'Rodilla', x: 57, y: 69, side: 'izquierda' },
  { name: 'Pierna (región tibial)', x: 43, y: 80, side: 'derecha' }, { name: 'Pierna (región tibial)', x: 57, y: 80, side: 'izquierda' },
  { name: 'Maléolo', x: 41, y: 90, side: 'derecha' }, { name: 'Maléolo', x: 59, y: 90, side: 'izquierda' },
  { name: 'Dorso del pie / dedos', x: 42, y: 96, side: 'derecha' }, { name: 'Dorso del pie / dedos', x: 58, y: 96, side: 'izquierda' },
];
// Vista posterior: el lado izquierdo del paciente se ve a la izquierda de la imagen.
const POSTERIOR: Region[] = [
  { name: 'Occipital', x: 50, y: 5, side: 'linea_media' }, { name: 'Nuca / cuello', x: 50, y: 12, side: 'linea_media' },
  { name: 'Escápula', x: 40, y: 22, side: 'izquierda' }, { name: 'Escápula', x: 60, y: 22, side: 'derecha' },
  { name: 'Columna dorsal / apófisis espinosas', x: 50, y: 30, side: 'linea_media' }, { name: 'Codo', x: 27, y: 34, side: 'izquierda' }, { name: 'Codo', x: 73, y: 34, side: 'derecha' },
  { name: 'Región lumbar', x: 50, y: 39, side: 'linea_media' }, { name: 'Sacro', x: 50, y: 44.5, side: 'linea_media' }, { name: 'Coxis', x: 50, y: 50, side: 'linea_media' },
  { name: 'Trocánter', x: 33, y: 48, side: 'izquierda' }, { name: 'Trocánter', x: 67, y: 48, side: 'derecha' },
  { name: 'Glúteo / isquion', x: 40, y: 54, side: 'izquierda' }, { name: 'Glúteo / isquion', x: 60, y: 54, side: 'derecha' },
  { name: 'Muslo posterior', x: 43, y: 60, side: 'izquierda' }, { name: 'Muslo posterior', x: 57, y: 60, side: 'derecha' },
  { name: 'Hueco poplíteo', x: 43, y: 69, side: 'izquierda' }, { name: 'Hueco poplíteo', x: 57, y: 69, side: 'derecha' },
  { name: 'Pantorrilla', x: 43, y: 79, side: 'izquierda' }, { name: 'Pantorrilla', x: 57, y: 79, side: 'derecha' },
  { name: 'Talón', x: 42, y: 96, side: 'izquierda' }, { name: 'Talón', x: 58, y: 96, side: 'derecha' },
];

export interface BodyPick { view: BodyView; region: string; x: number; y: number; side?: Region['side'] }

const SILHOUETTE = 'M50 1c4.5 0 7.5 3.4 7.5 7.6 0 3-1.4 5.4-3.4 6.6v1.3c5 .6 9.6 1.4 12.3 3.4 2.6 2 3.6 6.5 4.4 12.4l3 16c.5 2.6-2.8 3.3-3.6.9l-4.3-14.4-.9 10.9c-.3 4.1-.2 7.4.3 12.1l1.6 21.6c.4 5.3 0 9.6-.6 13.4l1.6 4.6c.5 1.6-.8 2.6-2.2 2.6h-6.5c-1.3 0-2-1.2-1.7-2.5l1-4.2c-.6-4.6-1.3-9.3-1.8-15.2l-1.8-19.2h-1.8l-1.8 19.2c-.5 5.9-1.2 10.6-1.8 15.2l1 4.2c.3 1.3-.4 2.5-1.7 2.5h-6.5c-1.4 0-2.7-1-2.2-2.6l1.6-4.6c-.6-3.8-1-8.1-.6-13.4L36 64.8c.5-4.7.6-8 .3-12.1l-.9-10.9-4.3 14.4c-.8 2.4-4.1 1.7-3.6-.9l3-16c.8-5.9 1.8-10.4 4.4-12.4 2.7-2 7.3-2.8 12.3-3.4v-1.3c-2-1.2-3.4-3.6-3.4-6.6C42.5 4.4 45.5 1 50 1z';

const sideTxt = (r: Region) => (r.side && r.side !== 'linea_media' ? ` ${r.side}` : '');

export function BodyMap({ value, onChange }: { value: BodyPick | null; onChange: (v: BodyPick) => void }) {
  const [view, setView] = useState<BodyView>(value?.view ?? 'posterior');
  const regions = view === 'anterior' ? ANTERIOR : POSTERIOR;
  const all = [...ANTERIOR.map((r) => ['anterior', r] as const), ...POSTERIOR.map((r) => ['posterior', r] as const)];
  const keyOf = (v: BodyView, r: Region) => `${v}|${r.name}|${r.side ?? ''}`;
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Vista corporal" className="grid grid-cols-2 gap-2">
        {(['anterior', 'posterior'] as BodyView[]).map((v) => (
          <button key={v} type="button" role="radio" aria-checked={view === v} onClick={() => setView(v)}
            className={`min-h-[44px] rounded-xl border font-semibold ${view === v ? 'border-petrol-700 bg-petrol-700 text-white dark:bg-turq-600' : 'border-slate-300 dark:border-petrol-700'}`}>
            {view === v && '✓ '}Vista {v}
          </button>
        ))}
      </div>
      <figure className="rounded-xl border border-slate-200 bg-slate-50 p-2 dark:border-petrol-700 dark:bg-petrol-950">
        <div className="relative mx-auto aspect-[1/2] w-full max-w-[300px]">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
            <path d={SILHOUETTE} className="fill-petrol-100 stroke-petrol-400 dark:fill-petrol-800 dark:stroke-petrol-500" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute left-0 top-0 text-xs font-semibold text-slate-500">{view === 'anterior' ? 'Derecha' : 'Izquierda'}</span>
          <span className="absolute right-0 top-0 text-xs font-semibold text-slate-500">{view === 'anterior' ? 'Izquierda' : 'Derecha'}</span>
          {regions.map((r, i) => {
            const on = value?.view === view && value.region === r.name && value.side === r.side;
            return (
              <button key={i} type="button" onClick={() => onChange({ view, region: r.name, x: r.x, y: r.y, side: r.side })}
                aria-pressed={on} aria-label={`${r.name}${sideTxt(r)} (${view})`} title={`${r.name}${sideTxt(r)}`}
                className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-[10px] font-bold ${on ? 'z-10 scale-125 border-red-800 bg-red-600 text-white' : 'border-petrol-500 bg-white/90 text-petrol-800 hover:bg-turq-200 dark:bg-petrol-900/90 dark:text-turq-200'}`}
                style={{ left: `${r.x}%`, top: `${r.y}%` }}>{on ? '✕' : ''}</button>
            );
          })}
        </div>
        <figcaption className="mt-1 text-center text-sm">{value ? <b>Seleccionado: {value.region}{value.side && value.side !== 'linea_media' ? ` ${value.side}` : ''} ({value.view})</b> : 'Toque un punto del esquema'}</figcaption>
      </figure>
      <div>
        <label htmlFor="bm-list" className="label">O seleccione de la lista</label>
        <select id="bm-list" className="input" value={value ? `${value.view}|${value.region}|${value.side ?? ''}` : ''}
          onChange={(e) => { const hit = all.find(([v, r]) => keyOf(v, r) === e.target.value); if (hit) { setView(hit[0]); onChange({ view: hit[0], region: hit[1].name, x: hit[1].x, y: hit[1].y, side: hit[1].side }); } }}>
          <option value="">Seleccione…</option>
          {all.map(([v, r]) => <option key={keyOf(v, r)} value={keyOf(v, r)}>{r.name}{sideTxt(r)} — {v}</option>)}
        </select>
      </div>
    </div>
  );
}

export function BodyMarker({ view, x, y }: { view: BodyView | null; x: number | null; y: number | null }) {
  if (!view || x == null || y == null) return null;
  return (
    <div className="relative mx-auto aspect-[1/2] w-24" aria-label={`Ubicación marcada en vista ${view}`} role="img">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        <path d={SILHOUETTE} className="fill-petrol-100 stroke-petrol-400 dark:fill-petrol-800" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      </svg>
      <span className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-red-600" style={{ left: `${x}%`, top: `${y}%` }} />
      <span className="absolute -bottom-5 w-full text-center text-[10px] text-slate-500">{view}</span>
    </div>
  );
}
