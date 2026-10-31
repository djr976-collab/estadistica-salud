import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export function GET() {
  const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return NextResponse.json({ ok: true, supabase: configured, serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY, time: new Date().toISOString() });
}
