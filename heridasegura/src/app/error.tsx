'use client';
import { useEffect } from 'react';
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  // No se registran datos clínicos: solo el identificador técnico del error.
  useEffect(() => { console.error('Error de interfaz', error.digest ?? error.name); }, [error]);
  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="h1">Ocurrió un error inesperado</h1>
      <p>No se guardaron cambios parciales. Puede reintentar; si el problema persiste, informe a la administración indicando la hora.</p>
      <button className="btn-primary" onClick={reset}>Reintentar</button>
    </div>
  );
}
