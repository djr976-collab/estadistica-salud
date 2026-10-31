'use client';
import { useEffect, useState } from 'react';
import { useApp } from './AppProvider';
import { Icon } from './Icon';
import { Modal, fmtDateTime } from './ui';
import type { WoundPhoto } from '@/lib/types';

/** Obtiene una URL temporal (firmada en Supabase) y la libera al desmontar. */
export function usePhotoUrl(photo: WoundPhoto | null | undefined) {
  const { repo } = useApp();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true, created: string | null = null;
    setUrl(null); setError(null);
    if (photo) repo.getPhotoUrl(photo).then((u) => { if (alive) { created = u; setUrl(u); } }).catch((e) => alive && setError(e instanceof Error ? e.message : 'Error'));
    return () => { alive = false; if (created?.startsWith('blob:')) URL.revokeObjectURL(created); };
  }, [photo, repo]);
  return { url, error };
}

export function PhotoThumb({ photo, onOpen, className = 'h-24 w-24' }: { photo: WoundPhoto; onOpen?: () => void; className?: string }) {
  const { url, error } = usePhotoUrl(photo);
  return (
    <button type="button" onClick={onOpen} className={`relative shrink-0 overflow-hidden rounded-xl border border-slate-300 bg-slate-200 dark:border-petrol-700 dark:bg-petrol-800 ${className}`} aria-label={`Ver fotografía del ${fmtDateTime(photo.taken_at)}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {url ? <img src={url} alt="" className="h-full w-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
        : <span className="flex h-full items-center justify-center p-1 text-center text-xs text-slate-500">{error ? 'No disponible' : 'Cargando…'}</span>}
      {photo.derived_from_id && <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">editada</span>}
    </button>
  );
}

export function PhotoViewer({ photo, onClose }: { photo: WoundPhoto | null; onClose: () => void }) {
  const { url, error } = usePhotoUrl(photo);
  const [zoom, setZoom] = useState(1);
  useEffect(() => setZoom(1), [photo]);
  if (!photo) return null;
  return (
    <Modal open onClose={onClose} title={`Fotografía · ${fmtDateTime(photo.taken_at)}`}
      footer={<div className="flex w-full flex-wrap items-center gap-2">
        <button className="btn-secondary" onClick={() => setZoom((z) => Math.max(1, z - 0.5))} aria-label="Alejar">−</button>
        <span className="tabular-nums">{Math.round(zoom * 100)} %</span>
        <button className="btn-secondary" onClick={() => setZoom((z) => Math.min(5, z + 0.5))} aria-label="Acercar"><Icon name="zoom" /></button>
        <span className="flex-1" />
        <button className="btn-primary" onClick={onClose}>Cerrar</button>
      </div>}>
      <div className="max-h-[60vh] overflow-auto rounded-xl bg-slate-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="Fotografía clínica de la lesión" style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} draggable={false} onContextMenu={(e) => e.preventDefault()} />
          : <p className="p-6 text-center text-white">{error ?? 'Cargando…'}</p>}
      </div>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div><dt className="text-slate-500">Región</dt><dd>{photo.body_region ?? '—'}</dd></div>
        <div><dt className="text-slate-500">Resolución</dt><dd>{photo.width_px ? `${photo.width_px}×${photo.height_px}` : 'original'}</dd></div>
        <div><dt className="text-slate-500">Escala</dt><dd>{photo.px_per_cm ? `Calibrada (${Number(photo.px_per_cm).toFixed(1)} px/cm)` : photo.has_scale_reference ? 'Referencia presente, sin calibrar' : 'Sin referencia'}</dd></div>
        <div><dt className="text-slate-500">Integridad (SHA-256)</dt><dd className="truncate font-mono text-xs" title={photo.sha256 ?? ''}>{photo.sha256?.slice(0, 16) ?? '—'}…</dd></div>
      </dl>
      <p className="text-xs text-slate-500">Acceso registrado en auditoría. Prohibida la descarga o difusión no autorizada.</p>
    </Modal>
  );
}

export { displayPhotos } from '@/lib/photos';
