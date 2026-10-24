// Guardado local. Primero IndexedDB; si no está disponible, localStorage; si
// tampoco, memoria (y la interfaz avisa que el progreso no se conservará).

export type StorageKind = 'indexeddb' | 'localstorage' | 'memory';

export interface KeyValueStore {
  kind: StorageKind;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
}

const DB_NAME = 'guardia-de-preguntas';
const STORE = 'kv';
const LS_PREFIX = 'gdp:';

function requestToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function openIndexedDb(factory: IDBFactory): Promise<KeyValueStore> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = factory.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
  });
  const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
  const done = (t: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  return {
    kind: 'indexeddb',
    async get<T>(key: string) {
      return (await requestToPromise(tx('readonly').get(key))) as T | undefined;
    },
    async set<T>(key: string, value: T) {
      const store = tx('readwrite');
      store.put(value, key);
      await done(store.transaction);
    },
    async remove(key: string) {
      const store = tx('readwrite');
      store.delete(key);
      await done(store.transaction);
    },
  };
}

function localStorageStore(ls: Storage): KeyValueStore {
  return {
    kind: 'localstorage',
    async get<T>(key: string) {
      const raw = ls.getItem(LS_PREFIX + key);
      return raw === null ? undefined : (JSON.parse(raw) as T);
    },
    async set<T>(key: string, value: T) {
      ls.setItem(LS_PREFIX + key, JSON.stringify(value));
    },
    async remove(key: string) {
      ls.removeItem(LS_PREFIX + key);
    },
  };
}

export function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return {
    kind: 'memory',
    async get<T>(key: string) {
      const raw = m.get(key);
      return raw === undefined ? undefined : (JSON.parse(raw) as T);
    },
    async set<T>(key: string, value: T) {
      m.set(key, JSON.stringify(value));
    },
    async remove(key: string) {
      m.delete(key);
    },
  };
}

/** Prueba real de escritura y lectura: algunos navegadores exponen la API pero la bloquean. */
async function probe(store: KeyValueStore): Promise<boolean> {
  try {
    const token = `ok-${Date.now()}`;
    await store.set('__probe__', token);
    const back = await store.get<string>('__probe__');
    await store.remove('__probe__');
    return back === token;
  } catch {
    return false;
  }
}

export async function openBestStore(env: { indexedDB?: IDBFactory; localStorage?: Storage } = globalThis): Promise<KeyValueStore> {
  try {
    if (env.indexedDB) {
      const s = await openIndexedDb(env.indexedDB);
      if (await probe(s)) return s;
    }
  } catch {
    /* se intenta la siguiente opción */
  }
  try {
    if (env.localStorage) {
      const s = localStorageStore(env.localStorage);
      if (await probe(s)) return s;
    }
  } catch {
    /* se intenta la siguiente opción */
  }
  return memoryStore();
}

export const KEYS = { game: 'current-game', settings: 'settings' } as const;
