'use client';
import type { Repo } from './repo';
import { DemoRepo } from './demo-repo';
import { SupabaseRepo } from './supabase-repo';

let repo: Repo | null = null;

export function isDemoMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || !url || !key || url.includes('TU-PROYECTO');
}

export function getRepo(): Repo {
  if (repo) return repo;
  repo = isDemoMode()
    ? new DemoRepo()
    : new SupabaseRepo(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return repo;
}

export function resetDemo() {
  DemoRepo.reset();
  repo = null;
}
