import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { bank } from '../src/content/bank';
import { attemptsToRows, csvCell, exportFileName, toCsv } from '../src/export/csv';
import { answer, newGame, present } from '../src/engine/game';
import { buildSummary, summaryToText } from '../src/engine/summary';
import { KEYS, memoryStore, openBestStore } from '../src/persistence/storage';

describe('CSV', () => {
  it('conserva tildes con BOM UTF-8', () => {
    const csv = toCsv([['Fisiología', 'añadir', 'ü']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('"Fisiología";"añadir";"ü"');
  });

  it('escapa comillas y conserva saltos de línea dentro de la celda', () => {
    expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(csvCell('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
    expect(csvCell('a;b')).toBe('"a;b"');
  });

  it('neutraliza texto que una planilla interpretaría como fórmula', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-2')).toBe('"\'-2"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
    expect(csvCell('\tx')).toBe('"\'\tx"');
  });

  it('los números van con coma decimal y sin comillas', () => {
    expect(csvCell(1.5)).toBe('1,5');
    expect(csvCell(-150)).toBe('-150');
    expect(csvCell(true)).toBe('"sí"');
    expect(csvCell(null)).toBe('""');
  });

  it('exporta los intentos de una partida con alias peligroso neutralizado', () => {
    let s = newGame({ alias: '=cmd|"/c calc"', avatarId: 'a1', contentMode: 'demo', seed: 1 });
    s = present(s, bank, 'far-02', 'guardia', null);
    const r = answer(s, bank, { numeric: '1,6' });
    if (!r.ok) throw new Error();
    const rows = attemptsToRows(r.state, bank);
    expect(rows).toHaveLength(2);
    const csv = toCsv(rows);
    expect(csv).toContain(`"'=cmd|""/c calc"""`);
    expect(csv).toContain('"1,6 mL"');
    expect(exportFileName(r.state, new Date('2026-10-24T12:00:00Z'))).toBe('guardia-de-preguntas_cmd-c-calc_2026-10-24.csv');
  });

  it('el informe aclara que los puntos no son una nota', () => {
    const s = newGame({ alias: 'Ana', avatarId: 'a1', contentMode: 'demo', seed: 1 });
    const text = summaryToText(buildSummary(s, bank), bank);
    expect(text).toContain('no son una nota académica');
    expect(text).toContain('0 de 0');
  });
});

describe('guardado local', () => {
  it('usa IndexedDB y conserva la partida al "reabrir"', async () => {
    const store = await openBestStore({ indexedDB });
    expect(store.kind).toBe('indexeddb');
    const g = newGame({ alias: 'Ana', avatarId: 'a2', contentMode: 'demo', seed: 3 });
    await store.set(KEYS.game, g);
    const again = await openBestStore({ indexedDB });
    expect(await again.get(KEYS.game)).toEqual(g);
    await again.remove(KEYS.game);
    expect(await again.get(KEYS.game)).toBeUndefined();
  });

  it('cae a memoria si no hay almacenamiento disponible', async () => {
    const store = await openBestStore({});
    expect(store.kind).toBe('memory');
    const m = memoryStore();
    await m.set('x', { a: 1 });
    expect(await m.get('x')).toEqual({ a: 1 });
  });

  it('cae a localStorage si IndexedDB falla', async () => {
    const data = new Map<string, string>();
    const ls = {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    } as unknown as Storage;
    const brokenIdb = { open: () => { throw new Error('bloqueado'); } } as unknown as IDBFactory;
    const store = await openBestStore({ indexedDB: brokenIdb, localStorage: ls });
    expect(store.kind).toBe('localstorage');
  });
});
