// Tipos compartidos: contenido académico, estado de partida y configuración.

export const CATEGORY_IDS = [
  'fisiologia',
  'farmacologia',
  'procedimientos',
  'quirurgicos',
  'seguridad',
  'valoracion',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

export type Difficulty = 'conceptual' | 'aplicacion' | 'integracion';

/** Tipos implementados en esta versión. */
export type ImplementedQuestionType = 'single_choice' | 'numeric';
/**
 * Tipos previstos por la arquitectura (sin interfaz todavía). Un contenido con
 * estos tipos se ignora en la partida hasta que exista su componente.
 * `short_answer` nunca se califica automáticamente: requiere revisión docente.
 */
export type PlannedQuestionType = 'ordering' | 'matching' | 'image_select' | 'short_answer';
export type QuestionType = ImplementedQuestionType | PlannedQuestionType;

/** Forma pedagógica de la consigna (se muestra como etiqueta). */
export type QuestionFormat = 'concepto' | 'caso' | 'error_seguridad' | 'calculo';

export type ReviewStatus = 'draft' | 'reviewed' | 'approved';

export interface Option {
  id: string;
  text: string;
  feedback: string;
}

export interface SourceRef {
  /** Identificador en sources.json */
  ref: string;
  /** Apartado pertinente dentro de la fuente */
  section: string;
}

export interface Source {
  id: string;
  title: string;
  organization: string;
  year: number | null;
  url: string | null;
  doi?: string | null;
  kind: 'guia' | 'articulo' | 'manual' | 'libro' | 'herramienta';
  /** Qué se comprobó y cuándo. Comprobar que existe no equivale a revisión docente. */
  verification: string;
}

/** Datos para recalcular de forma independiente una respuesta numérica. */
export interface NumericCheck {
  formula: 'volumen_dosis' | 'conversion_mg_mcg' | 'goteo' | 'velocidad_bomba' | 'balance' | 'pam';
  inputs: Record<string, number | number[]>;
}

export interface Question {
  id: string;
  /** Agrupa preguntas equivalentes: el original y sus variantes comparten conceptId. */
  conceptId: string;
  category: CategoryId;
  competency: string;
  difficulty: Difficulty;
  type: QuestionType;
  format: QuestionFormat;
  stem: string;
  options: Option[];
  correctOptionId: string | null;
  numericAnswer: number | null;
  unit: string | null;
  tolerance: number | null;
  rounding: string | null;
  numericCheck?: NumericCheck | null;
  /** Devolución específica para respuestas numéricas incorrectas frecuentes. */
  numericFeedback?: string | null;
  rationale: string;
  /** Principio trasladable a otras situaciones. */
  transferPrinciple: string;
  criticalSafety: boolean;
  /** Explicación del riesgo cuando se elige una acción insegura (preguntas críticas). */
  riskNote?: string | null;
  recoveryQuestionId: string | null;
  /** true: se reserva para recuperar otra pregunta y no sale en la ruleta. */
  isRecoveryVariant?: boolean;
  /** Paso del desafío final (no sale en la ruleta). */
  finalChallenge?: boolean;
  relatedCategories?: CategoryId[];
  sources: SourceRef[];
  reviewStatus: ReviewStatus;
  reviewNote?: string;
  contentVersion: string;
}

export interface CategoryDef {
  id: CategoryId;
  letter: string;
  name: string;
  shortName: string;
  color: string;
  colorSoft: string;
  ink: string;
  badgeName: string;
  topics: string[];
}

export interface GameConfig {
  points: Record<Difficulty, number>;
  recoveryFactor: number;
  completion: {
    distinctResolved: number;
    requireNonConceptual: boolean;
  };
  maxSameCategoryInARow: number;
  reviewSpacing: number;
  guardian: {
    name: string;
    title: string;
    phrases: { intro: string; stop: string; closing: string };
  };
  emblem: { src: string | null; alt: string };
}

export type ContentMode = 'demo' | 'academic';
export type AttemptContext = 'guardia' | 'recuperacion_critica' | 'repaso' | 'final';

export interface Attempt {
  n: number;
  at: string;
  questionId: string;
  conceptId: string;
  category: CategoryId;
  difficulty: Difficulty;
  context: AttemptContext;
  /** La misma pregunta ya se había presentado antes en esta partida. */
  isRepeat: boolean;
  /** Primer intento sobre este concepto en la partida. */
  firstOnConcept: boolean;
  chosenOptionId: string | null;
  numericInput: string | null;
  numericValue: number | null;
  correct: boolean;
  critical: boolean;
  points: number;
}

export interface Presentation {
  questionId: string;
  context: AttemptContext;
  optionOrder: string[];
  isRepeat: boolean;
  /** Pregunta original cuyo concepto se intenta recuperar. */
  recoveryFor: string | null;
  phase: 'answering' | 'feedback';
  attemptN: number | null;
}

export type ConceptStatus = 'first_try' | 'recovered' | 'pending' | 'pending_critical';

export interface ConceptRecord {
  conceptId: string;
  category: CategoryId;
  /** Pregunta con la que se presentó el concepto por primera vez. */
  originQuestionId: string;
  status: ConceptStatus;
  /** Hubo un error crítico en algún momento (aunque ya se haya resuelto). */
  hadCriticalError: boolean;
  errorCount: number;
  /** Número de intento (Attempt.n) del último error, para espaciar el repaso. */
  lastErrorN: number | null;
  /** Dificultad de la pregunta con la que se resolvió. */
  resolvedDifficulty: Difficulty | null;
  finalChallenge: boolean;
}

export interface SpinRecord {
  category: CategoryId;
  at: string;
  animated: boolean;
  rotation: number;
}

export interface FinalState {
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  step: number;
  completedAt: string | null;
}

export interface GameState {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  contentMode: ContentMode;
  player: { alias: string; avatarId: string };
  rngState: number;
  wheelRotation: number;
  spins: SpinRecord[];
  /** Resultado del giro ya decidido, a la espera de presentar la pregunta. */
  pendingSpin: SpinRecord | null;
  attempts: Attempt[];
  concepts: Record<string, ConceptRecord>;
  presented: string[];
  current: Presentation | null;
  badges: { category: CategoryId; at: string }[];
  final: FinalState;
  /** Celebración pendiente de mostrar (sobrevive a una recarga). */
  celebration: { kind: 'badge'; category: CategoryId } | { kind: 'final' } | null;
}

export interface Settings {
  sound: boolean;
  motion: 'auto' | 'reduce' | 'full';
}
