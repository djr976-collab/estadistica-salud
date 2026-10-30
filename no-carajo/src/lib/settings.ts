"use client";

import { QUESTIONS } from "@/data/questions";
import type { Question } from "./types";
import { load, save } from "./storage";

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
export const spicyAvailable = () => envSpicy && getSettings().spicyAllowed;

export const getCustomQuestions = () => load<Question[]>(CUSTOM_KEY, []);
export const setCustomQuestions = (q: Question[]) => save(CUSTOM_KEY, q);
export const getPendingAI = () => load<Question[]>(PENDING_KEY, []);
export const setPendingAI = (q: Question[]) => save(PENDING_KEY, q);
export const getDisabledOfficial = () => load<string[]>(DISABLED_KEY, []);
export const setDisabledOfficial = (ids: string[]) => save(DISABLED_KEY, ids);

/** Banco efectivo: oficial (menos los desactivados) + preguntas docentes + IA aprobadas. */
export function getBank(): Question[] {
  const disabled = new Set(getDisabledOfficial());
  return [
    ...QUESTIONS.map((q) => ({ ...q, origin: "oficial" as const, active: !disabled.has(q.id) })),
    ...getCustomQuestions(),
  ];
}
