'use client';
import { useState } from 'react';
import { Field, Notice, Select } from './ui';
import type { NewPatient } from '@/lib/data/repo';

export function emptyPatient(): NewPatient { return { mrn: '', first_name: '', last_name: '', birth_date: null, sex: null }; }

export function validatePatient(p: NewPatient): string | null {
  if (!p.mrn.trim()) return 'Ingrese el número de historia clínica.';
  if (p.first_name.trim().length < 2 || p.last_name.trim().length < 2) return 'Ingrese nombre y apellido.';
  if (p.birth_date && new Date(p.birth_date) > new Date()) return 'La fecha de nacimiento no puede ser futura.';
  return null;
}

export function PatientFields({ value, onChange }: { value: NewPatient; onChange: (p: NewPatient) => void }) {
  const set = (k: keyof NewPatient) => (v: string) => onChange({ ...value, [k]: v || (k === 'birth_date' || k === 'sex' ? null : '') });
  const [touched] = useState(false);
  return (
    <div className="space-y-3">
      <Notice tone="warn"><p>Prototipo: registre <b>solo pacientes ficticios</b>. El sistema marca todos los registros como ficticios hasta su autorización institucional.</p></Notice>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Apellido" required>{(id) => <input id={id} className="input" value={value.last_name} onChange={(e) => set('last_name')(e.target.value)} autoComplete="off" />}</Field>
        <Field label="Nombre" required>{(id) => <input id={id} className="input" value={value.first_name} onChange={(e) => set('first_name')(e.target.value)} autoComplete="off" />}</Field>
        <Field label="N.º de historia clínica" required hint={touched ? undefined : 'Identificador institucional (en demo, use DEMO-XXXX).'}>{(id) => <input id={id} className="input font-mono" value={value.mrn} onChange={(e) => set('mrn')(e.target.value)} autoComplete="off" />}</Field>
        <Field label="Fecha de nacimiento">{(id) => <input id={id} type="date" className="input" value={value.birth_date ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => set('birth_date')(e.target.value)} />}</Field>
        <Field label="Sexo registrado">{(id) => <Select id={id} value={(value.sex ?? '') as string} onChange={set('sex')} placeholder="No informado" options={{ femenino: 'Femenino', masculino: 'Masculino', otro: 'Otro' }} />}</Field>
      </div>
    </div>
  );
}
