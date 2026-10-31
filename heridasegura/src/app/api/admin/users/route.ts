// Gestión de usuarios (solo administradores). Usa la clave de servicio EXCLUSIVAMENTE en el servidor.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'supervisor', 'enfermero'] as const;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requireAdmin(req: NextRequest) {
  const sb = admin();
  if (!sb) return { error: NextResponse.json({ error: 'Servidor sin configurar (SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 }) };
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return { error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) };
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { error: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }) };
  const p = await sb.from('profiles').select('role, active').eq('id', data.user.id).single();
  if (p.error || p.data?.role !== 'admin' || !p.data.active)
    return { error: NextResponse.json({ error: 'Solo un administrador puede gestionar usuarios' }, { status: 403 }) };
  return { sb, actor: data.user.id };
}

async function setSectors(sb: NonNullable<ReturnType<typeof admin>>, profileId: string, sectorIds: string[]) {
  if (!sectorIds.every((s) => UUID.test(s))) throw new Error('Sector inválido');
  const del = await sb.from('user_sectors').delete().eq('profile_id', profileId);
  if (del.error) throw new Error(del.error.message);
  if (sectorIds.length) {
    const ins = await sb.from('user_sectors').insert(sectorIds.map((sector_id) => ({ profile_id: profileId, sector_id })));
    if (ins.error) throw new Error(ins.error.message);
  }
}

async function audit(sb: NonNullable<ReturnType<typeof admin>>, actor: string, action: string, recordId: string) {
  await sb.from('audit_logs').insert({ actor_id: actor, action, table_name: 'profiles', record_id: recordId, context: { via: 'api/admin/users' } });
}

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => null);
  const { email, password, full_name, license_no, role, sector_ids } = body ?? {};
  if (typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
  if (typeof password !== 'string' || password.length < 10) return NextResponse.json({ error: 'La contraseña debe tener al menos 10 caracteres' }, { status: 400 });
  if (typeof full_name !== 'string' || full_name.trim().length < 2) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  try {
    const created = await ctx.sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? 'No se pudo crear');
    const id = created.data.user.id;
    const up = await ctx.sb.from('profiles').update({ full_name: full_name.trim(), license_no: license_no || null, role, active: true }).eq('id', id);
    if (up.error) throw new Error(up.error.message);
    await setSectors(ctx.sb, id, Array.isArray(sector_ids) ? sector_ids : []);
    await audit(ctx.sb, ctx.actor, 'USER_CREATE', id);
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  const ctx = await requireAdmin(req);
  if ('error' in ctx) return ctx.error;
  const body = await req.json().catch(() => null);
  const { id, full_name, license_no, role, active, sector_ids } = body ?? {};
  if (typeof id !== 'string' || !UUID.test(id)) return NextResponse.json({ error: 'Usuario inválido' }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  if (id === ctx.actor && (role !== 'admin' || active === false))
    return NextResponse.json({ error: 'No puede quitarse a sí mismo el rol de administrador.' }, { status: 400 });
  try {
    const up = await ctx.sb.from('profiles').update({ full_name, license_no: license_no || null, role, active: !!active }).eq('id', id);
    if (up.error) throw new Error(up.error.message);
    await setSectors(ctx.sb, id, Array.isArray(sector_ids) ? sector_ids : []);
    await audit(ctx.sb, ctx.actor, 'USER_UPDATE', id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error' }, { status: 400 });
  }
}
