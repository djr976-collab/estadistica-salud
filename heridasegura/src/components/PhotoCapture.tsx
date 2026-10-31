'use client';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { Field, Notice } from './ui';
import { analyzePixels, calibrate, pxToCm } from '@/lib/image-quality';
import type { PhotoQuality } from '@/lib/types';

export interface CapturedPhoto {
  original: File; edited: Blob | null; quality: PhotoQuality; width: number; height: number;
  has_scale_reference: boolean; px_per_cm: number | null; identifiers_excluded: boolean; taken_at: string;
}

type Pt = { x: number; y: number };
type Mode = 'none' | 'crop' | 'calibrate' | 'measure';

export const PHOTO_GUIDE = [
  'Solicite consentimiento/explique el procedimiento y preserve la intimidad del paciente.',
  'Encuadre SOLO la lesión y un margen de piel perilesional; excluya rostro, tatuajes, pulsera identificatoria, historia clínica y pantallas.',
  'Cámara paralela al plano de la herida (90°), a distancia constante entre tomas; sin zoom digital.',
  'Luz difusa homogénea; evite flash directo, sombras y reflejos. Fondo neutro (campo descartable).',
  'Para medir, ubique una regla/escala descartable en el MISMO plano de la herida, sin datos del paciente escritos.',
  'Misma posición del paciente y misma orientación en cada seguimiento (ej.: cabeza hacia arriba de la imagen).',
  'Use exclusivamente esta aplicación: no guarde fotografías en la galería ni en mensajería personal.',
];

async function loadImage(src: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(src);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(new Error('No se pudo leer la imagen.')); img.src = url; });
    return img;
  } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
}

function renderEdited(img: HTMLImageElement, rot: number, crop: { x: number; y: number; w: number; h: number } | null) {
  const rw = rot % 180 === 0 ? img.naturalWidth : img.naturalHeight;
  const rh = rot % 180 === 0 ? img.naturalHeight : img.naturalWidth;
  const rc = document.createElement('canvas'); rc.width = rw; rc.height = rh;
  const g = rc.getContext('2d')!;
  g.translate(rw / 2, rh / 2); g.rotate((rot * Math.PI) / 180); g.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  if (!crop) return rc;
  const c = document.createElement('canvas'); c.width = Math.round(crop.w); c.height = Math.round(crop.h);
  c.getContext('2d')!.drawImage(rc, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);
  return c;
}

function quality(canvas: HTMLCanvasElement): PhotoQuality {
  const s = Math.min(1, 256 / Math.max(canvas.width, canvas.height));
  const w = Math.max(8, Math.round(canvas.width * s)), h = Math.max(8, Math.round(canvas.height * s));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true })!; g.drawImage(canvas, 0, 0, w, h);
  return analyzePixels(g.getImageData(0, 0, w, h).data, w, h, canvas.width, canvas.height);
}

export function PhotoCapture({ onChange }: { onChange: (p: CapturedPhoto | null) => void }) {
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rot, setRot] = useState(0);
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [q, setQ] = useState<PhotoQuality | null>(null);
  const [mode, setMode] = useState<Mode>('none');
  const [pts, setPts] = useState<Pt[]>([]);
  const [hasScale, setHasScale] = useState(false);
  const [refCm, setRefCm] = useState('1');
  const [pxPerCm, setPxPerCm] = useState<number | null>(null);
  const [measure, setMeasure] = useState<number | null>(null);
  const [noIds, setNoIds] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(true);

  async function onFile(f: File | undefined) {
    setErr(null);
    if (!f) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) return setErr('Formato no admitido. Use JPG, PNG o WEBP (en iPhone, configure la cámara en "Más compatible").');
    if (f.size > 15 * 1024 * 1024) return setErr('La imagen supera 15 MB.');
    try {
      const i = await loadImage(f);
      setFile(f); setImg(i); setRot(0); setCrop(null); setPxPerCm(null); setMeasure(null); setPts([]); setMode('none'); setShowGuide(false);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error al leer la imagen'); }
  }

  // Re-render de la versión editada
  useEffect(() => {
    if (!img) return;
    const c = renderEdited(img, rot, crop);
    setCanvas(c); setQ(quality(c));
    let url: string | null = null;
    c.toBlob((b) => { if (b) { url = URL.createObjectURL(b); setPreview(url); } }, 'image/jpeg', 0.92);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [img, rot, crop]);

  // Emitir resultado
  useEffect(() => {
    if (!file || !canvas || !q) { onChange(null); return; }
    const edited = rot !== 0 || crop != null;
    const emit = (blob: Blob | null) => onChange({
      original: file, edited: blob, quality: q, width: canvas.width, height: canvas.height,
      has_scale_reference: hasScale, px_per_cm: hasScale ? pxPerCm : null, identifiers_excluded: noIds,
      taken_at: new Date(file.lastModified || Date.now()).toISOString(),
    });
    if (edited) canvas.toBlob((b) => emit(b), 'image/jpeg', 0.92); else emit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, canvas, q, hasScale, pxPerCm, noIds]);

  function onImgClick(e: React.MouseEvent<HTMLImageElement>) {
    if (mode === 'none' || !canvas) return;
    const r = e.currentTarget.getBoundingClientRect();
    const p = { x: ((e.clientX - r.left) / r.width) * canvas.width, y: ((e.clientY - r.top) / r.height) * canvas.height };
    const next = [...pts, p];
    if (next.length < 2) return setPts(next);
    const [a, b] = next;
    setPts([]);
    if (mode === 'crop') {
      const base = crop ?? { x: 0, y: 0 };
      const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      if (w < 50 || h < 50) { setErr('Recorte demasiado pequeño.'); setMode('none'); return; }
      setCrop({ x: base.x + Math.min(a.x, b.x), y: base.y + Math.min(a.y, b.y), w, h });
      setPxPerCm(null); setMeasure(null);
    } else if (mode === 'calibrate') {
      const k = calibrate(a, b, Number(refCm.replace(',', '.')));
      if (!k) setErr('Calibración inválida: marque los extremos de una longitud conocida de la escala (mínimo 20 px).');
      else { setPxPerCm(k); setErr(null); }
    } else if (mode === 'measure') {
      setMeasure(pxToCm(Math.hypot(b.x - a.x, b.y - a.y), pxPerCm));
    }
    setMode('none');
  }

  const modeHelp: Record<Mode, string> = {
    none: '', crop: 'Toque la esquina superior izquierda y luego la inferior derecha del área a conservar.',
    calibrate: `Toque los dos extremos de ${refCm} cm sobre la regla ubicada en el plano de la herida.`,
    measure: 'Toque los dos extremos de la longitud a medir.',
  };

  return (
    <div className="space-y-3">
      <button type="button" className="btn-ghost px-0 text-sm" onClick={() => setShowGuide(!showGuide)} aria-expanded={showGuide}>
        <Icon name="info" />Recomendaciones de fotografía estandarizada
      </button>
      {showGuide && <Notice tone="info"><ol className="list-decimal space-y-1 pl-4">{PHOTO_GUIDE.map((g) => <li key={g}>{g}</li>)}</ol></Notice>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-primary" onClick={() => camRef.current?.click()}><Icon name="camera" />Tomar foto</button>
        <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}><Icon name="plus" />Cargar imagen</button>
        <input ref={camRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
      {err && <p role="alert" className="text-sm font-semibold text-red-700">{err}</p>}

      {preview && canvas && (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-900 dark:border-petrol-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Vista previa de la fotografía clínica" onClick={onImgClick}
              className={`mx-auto max-h-[60vh] w-auto ${mode !== 'none' ? 'cursor-crosshair' : ''}`} />
            {mode !== 'none' && <div className="absolute inset-x-0 top-0 bg-petrol-900/90 p-2 text-center text-sm font-semibold text-white">{modeHelp[mode]} ({pts.length}/2)</div>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={() => { setRot((r) => (r + 90) % 360); setCrop(null); setPxPerCm(null); setMeasure(null); }}><Icon name="rotate" />Rotar 90°</button>
            <button type="button" className={mode === 'crop' ? 'btn-accent' : 'btn-secondary'} onClick={() => { setMode(mode === 'crop' ? 'none' : 'crop'); setPts([]); }}><Icon name="crop" />Recortar</button>
            {crop && <button type="button" className="btn-ghost" onClick={() => { setCrop(null); setPxPerCm(null); }}>Quitar recorte</button>}
          </div>

          {q && (
            <div className={`rounded-xl border p-3 text-sm ${q.acceptable ? 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-50' : 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50'}`}>
              <p className="font-bold">{q.acceptable ? '✓ Calidad técnica aceptable' : '⚠ Calidad técnica a revisar'} <span className="font-normal">(control heurístico local, no es IA)</span></p>
              <p>{q.width}×{q.height} px · brillo {q.brightness}/255 · nitidez {q.sharpness} · contraste {q.contrast}</p>
              {q.warnings.length > 0 && <ul className="mt-1 list-disc pl-5">{q.warnings.map((w) => <li key={w}>{w}</li>)}</ul>}
            </div>
          )}

          <div className="rounded-xl border border-slate-200 p-3 dark:border-petrol-700">
            <label className="flex min-h-[44px] items-center gap-3 font-semibold">
              <input type="checkbox" className="h-5 w-5" checked={hasScale} onChange={(e) => { setHasScale(e.target.checked); if (!e.target.checked) { setPxPerCm(null); setMeasure(null); } }} />
              La imagen incluye una referencia de escala válida en el plano de la herida
            </label>
            {hasScale && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="w-36"><Field label="Longitud de referencia (cm)">{(id) => <input id={id} className="input" inputMode="decimal" value={refCm} onChange={(e) => setRefCm(e.target.value)} />}</Field></div>
                  <button type="button" className={mode === 'calibrate' ? 'btn-accent' : 'btn-secondary'} onClick={() => { setMode('calibrate'); setPts([]); }}><Icon name="ruler" />Calibrar</button>
                  {pxPerCm && <button type="button" className={mode === 'measure' ? 'btn-accent' : 'btn-secondary'} onClick={() => { setMode('measure'); setPts([]); }}>Medir longitud</button>}
                </div>
                <p className="text-sm">{pxPerCm ? `Calibrado: ${pxPerCm.toFixed(1)} px/cm.` : 'Sin calibrar: no se mostrarán medidas en centímetros.'}{measure != null && <b> Longitud medida: {measure} cm.</b>}</p>
                <p className="hint">La medición fotográfica es una estimación bidimensional válida solo si la escala está en el mismo plano y la cámara es perpendicular. No estima profundidad. Registre las medidas definitivas en la valoración.</p>
              </div>
            )}
            {!hasScale && <p className="hint">Sin referencia de escala no se infieren centímetros a partir de la imagen.</p>}
          </div>

          <label className="flex min-h-[48px] items-start gap-3 rounded-xl border-2 border-petrol-300 p-3 font-semibold dark:border-petrol-600">
            <input type="checkbox" className="mt-1 h-5 w-5" checked={noIds} onChange={(e) => setNoIds(e.target.checked)} />
            Verifiqué que la imagen NO muestra rostro, pulsera identificatoria, documentos ni otros datos innecesarios.
          </label>
          <p className="text-xs text-slate-500">Se conserva el archivo original sin modificar; la versión rotada/recortada se guarda como derivada. Almacenamiento privado con acceso por sector.</p>
        </div>
      )}
    </div>
  );
}
