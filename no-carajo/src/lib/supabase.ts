"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Modo nube: hay Supabase configurado. Sin estas variables la app sigue en modo demo local. */
export const cloudEnabled = Boolean(URL && KEY);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!cloudEnabled) return null;
  client ??= createClient(URL!, KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "nc.auth" },
  });
  return client;
}

export type Role = "admin" | "docente" | "estudiante";

export interface Course {
  id: string;
  name: string;
  year: number | null;
  join_code: string;
  teacher_id: string;
  allow_spicy: boolean;
}

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  course_id: string | null;
  course?: Course | null;
}

/** Traduce los errores más comunes de Supabase al castellano. */
export function friendlyError(msg: string | undefined): string {
  if (!msg) return "Ocurrió un error inesperado.";
  const map: [RegExp, string][] = [
    [/Invalid login credentials/i, "Correo o contraseña incorrectos."],
    [/Email not confirmed/i, "Todavía no confirmaste tu correo. Revisá tu bandeja de entrada."],
    [/User already registered/i, "Ya existe una cuenta con ese correo."],
    [/Password should be at least/i, "La contraseña debe tener al menos 6 caracteres."],
    [/rate limit/i, "Demasiados intentos. Esperá unos minutos."],
    [/Failed to fetch|NetworkError/i, "Sin conexión con el servidor."],
  ];
  return map.find(([re]) => re.test(msg))?.[1] ?? msg;
}
