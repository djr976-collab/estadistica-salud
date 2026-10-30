import "server-only";

/**
 * Control de costos simple en memoria (por instancia del servidor).
 * Para producción con varias instancias: mover a Supabase/Redis (ver README).
 */
const WINDOW_MS = 10 * 60 * 1000;
const perIp = new Map<string, number[]>();
let day = new Date().toISOString().slice(0, 10);
let dailyCount = 0;

const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 300);
const IP_LIMIT = Number(process.env.AI_RATE_LIMIT_PER_IP ?? 20);

export function remainingToday(): number {
  rollDay();
  return Math.max(0, DAILY_LIMIT - dailyCount);
}

function rollDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dailyCount = 0;
  }
}

export function checkAndConsume(ip: string): { ok: true } | { ok: false; reason: string } {
  rollDay();
  if (dailyCount >= DAILY_LIMIT) return { ok: false, reason: "Se alcanzó el límite diario de IA. La corrección sigue en modo local." };
  const now = Date.now();
  const hits = (perIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= IP_LIMIT) return { ok: false, reason: "Demasiadas consultas seguidas. Esperá unos minutos." };
  hits.push(now);
  perIp.set(ip, hits);
  dailyCount++;
  return { ok: true };
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
