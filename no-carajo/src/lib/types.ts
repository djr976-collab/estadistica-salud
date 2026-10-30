export type Level = "basico" | "intermedio" | "avanzado";
export type Personality = "academico" | "ironico" | "sinfiltro";
export type AnswerMode = "escrita" | "oral";
export type GameMode = "duelo" | "guardia" | "codigo-rojo" | "examen" | "revancha";
export type QuestionType = "mcq" | "tf" | "open" | "calc";

export interface ModuleInfo {
  id: string;
  number: number;
  title: string;
  short: string;
  icon: string;
  color: string;
}

/** Cálculo resuelto por lógica determinista, nunca por IA. */
export type CalcSpec =
  | { kind: "goteo"; volumeMl: number; hours: number; dropFactor: 20 | 60 }
  | { kind: "dosis"; orderedMg: number; stockMg: number; stockMl: number }
  | { kind: "mlh"; volumeMl: number; hours: number };

export interface CalcTemplate {
  /** Enunciado con marcadores {volumeMl}, {hours}, etc. */
  template: string;
  base: CalcSpec;
  /** Variantes válidas para reformular en Revancha (mismos tipos que base). */
  variants?: CalcSpec[];
}

export interface CriticalInfo {
  /** Índices de opciones (mcq) o valor (tf) que constituyen un error grave de seguridad. */
  options?: number[];
  tfValue?: boolean;
  risk: string;
  recovery: RecoveryQuestion;
}

export interface RecoveryQuestion {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface Question {
  id: string;
  moduleId: string;
  level: Level;
  type: QuestionType;
  prompt: string;
  /** Enunciado alternativo para Revancha. */
  altPrompt?: string;
  options?: string[];
  /** mcq: índice correcto. */
  answer?: number;
  /** tf: valor correcto. */
  tfAnswer?: boolean;
  /** open: grupos de conceptos; cada grupo es lista de sinónimos. */
  keyConcepts?: { label: string; synonyms: string[] }[];
  /** open: mínimo de conceptos para considerarla correcta. */
  minConcepts?: number;
  calc?: CalcTemplate;
  explanation: string;
  hint?: string;
  critical?: CriticalInfo;
  /** Caso clínico progresivo (modo Guardia). */
  caseId?: string;
  caseStep?: number;
  caseIntro?: string;
  tags?: string[];
  /** Referencia curricular / bibliografía validada por docentes. */
  reference?: string;
  /** Origen: banco oficial, docente o IA aprobada. */
  origin?: "oficial" | "docente" | "ia-aprobada";
  active?: boolean;
}

/** Pregunta lista para jugar (cálculos ya instanciados con números concretos). */
export interface PlayableQuestion extends Question {
  renderedPrompt: string;
  calcSolved?: CalcSolution;
  shuffledFrom?: number[];
}

export interface CalcSolution {
  value: number;
  unit: string;
  tolerance: number;
  steps: string[];
}

export type Verdict = "correcta" | "parcial" | "incorrecta" | "grave";

export interface GradeResult {
  verdict: Verdict;
  score: number; // 0..1
  feedback: string;
  /** Error de expresión (p. ej., pronunciación/transcripción) y no conceptual. */
  expressionIssue?: boolean;
  matchedConcepts?: string[];
  missingConcepts?: string[];
  followUp?: string;
  source: "local" | "ia";
}

export interface AnswerRecord {
  questionId: string;
  moduleId: string;
  verdict: Verdict;
  score: number;
  xp: number;
  answerText: string;
  at: number;
  /** true si corrigió en Revancha un error previo */
  revanchaOk?: boolean;
}

export interface GameConfig {
  moduleId: string; // "todos" para mixto
  level: Level;
  count: number;
  answerMode: AnswerMode;
  personality: Personality;
  mode: GameMode;
}
