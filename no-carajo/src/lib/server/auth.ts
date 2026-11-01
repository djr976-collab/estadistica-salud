import "server-only";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const USER_DAILY = Number(process.env.AI_USER_DAILY_LIMIT ?? 40);

/**
 * Con Supabase configurado, la IA exige una sesión válida y descuenta del cupo diario del usuario
 * (función consume_ai_quota, que corre con la identidad del propio usuario).
 * Sin Supabase (modo demo) no hay control por usuario: sólo los límites por IP y diario.
 */
export async function authorizeAI(req: Request, opts: { staffOnly?: boolean } = {}): Promise<{ ok: true; userId: string | null } | { ok: false; status: number; error: string }> {
  if (!URL || !KEY) return { ok: true, userId: null };
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, error: "Iniciá sesión para usar la IA." };
  const sb = createClient(URL, KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return { ok: false, status: 401, error: "Sesión inválida o vencida." };
  if (opts.staffOnly) {
    const staff = await sb.rpc("is_staff");
    if (staff.data !== true) return { ok: false, status: 403, error: "Sólo docentes pueden generar preguntas." };
  }
  const quota = await sb.rpc("consume_ai_quota", { daily_limit: USER_DAILY });
  if (quota.error) return { ok: false, status: 500, error: "No se pudo verificar el cupo de IA." };
  if (quota.data !== true) return { ok: false, status: 429, error: "Alcanzaste tu cupo diario de IA. La corrección sigue en modo local." };
  return { ok: true, userId: data.user.id };
}
