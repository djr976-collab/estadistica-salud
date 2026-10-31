'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { friendlyError } from './data/repo';

/** Carga asíncrona con estados de carga/error y reintento. */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const seq = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);
  const reload = useCallback(async () => {
    const n = ++seq.current;
    setLoading(true); setError(null);
    try {
      const r = await run();
      if (n === seq.current) setData(r);
    } catch (e) {
      if (n === seq.current) setError(friendlyError(e));
    } finally {
      if (n === seq.current) setLoading(false);
    }
  }, [run]);
  useEffect(() => { void reload(); }, [reload]);
  return { data, error, loading, reload, setData };
}

import { useParams } from 'next/navigation';
/** Parámetro de ruta decodificado (los IDs demo contienen ":"). */
export function useIdParam(name = 'id'): string {
  const p = useParams();
  const v = p[name];
  const s = Array.isArray(v) ? v[0] : v ?? '';
  try { return decodeURIComponent(s); } catch { return s; }
}
export const enc = (id: string) => encodeURIComponent(id);
