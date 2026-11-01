"use client";

import { getSupabase, type Course, type Profile, type Role } from "./supabase";
import { getProgress, mergeProgress, setProgress, type Progress } from "./progress";
import { load, save } from "./storage";
import type { AnswerRecord, GameConfig, Question } from "./types";

/* ════════════════ Usuario actual (lo fija AuthProvider) ════════════════ */
let currentUser: string | null = null;
export function setCloudUser(id: string | null) {
  currentUser = id;
}
export const cloudUser = () => currentUser;

/* ════════════════ Progreso ════════════════ */
interface ProgressRow {
  user_id: string;
  xp: number;
  best_streak: number;
  sessions: number;
  grave_count: number;
  badges: string[];
  wrong: Record<string, number>;
  updated_at: string;
}

export async function pullProgress(): Promise<void> {
  const sb = getSupabase();
  if (!sb || !currentUser) return;
  const { data } = await sb.from("progress").select("*").eq("user_id", currentUser).maybeSingle<ProgressRow>();
  if (!data) return;
  const merged = mergeProgress(getProgress(), {
    xp: data.xp,
    bestStreak: data.best_streak,
    sessions: data.sessions,
    graveCount: data.grave_count,
    badges: data.badges ?? [],
    wrong: data.wrong ?? {},
    updatedAt: Date.parse(data.updated_at),
  });
  setProgress(merged, { silent: true });
  await pushProgress(merged);
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
/** Sube el progreso con un pequeño retardo para agrupar cambios seguidos. */
export function schedulePushProgress(p: Progress) {
  if (!currentUser) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => void pushProgress(p), 1500);
}

async function pushProgress(p: Progress) {
  const sb = getSupabase();
  if (!sb || !currentUser) return;
  await sb.from("progress").upsert({
    user_id: currentUser,
    xp: p.xp,
    best_streak: p.bestStreak,
    sessions: p.sessions,
    grave_count: p.graveCount,
    badges: p.badges,
    wrong: p.wrong,
    updated_at: new Date(p.updatedAt ?? Date.now()).toISOString(),
  });
}

/* ════════════════ Sesiones e intentos (con cola sin conexión) ════════════════ */
type OutboxItem =
  | { kind: "session"; row: Record<string, unknown> }
  | { kind: "attempt"; row: Record<string, unknown> };

const outboxKey = () => `nc.outbox:${currentUser}`;
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

function enqueue(item: OutboxItem) {
  if (!currentUser) return;
  const box = load<OutboxItem[]>(outboxKey(), []);
  box.push(item);
  save(outboxKey(), box.slice(-2000));
  void flushOutbox();
}

let flushing = false;
/** Envía lo pendiente en orden; si falla (p. ej., sin conexión) se reintenta luego. */
export async function flushOutbox(): Promise<void> {
  const sb = getSupabase();
  if (!sb || !currentUser || flushing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  flushing = true;
  try {
    let box = load<OutboxItem[]>(outboxKey(), []);
    while (box.length) {
      const item = box[0];
      const { error } =
        item.kind === "session"
          ? await sb.from("game_sessions").upsert(item.row)
          : await sb.from("attempts").upsert(item.row, { onConflict: "user_id,client_id", ignoreDuplicates: true });
      if (error) break;
      box = box.slice(1);
      save(outboxKey(), box);
    }
  } finally {
    flushing = false;
  }
}

export function pendingCount(): number {
  return currentUser ? load<OutboxItem[]>(outboxKey(), []).length : 0;
}

export function startCloudSession(cfg: GameConfig, questions: number): string | null {
  if (!currentUser) return null;
  const id = uuid();
  enqueue({
    kind: "session",
    row: { id, user_id: currentUser, mode: cfg.mode, module_id: cfg.moduleId, level: cfg.level, personality: cfg.personality, questions },
  });
  return id;
}

export function finishCloudSession(id: string | null, cfg: GameConfig, questions: number, score: number, xp: number) {
  if (!currentUser || !id) return;
  enqueue({
    kind: "session",
    row: {
      id,
      user_id: currentUser,
      mode: cfg.mode,
      module_id: cfg.moduleId,
      level: cfg.level,
      personality: cfg.personality,
      questions,
      score,
      xp,
      finished_at: new Date().toISOString(),
    },
  });
}

export function recordCloudAttempt(sessionId: string | null, r: AnswerRecord, gradedBy: "local" | "ia") {
  if (!currentUser) return;
  enqueue({
    kind: "attempt",
    row: {
      client_id: uuid(),
      session_id: sessionId,
      user_id: currentUser,
      question_id: r.questionId,
      module_id: r.moduleId,
      verdict: r.verdict,
      score: r.score,
      xp: r.xp,
      answer_text: r.answerText.slice(0, 500),
      graded_by: gradedBy,
      answered_at: new Date(r.at).toISOString(),
    },
  });
}

/* ════════════════ Banco compartido (cacheado para uso sin conexión) ════════════════ */
const BANK_CACHE = "nc.cloudBank.v1";
const DISABLED_CACHE = "nc.cloudDisabled.v1";

interface QuestionRow {
  id: string;
  module_id: string;
  level: Question["level"];
  type: Question["type"];
  body: Omit<Question, "id">;
  status: "borrador_ia" | "aprobada" | "archivada";
  origin: string;
  created_at: string;
}

const rowToQuestion = (r: QuestionRow): Question => ({
  ...r.body,
  id: r.id,
  moduleId: r.module_id,
  level: r.level,
  type: r.type,
  origin: (r.origin as Question["origin"]) ?? "docente",
  active: r.status === "aprobada",
});

export const cachedCloudBank = () => load<Question[]>(BANK_CACHE, []);
export const cachedCloudDisabled = () => load<string[]>(DISABLED_CACHE, []);

export async function refreshCloudBank(): Promise<void> {
  const sb = getSupabase();
  if (!sb || !currentUser) return;
  const [q, d] = await Promise.all([
    sb.from("questions").select("*").eq("status", "aprobada"),
    sb.from("disabled_official").select("question_id"),
  ]);
  if (!q.error) save(BANK_CACHE, (q.data as QuestionRow[]).map(rowToQuestion));
  if (!d.error) save(DISABLED_CACHE, (d.data as { question_id: string }[]).map((x) => x.question_id));
}

/* ════════════════ Funciones docentes ════════════════ */
const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

function must<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
}

function questionPayload(q: Question, status: QuestionRow["status"]) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, active, ...body } = q;
  return { module_id: q.moduleId, level: q.level, type: q.type, body, status, origin: q.origin ?? "docente", updated_at: new Date().toISOString() };
}

export const teacherCloud = {
  async listQuestions(): Promise<{ approved: Question[]; pending: Question[]; disabled: string[] }> {
    const sb = getSupabase()!;
    const rows = must(await sb.from("questions").select("*").order("created_at", { ascending: false })) as QuestionRow[];
    const disabled = (must(await sb.from("disabled_official").select("question_id")) as { question_id: string }[]).map((d) => d.question_id);
    return {
      approved: rows.filter((r) => r.status !== "borrador_ia").map(rowToQuestion),
      pending: rows.filter((r) => r.status === "borrador_ia").map(rowToQuestion),
      disabled,
    };
  },
  async saveQuestion(q: Question, status: QuestionRow["status"] = "aprobada"): Promise<void> {
    const sb = getSupabase()!;
    const payload = { ...questionPayload(q, status), ...(status === "aprobada" ? { reviewed_by: currentUser, reviewed_at: new Date().toISOString() } : {}) };
    if (isUuid(q.id)) must(await sb.from("questions").upsert({ id: q.id, ...payload }));
    else must(await sb.from("questions").insert(payload));
  },
  async saveMany(qs: Question[], status: QuestionRow["status"]): Promise<void> {
    if (!qs.length) return;
    must(await getSupabase()!.from("questions").insert(qs.map((q) => questionPayload(q, status))));
  },
  async setStatus(id: string, status: QuestionRow["status"]): Promise<void> {
    must(await getSupabase()!.from("questions").update({ status, reviewed_by: currentUser, reviewed_at: new Date().toISOString() }).eq("id", id));
  },
  async deleteQuestion(id: string): Promise<void> {
    must(await getSupabase()!.from("questions").delete().eq("id", id));
  },
  async setOfficialDisabled(id: string, disabled: boolean): Promise<void> {
    const sb = getSupabase()!;
    if (disabled) must(await sb.from("disabled_official").upsert({ question_id: id }));
    else must(await sb.from("disabled_official").delete().eq("question_id", id));
  },

  async listCourses(): Promise<Course[]> {
    return must(await getSupabase()!.from("courses").select("*").order("created_at", { ascending: false })) as Course[];
  },
  async createCourse(name: string, year: number | null): Promise<Course> {
    return must(await getSupabase()!.rpc("create_course", { course_name: name, course_year: year })) as Course;
  },
  async updateCourse(id: string, patch: Partial<Pick<Course, "name" | "allow_spicy">>): Promise<void> {
    must(await getSupabase()!.from("courses").update(patch).eq("id", id));
  },

  async courseStudents(courseId: string): Promise<StudentSummary[]> {
    return must(await getSupabase()!.from("student_summary").select("*").eq("course_id", courseId).order("full_name")) as StudentSummary[];
  },
  async moduleStats(filter: { courseId?: string; userId?: string }): Promise<ModuleStatRow[]> {
    let q = getSupabase()!.from("module_stats").select("*");
    if (filter.courseId) q = q.eq("course_id", filter.courseId);
    if (filter.userId) q = q.eq("user_id", filter.userId);
    return must(await q) as ModuleStatRow[];
  },
  async studentAttempts(userId: string, limit = 60): Promise<AttemptRow[]> {
    return must(
      await getSupabase()!.from("attempts").select("question_id,module_id,verdict,score,answer_text,answered_at").eq("user_id", userId).order("answered_at", { ascending: false }).limit(limit),
    ) as AttemptRow[];
  },
  async courseAttempts(userIds: string[]): Promise<(AttemptRow & { user_id: string })[]> {
    if (!userIds.length) return [];
    return must(
      await getSupabase()!.from("attempts").select("user_id,question_id,module_id,verdict,score,answer_text,answered_at").in("user_id", userIds).order("answered_at", { ascending: false }).limit(5000),
    ) as (AttemptRow & { user_id: string })[];
  },

  async listUsers(): Promise<Profile[]> {
    return must(await getSupabase()!.from("profiles").select("id,full_name,role,course_id").order("full_name")) as Profile[];
  },
  async setRole(userId: string, role: Role): Promise<void> {
    must(await getSupabase()!.rpc("set_user_role", { target: userId, new_role: role }));
  },
};

export interface StudentSummary {
  user_id: string;
  full_name: string;
  course_id: string;
  xp: number;
  sessions: number;
  grave_count: number;
  answers: number;
  pct: number | null;
  last_activity: string | null;
}

export interface ModuleStatRow {
  course_id: string;
  user_id: string;
  module_id: string;
  answers: number;
  pct: number;
  grave_errors: number;
}

export interface AttemptRow {
  question_id: string;
  module_id: string;
  verdict: string;
  score: number;
  answer_text: string | null;
  answered_at: string;
}
