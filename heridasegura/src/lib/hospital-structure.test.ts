import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildStructure, countsAsBed } from './hospital-structure';

const s = buildStructure();
const bySector = (code: string) => {
  const sec = s.sectors.find((x) => x.code === code)!;
  return s.locations.filter((l) => l.sector_id === sec.id);
};

describe('Estructura hospitalaria precargada', () => {
  it.each([
    ['CM-S1', 16], ['CM-S2', 24], ['CQ-S3', 20], ['CQ-S4', 30], ['S6', 20], ['UTI', 18], ['EMG', 16], ['UCO', 9],
  ])('%s tiene %i puestos', (code, n) => expect(bySector(code as string).length).toBe(n));
  it('total 153', () => expect(s.locations.length).toBe(153));
  it('sector 4 sin 36 ni 37 y con habitación 30 A/B/C', () => {
    const codes = bySector('CQ-S4').map((l) => l.code);
    expect(codes.some((c) => c.startsWith('36') || c.startsWith('37'))).toBe(false);
    expect(codes.filter((c) => c.startsWith('30'))).toEqual(['30A', '30B', '30C']);
    expect(codes.filter((c) => c.startsWith('35'))).toEqual(['35A', '35B', '35C', '35D']);
  });
  it('sector 6 de 601A a 610B', () => {
    const codes = bySector('S6').map((l) => l.code);
    expect(codes[0]).toBe('601A'); expect(codes[codes.length - 1]).toBe('610B');
  });
  it('camillas no son camas de internación', () => {
    expect(countsAsBed('camilla')).toBe(false);
    expect(countsAsBed('shockroom')).toBe(false);
    expect(countsAsBed('box_uti')).toBe(true);
  });
  it('códigos únicos por sector e IDs únicos', () => {
    expect(new Set(s.locations.map((l) => l.id)).size).toBe(153);
    for (const sec of s.sectors) {
      const c = s.locations.filter((l) => l.sector_id === sec.id).map((l) => l.code);
      expect(new Set(c).size).toBe(c.length);
    }
  });
  it('coincide con la migración SQL (sector, habitación, camas)', () => {
    const sql = readFileSync('supabase/migrations/20261031000004_seed_hospital.sql', 'utf8');
    expect(sql).toContain("'sec_cq_4', g::text, array['A','B','C','D'] from unnest(array[34, 35])");
    expect(sql).toContain("'sec_cq_4', g::text, array['A','B'] from unnest(array[38, 39])");
    expect(sql).toContain('for i in 1..13 loop');
    expect(sql).toContain('for i in 1..9 loop');
  });
});
