// Bancos del modo «Repaso por materia». Cada materia es un banco propio con
// una sola área, así reutiliza el mismo motor de preguntas, devoluciones,
// recuperaciones y repaso que «Mi guardia».

import { bank, buildBank, type Bank } from './bank';
import subjectsJson from './subjects.json';
import type { CategoryDef, Question } from '../types';

interface SubjectFile {
  subject: string;
  bankVersion: string;
  questions: Question[];
}

const files = import.meta.glob('./subjects/*.json', { eager: true, import: 'default' }) as Record<string, SubjectFile>;
const bySubject = new Map(Object.values(files).map((f) => [f.subject, f] as const));

export const subjects: CategoryDef[] = subjectsJson.subjects as CategoryDef[];

export const subjectBanks = new Map<string, Bank>(
  subjects.map((s) => {
    const file = bySubject.get(s.id);
    const b = buildBank({
      categories: [s],
      questions: file?.questions ?? [],
      finalQuestions: [],
      sources: [...bank.sources.values()],
      config: { ...bank.config, completion: subjectsJson.badgeRule },
      final: { title: '', caseTitle: '', caseIntro: [], steps: [] },
      bankVersion: file?.bankVersion ?? '0',
    });
    return [s.id, b] as const;
  }),
);

/** Busca un área en las categorías de PP2 o en las materias. */
export function areaById(id: string): CategoryDef {
  return bank.categoryById[id] ?? subjects.find((s) => s.id === id) ?? bank.categories[0];
}

export function subjectQuestionCount(id: string): number {
  return subjectBanks.get(id)?.questions.filter((q) => !q.isRecoveryVariant).length ?? 0;
}
