// Estructura hospitalaria inicial — espejo de supabase/migrations/20261031000004_seed_hospital.sql.
// Se usa en el modo demostración local y en las pruebas automáticas.

import type { Location, LocationType, Room, Sector, Service } from './types';

interface RoomSpec { rooms: (number | string)[]; beds: string[] }
interface AreaSpec { key: string; code: string; name: string; prefix: string; count: number; type: LocationType; label: string; codeFmt: (i: number) => string }

interface SectorSpec {
  key: string; service: string; code: string; name: string; order: number;
  rooms?: RoomSpec[]; areas?: AreaSpec[];
}

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const pad = (i: number) => String(i).padStart(2, '0');

export const SERVICE_SPECS = [
  { key: 'svc_clinica_medica', code: 'CM', name: 'Clínica Médica', order: 10, notes: null },
  { key: 'svc_clinica_quirurgica', code: 'CQ', name: 'Clínica Quirúrgica', order: 20, notes: null },
  { key: 'svc_sector_6', code: 'S6', name: 'Sector 6', order: 30, notes: 'Especialidad no confirmada: se conserva la denominación "Sector 6".' },
  { key: 'svc_uti', code: 'UTI', name: 'Unidad de Terapia Intensiva', order: 40, notes: null },
  { key: 'svc_emergencias', code: 'EMG', name: 'Servicio de Emergencias', order: 50, notes: null },
  { key: 'svc_unidad_coronaria', code: 'UCO', name: 'Unidad Coronaria', order: 60, notes: null },
];

export const SECTOR_SPECS: SectorSpec[] = [
  { key: 'sec_cm_1', service: 'svc_clinica_medica', code: 'CM-S1', name: 'Clínica Médica — Sector 1', order: 11,
    rooms: [{ rooms: range(1, 8), beds: ['A', 'B'] }] },
  { key: 'sec_cm_2', service: 'svc_clinica_medica', code: 'CM-S2', name: 'Clínica Médica — Sector 2', order: 12,
    rooms: [{ rooms: range(9, 16), beds: ['A', 'B', 'C'] }] },
  { key: 'sec_cq_3', service: 'svc_clinica_quirurgica', code: 'CQ-S3', name: 'Clínica Quirúrgica — Sector 3', order: 21,
    rooms: [{ rooms: range(18, 27), beds: ['A', 'B'] }] },
  { key: 'sec_cq_4', service: 'svc_clinica_quirurgica', code: 'CQ-S4', name: 'Clínica Quirúrgica — Sector 4', order: 22,
    rooms: [
      { rooms: range(28, 33), beds: ['A', 'B', 'C'] },
      { rooms: [34, 35], beds: ['A', 'B', 'C', 'D'] },
      { rooms: [38, 39], beds: ['A', 'B'] },
    ] },
  { key: 'sec_s6', service: 'svc_sector_6', code: 'S6', name: 'Sector 6', order: 31,
    rooms: [{ rooms: range(601, 610), beds: ['A', 'B'] }] },
  { key: 'sec_uti', service: 'svc_uti', code: 'UTI', name: 'Unidad de Terapia Intensiva', order: 41,
    areas: [
      { key: 'sec_uti:area:camas', code: 'CAMAS', name: 'Camas de terapia intensiva', prefix: 'sec_uti:cama:', count: 13, type: 'cama_uti', label: 'Cama ', codeFmt: (i) => `UTI-C${pad(i)}` },
      { key: 'sec_uti:area:boxes', code: 'BOXES', name: 'Boxes', prefix: 'sec_uti:box:', count: 5, type: 'box_uti', label: 'Box ', codeFmt: (i) => `UTI-BOX${pad(i)}` },
    ] },
  { key: 'sec_emg', service: 'svc_emergencias', code: 'EMG', name: 'Emergencias', order: 51,
    areas: [
      { key: 'sec_emg:area:shock', code: 'SHOCKROOM', name: 'Shockroom', prefix: 'sec_emg:shock:', count: 4, type: 'shockroom', label: 'Puesto shockroom ', codeFmt: (i) => `EMG-SHK-${pad(i)}` },
      { key: 'sec_emg:area:obs', code: 'OBSERVACION', name: 'Observación', prefix: 'sec_emg:obs:', count: 8, type: 'observacion', label: 'Puesto observación ', codeFmt: (i) => `EMG-OBS-${pad(i)}` },
      { key: 'sec_emg:area:cam', code: 'CAMILLAS', name: 'Camillas', prefix: 'sec_emg:cam:', count: 4, type: 'camilla', label: 'Camilla ', codeFmt: (i) => `EMG-CAM-${pad(i)}` },
    ] },
  { key: 'sec_uco', service: 'svc_unidad_coronaria', code: 'UCO', name: 'Unidad Coronaria', order: 61,
    areas: [
      { key: 'sec_uco:area:camas', code: 'CAMAS', name: 'Camas de unidad coronaria', prefix: 'sec_uco:cama:', count: 9, type: 'cama_coronaria', label: 'Cama ', codeFmt: (i) => `UCO-C${pad(i)}` },
    ] },
];

export interface Structure { services: Service[]; sectors: Sector[]; rooms: Room[]; locations: Location[] }

/** IDs deterministas derivados del seed_key (solo para el modo demo). */
export const idFor = (seedKey: string) => `seed:${seedKey}`;

export function buildStructure(): Structure {
  const services: Service[] = SERVICE_SPECS.map((s) => ({
    id: idFor(s.key), code: s.code, name: s.name, notes: s.notes, sort_order: s.order, active: true,
  }));
  const sectors: Sector[] = [];
  const rooms: Room[] = [];
  const locations: Location[] = [];
  for (const sp of SECTOR_SPECS) {
    const sectorId = idFor(sp.key);
    sectors.push({ id: sectorId, service_id: idFor(sp.service), code: sp.code, name: sp.name, notes: null, sort_order: sp.order, active: true });
    for (const group of sp.rooms ?? []) {
      for (const r of group.rooms) {
        const roomKey = `${sp.key}:hab:${r}`;
        rooms.push({ id: idFor(roomKey), sector_id: sectorId, code: String(r), name: `Habitación ${r}`, kind: 'habitacion', sort_order: Number(r), active: true });
        group.beds.forEach((b, i) => {
          locations.push({
            id: idFor(`${sp.key}:cama:${r}${b}`), sector_id: sectorId, room_id: idFor(roomKey), code: `${r}${b}`,
            label: `Cama ${b}`, location_type: 'cama_internacion', is_provisional_code: false,
            operational_status: 'disponible', status_reason: null, sort_order: Number(r) * 10 + i + 1, active: true,
          });
        });
      }
    }
    (sp.areas ?? []).forEach((a, ai) => {
      rooms.push({ id: idFor(a.key), sector_id: sectorId, code: a.code, name: a.name, kind: 'area', sort_order: ai + 1, active: true });
      for (let i = 1; i <= a.count; i++) {
        locations.push({
          id: idFor(`${a.prefix}${i}`), sector_id: sectorId, room_id: idFor(a.key), code: a.codeFmt(i),
          label: `${a.label}${i}`, location_type: a.type, is_provisional_code: true,
          operational_status: 'disponible', status_reason: null, sort_order: (a.type === 'box_uti' ? 100 : 0) + i, active: true,
        });
      }
    });
  }
  return { services, sectors, rooms, locations };
}

export function countsAsBed(t: LocationType) {
  return t === 'cama_internacion' || t === 'cama_uti' || t === 'box_uti' || t === 'cama_coronaria';
}
