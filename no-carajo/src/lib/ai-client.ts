"use client";

import type { GradeResult, Personality, PlayableQuestion, Question } from "./types";

export interface AIStatus {
  enabled: boolean;
  model?: string;
  remainingToday?: number;
}

export async function getAIStatus(): Promise<AIStatus> {
  try {
    const r = await fetch("/api/ai/status", { cache: "no-store" });
    if (!r.ok) return { enabled: false };
    return (await r.json()) as AIStatus;
  } catch {
    return { enabled: false };
  }
}

/** Pide a la IA que evalúe el razonamiento de una respuesta abierta. Devuelve null si no está disponible. */
export async function aiEvaluate(q: PlayableQuestion, answer: string, personality: Personality, viaVoice: boolean): Promise<GradeResult | null> {
  try {
    const r = await fetch("/api/ai/evaluate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: q.renderedPrompt,
        caseIntro: q.caseIntro,
        keyConcepts: q.keyConcepts?.map((c) => c.label) ?? [],
        explanation: q.explanation,
        answer,
        personality,
        viaVoice,
      }),
    });
    if (!r.ok) return null;
    const data = (await r.json()) as Omit<GradeResult, "source">;
    return { ...data, source: "ia" };
  } catch {
    return null;
  }
}

export async function aiGenerate(moduleTitle: string, moduleId: string, level: string, count: number, reference: string): Promise<{ questions: Question[]; error?: string }> {
  try {
    const r = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleTitle, moduleId, level, count, reference }),
    });
    const data = await r.json();
    if (!r.ok) return { questions: [], error: data.error ?? "Error de IA" };
    return { questions: data.questions };
  } catch {
    return { questions: [], error: "Sin conexión con el servidor." };
  }
}
