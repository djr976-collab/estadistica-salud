import categoriesJson from './categories.json';
import configJson from './config.json';
import finalJson from './final-challenge.json';
import questionsJson from './questions.json';
import sourcesJson from './sources.json';
import type { CategoryDef, CategoryId, ContentMode, GameConfig, Question, Source } from '../types';

export interface FinalChallengeDef {
  title: string;
  caseTitle: string;
  caseIntro: string[];
  steps: { label: string; narrative: string; after: string | null }[];
  stepQuestionIds: string[];
}

export interface Bank {
  categories: CategoryDef[];
  categoryById: Record<CategoryId, CategoryDef>;
  questions: Question[];
  byId: Map<string, Question>;
  sources: Map<string, Source>;
  config: GameConfig;
  final: FinalChallengeDef;
  bankVersion: string;
}

const IMPLEMENTED = new Set(['single_choice', 'numeric']);

/** Una pregunta es jugable si su tipo tiene interfaz y cumple el modo de contenido. */
export function isPlayable(q: Question, mode: ContentMode): boolean {
  if (!IMPLEMENTED.has(q.type)) return false;
  if (mode === 'academic') return q.reviewStatus === 'approved';
  return true;
}

export function buildBank(input: {
  categories: CategoryDef[];
  questions: Question[];
  finalQuestions: Question[];
  sources: Source[];
  config: GameConfig;
  final: Omit<FinalChallengeDef, 'stepQuestionIds'>;
  bankVersion: string;
}): Bank {
  const questions = [...input.questions, ...input.finalQuestions];
  const byId = new Map(questions.map((q) => [q.id, q] as const));
  const categoryById = Object.fromEntries(input.categories.map((c) => [c.id, c])) as Record<CategoryId, CategoryDef>;
  const stepQuestionIds = input.finalQuestions.filter((q) => !q.isRecoveryVariant).map((q) => q.id);
  return {
    categories: input.categories,
    categoryById,
    questions,
    byId,
    sources: new Map(input.sources.map((s) => [s.id, s] as const)),
    config: input.config,
    final: { ...input.final, stepQuestionIds },
    bankVersion: input.bankVersion,
  };
}

export const bank: Bank = buildBank({
  categories: categoriesJson.categories as CategoryDef[],
  questions: questionsJson.questions as unknown as Question[],
  finalQuestions: finalJson.questions as unknown as Question[],
  sources: sourcesJson.sources as Source[],
  config: configJson as GameConfig,
  final: {
    title: finalJson.title,
    caseTitle: finalJson.caseTitle,
    caseIntro: finalJson.caseIntro,
    steps: finalJson.steps,
  },
  bankVersion: questionsJson.bankVersion,
});

export function countPlayable(b: Bank, mode: ContentMode): number {
  return b.questions.filter((q) => !q.isRecoveryVariant && !q.finalChallenge && isPlayable(q, mode)).length;
}

/** El modo académico exige preguntas aprobadas en todas las categorías y en el desafío final. */
export function academicModeAvailability(b: Bank): { available: boolean; approved: number; missing: string[] } {
  const approved = countPlayable(b, 'academic');
  const missing: string[] = [];
  for (const c of b.categories) {
    const n = b.questions.filter(
      (q) => q.category === c.id && !q.isRecoveryVariant && !q.finalChallenge && isPlayable(q, 'academic'),
    ).length;
    if (n < b.config.completion.distinctResolved) missing.push(c.shortName);
  }
  const finalOk = b.final.stepQuestionIds.every((id) => {
    const q = b.byId.get(id);
    return q ? isPlayable(q, 'academic') : false;
  });
  if (!finalOk) missing.push('Desafío final');
  return { available: missing.length === 0, approved, missing };
}

export const REVIEW_STATUS_LABEL: Record<Question['reviewStatus'], string> = {
  draft: 'Borrador · pendiente de revisión docente',
  reviewed: 'Revisado · pendiente de aprobación',
  approved: 'Aprobado por la cátedra',
};

export const DIFFICULTY_LABEL: Record<Question['difficulty'], string> = {
  conceptual: 'Conceptual',
  aplicacion: 'Aplicación',
  integracion: 'Integración',
};

export const FORMAT_LABEL: Record<Question['format'], string> = {
  concepto: 'Concepto',
  caso: 'Caso breve',
  error_seguridad: 'Seguridad del paciente',
  calculo: 'Cálculo',
};
