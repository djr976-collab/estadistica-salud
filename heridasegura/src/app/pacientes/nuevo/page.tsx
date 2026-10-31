'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/components/AppProvider';
import { Card, ErrorBox, PageHeader } from '@/components/ui';
import { PatientFields, emptyPatient, validatePatient } from '@/components/PatientForm';
import { friendlyError } from '@/lib/data/repo';
import { enc } from '@/lib/use-async';

export default function NewPatient() {
  const { repo, toast } = useApp();
  const router = useRouter();
  const [p, setP] = useState(emptyPatient());
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    const v = validatePatient(p);
    if (v) return setErr(v);
    setBusy(true); setErr(null);
    try { const created = await repo.createPatient(p); toast('Paciente registrado. Asigne una cama desde su ficha o desde el plano.'); router.push(`/pacientes/${enc(created.id)}`); }
    catch (e) { setErr(friendlyError(e)); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <PageHeader back="/pacientes" title="Nuevo paciente" subtitle="El ingreso a una cama se registra como movimiento separado" />
      <Card>
        <PatientFields value={p} onChange={setP} />
        {err && <div className="mt-3"><ErrorBox error={err} /></div>}
        <button className="btn-primary mt-4 w-full sm:w-auto" disabled={busy} onClick={save}>{busy ? 'Guardando…' : 'Registrar paciente'}</button>
      </Card>
    </div>
  );
}
