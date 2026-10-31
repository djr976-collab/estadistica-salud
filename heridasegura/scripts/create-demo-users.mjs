// Crea usuarios de DEMOSTRACIÓN en un proyecto Supabase de PRUEBA (nunca en producción).
// Uso: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD=... node scripts/create-demo-users.mjs
import { createClient } from '@supabase/supabase-js';
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !password || password.length < 10) {
  console.error('Defina SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DEMO_PASSWORD (≥ 10 caracteres).'); process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });
const users = [
  { email: 'admin.demo@example.org', full_name: 'Admin Demo', role: 'admin', sectors: [] },
  { email: 'supervision.demo@example.org', full_name: 'Supervisión Demo', role: 'supervisor', sectors: ['sec_cq_3', 'sec_cq_4'] },
  { email: 'enfermeria.cq4.demo@example.org', full_name: 'Enfermería CQ4 Demo', role: 'enfermero', sectors: ['sec_cq_4'] },
  { email: 'enfermeria.cm.demo@example.org', full_name: 'Enfermería CM Demo', role: 'enfermero', sectors: ['sec_cm_1', 'sec_cm_2', 'sec_uti'] },
];
const { data: sectors } = await sb.from('sectors').select('id, seed_key');
for (const u of users) {
  const r = await sb.auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: { full_name: u.full_name } });
  const id = r.data.user?.id ?? (await sb.from('profiles').select('id').eq('full_name', u.full_name).maybeSingle()).data?.id;
  if (!id) { console.error(u.email, r.error?.message); continue; }
  await sb.from('profiles').update({ role: u.role, active: true, full_name: u.full_name }).eq('id', id);
  await sb.from('user_sectors').delete().eq('profile_id', id);
  const rows = u.sectors.map((k) => ({ profile_id: id, sector_id: sectors.find((s) => s.seed_key === k)?.id })).filter((x) => x.sector_id);
  if (rows.length) await sb.from('user_sectors').insert(rows);
  console.log('✓', u.email, u.role);
}
