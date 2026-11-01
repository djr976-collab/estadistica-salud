"use client";

import { QUESTIONS } from "@/data/questions";
import type { Question } from "./types";
import { load, save } from "./storage";
import { cloudEnabled } from "./supabase";
import { cachedCloudBank, cachedCloudDisabled } from "./cloud";

/**
 * Configuración docente y banco local (prototipo sin backend).
 * En la fase 2 estas funciones se reemplazan por consultas a Supabase con RLS.
 */

const SETTINGS_KEY = "nc.settings.v1";
const CUSTOM_KEY = "nc.customQuestions.v1";
const PENDING_KEY = "nc.pendingAI.v1";
const DISABLED_KEY = "nc.disabledOfficial.v1";

export interface TeacherSettings {
  spicyAllowed: boolean;
}

const envSpicy = process.env.NEXT_PUBLIC_ALLOW_SPICY !== "false";

export const getSettings = (): TeacherSettings => ({ spicyAllowed: envSpicy, ...load<Partial<TeacherSettings>>(SETTINGS_KEY, {}) });
export const setSettings = (s: TeacherSettings) => save(SETTINGS_KEY, s);
/** En modo nube lo decide el docente de cada curso (lo fija AuthProvider al cargar el perfil). */
let courseSpicy: boolean | null = null;
export function setCourseSpicy(v: boolean | null) {
  courseSpicy = v;
}
export const spicyAvailable = () => envSpicy && (cloudEnabled ? courseSpicy ?? true : getSettings().spicyAllowed);

export const getCustomQuestions = () => load<Question[]>(CUSTOM_KEY, []);
export const setCustomQuestions = (q: Question[]) => save(CUSTOM_KEY, q);
export const getPendingAI = () => load<Question[]>(PENDING_KEY, []);
export const setPendingAI = (q: Question[]) => save(PENDING_KEY, q);
export const getDisabledOfficial = () => load<string[]>(DISABLED_KEY, []);
export const setDisabledOfficial = (ids: string[]) => save(DISABLED_KEY, ids);

/**
 * Banco efectivo: oficial (menos los desactivados) + preguntas docentes + IA aprobadas.
 * En modo nube el banco compartido se lee de la caché local, así se puede jugar sin conexión.
 */
export function getBank(): Question[] {
  const disabled = new Set(cloudEnabled ? cachedCloudDisabled() : getDisabledOfficial());
  return [
    ...QUESTIONS.map((q) => ({ ...q, origin: "oficial" as const, active: !disabled.has(q.id) })),
    ...(cloudEnabled ? cachedCloudBank() : getCustomQuestions()),
  ];
}
