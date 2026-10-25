// Registro del Service Worker y verificación REAL de la preparación offline:
// se pregunta al Service Worker si cada recurso de la lista está en caché.

export type OfflineStatus =
  | { state: 'unsupported' }
  | { state: 'dev' }
  | { state: 'preparing' }
  | { state: 'ready'; version: string; total: number }
  | { state: 'incomplete'; version: string; missing: number; total: number }
  | { state: 'failed'; message: string };

export interface PwaController {
  update(): void;
  applyUpdate(): void;
}

type Listener = (s: OfflineStatus, updateAvailable: boolean) => void;

function askStatus(sw: ServiceWorker): Promise<{ version: string; total: number; missing: string[] }> {
  return new Promise((resolve, reject) => {
    const ch = new MessageChannel();
    const timer = setTimeout(() => reject(new Error('Sin respuesta del Service Worker')), 8000);
    ch.port1.onmessage = (e) => {
      clearTimeout(timer);
      resolve(e.data);
    };
    sw.postMessage({ type: 'CHECK_OFFLINE' }, [ch.port2]);
  });
}

export function registerPwa(onChange: Listener): PwaController {
  const noop: PwaController = { update() {}, applyUpdate() {} };
  if (import.meta.env.DEV) {
    onChange({ state: 'dev' }, false);
    return noop;
  }
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    onChange({ state: 'unsupported' }, false);
    return noop;
  }

  let reg: ServiceWorkerRegistration | null = null;
  let updateAvailable = false;
  let last: OfflineStatus = { state: 'preparing' };
  const emit = (s: OfflineStatus = last) => {
    last = s;
    onChange(s, updateAvailable);
  };

  const check = async () => {
    const active = reg?.active;
    if (!active) return;
    try {
      const r = await askStatus(active);
      if (r.missing.length === 0) emit({ state: 'ready', version: r.version, total: r.total });
      else emit({ state: 'incomplete', version: r.version, missing: r.missing.length, total: r.total });
    } catch (e) {
      emit({ state: 'failed', message: (e as Error).message });
    }
  };

  const track = (sw: ServiceWorker | null) => {
    if (!sw) return;
    sw.addEventListener('statechange', () => {
      if (sw.state === 'redundant' && !reg?.active) {
        emit({ state: 'failed', message: 'No se pudieron descargar todos los recursos. Revisá la conexión y reintentá.' });
      }
      if (sw.state === 'installed' && navigator.serviceWorker.controller) {
        updateAvailable = true;
        emit();
      }
      if (sw.state === 'activated') void check();
    });
  };

  emit({ state: 'preparing' });
  navigator.serviceWorker
    .register('./sw.js', { scope: './' })
    .then((r) => {
      reg = r;
      if (r.waiting && navigator.serviceWorker.controller) {
        updateAvailable = true;
        emit();
      }
      track(r.installing);
      r.addEventListener('updatefound', () => track(r.installing));
      if (r.active) void check();
    })
    .catch((e: Error) => emit({ state: 'failed', message: e.message }));

  // Solo se recarga cuando el jugador pidió actualizar. En la primera
  // instalación el Service Worker también toma el control (clients.claim) y
  // recargar en ese momento interrumpiría una pregunta en curso.
  let updateRequested = false;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!updateRequested || reloading) {
      void check();
      return;
    }
    reloading = true;
    window.location.reload();
  });

  return {
    update() {
      emit({ state: 'preparing' });
      reg?.update().then(() => (reg?.installing ? track(reg.installing) : check())).catch(() => check());
    },
    applyUpdate() {
      if (!reg?.waiting) return;
      updateRequested = true;
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    },
  };
}
