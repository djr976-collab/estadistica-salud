/* Service Worker de Guardia de Preguntas.
 * Este archivo es una plantilla: la compilación reemplaza la versión y la
 * lista de recursos (ver vite.config.ts). El progreso del juego vive en
 * IndexedDB y no se toca al actualizar la caché. */
const VERSION = '__VERSION__';
const CACHE = `gdp-${VERSION}`;
const ASSETS = __ASSETS__;

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map(scopeUrl))),
  );
  // No se usa skipWaiting automático: la app ofrece "Actualizar" y el
  // jugador decide cuándo, para no interrumpir una pregunta en curso.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('gdp-') && k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CHECK_OFFLINE') {
    const port = event.ports && event.ports[0];
    caches.open(CACHE).then(async (cache) => {
      const missing = [];
      for (const asset of ASSETS) {
        const hit = await cache.match(scopeUrl(asset), { ignoreVary: true });
        if (!hit) missing.push(asset);
      }
      const reply = { type: 'OFFLINE_STATUS', version: VERSION, total: ASSETS.length, missing };
      if (port) port.postMessage(reply);
    });
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    // Primero la caché: el juego debe abrir en modo avión.
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(scopeUrl('./'), { ignoreVary: true });
        if (cached) return cached;
        return fetch(req);
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // ignoreVary: los scripts de módulo se piden con encabezado Origin y muchos
      // servidores responden con «Vary: Origin»; sin esta opción la caché no coincide
      // y el juego queda en blanco en modo avión.
      const cached = await cache.match(req, { ignoreSearch: true, ignoreVary: true });
      if (cached) return cached;
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }),
  );
});
