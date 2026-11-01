"use client";

import { refreshCloudBank, teacherCloud } from "./cloud";
import {
  getCustomQuestions,
  getDisabledOfficial,
  getPendingAI,
  setCustomQuestions,
  setDisabledOfficial,
  setPendingAI,
} from "./settings";
import type { Question } from "./types";

/** Operaciones del panel docente, con la misma interfaz en modo demo (local) y con cuentas (Supabase). */
export interface TeacherStore {
  load(): Promise<{ custom: Question[]; pending: Question[]; disabled: string[] }>;
  save(q: Question): Promise<void>;
  saveMany(qs: Question[]): Promise<void>;
  remove(id: string): Promise<void>;
  setActive(q: Question, active: boolean): Promise<void>;
  setOfficialDisabled(id: string, disabled: boolean): Promise<void>;
  addPending(qs: Question[]): Promise<void>;
  approve(q: Question): Promise<void>;
  discard(id: string): Promise<void>;
}

export const localStore: TeacherStore = {
  async load() {
    return { custom: getCustomQuestions(), pending: getPendingAI(), disabled: getDisabledOfficial() };
  },
  async save(q) {
    const list = getCustomQuestions();
    setCustomQuestions(list.some((c) => c.id === q.id) ? list.map((c) => (c.id === q.id ? q : c)) : [...list, q]);
  },
  async saveMany(qs) {
    setCustomQuestions([...getCustomQuestions(), ...qs]);
  },
  async remove(id) {
    setCustomQuestions(getCustomQuestions().filter((q) => q.id !== id));
  },
  async setActive(q, active) {
    setCustomQuestions(getCustomQuestions().map((c) => (c.id === q.id ? { ...c, active } : c)));
  },
  async setOfficialDisabled(id, disabled) {
    const d = getDisabledOfficial().filter((x) => x !== id);
    setDisabledOfficial(disabled ? [...d, id] : d);
  },
  async addPending(qs) {
    setPendingAI([...getPendingAI(), ...qs]);
  },
  async approve(q) {
    setCustomQuestions([...getCustomQuestions(), { ...q, origin: "ia-aprobada", active: true }]);
    setPendingAI(getPendingAI().filter((p) => p.id !== q.id));
  },
  async discard(id) {
    setPendingAI(getPendingAI().filter((p) => p.id !== id));
  },
};

/** Tras cada cambio se refresca la caché del banco para que el propio docente lo vea al jugar. */
const refreshed = async <T,>(p: Promise<T>) => {
  const r = await p;
  void refreshCloudBank();
  return r;
};

export const cloudStore: TeacherStore = {
  async load() {
    const { approved, pending, disabled } = await teacherCloud.listQuestions();
    return { custom: approved, pending, disabled };
  },
  save: (q) => refreshed(teacherCloud.saveQuestion(q, q.active === false ? "archivada" : "aprobada")),
  saveMany: (qs) => refreshed(teacherCloud.saveMany(qs, "aprobada")),
  remove: (id) => refreshed(teacherCloud.deleteQuestion(id)),
  setActive: (q, active) => refreshed(teacherCloud.setStatus(q.id, active ? "aprobada" : "archivada")),
  setOfficialDisabled: (id, disabled) => refreshed(teacherCloud.setOfficialDisabled(id, disabled)),
  addPending: (qs) => teacherCloud.saveMany(qs.map((q) => ({ ...q, origin: "ia-aprobada" })), "borrador_ia"),
  approve: (q) => refreshed(teacherCloud.saveQuestion({ ...q, origin: "ia-aprobada" }, "aprobada")),
  discard: (id) => teacherCloud.deleteQuestion(id),
};
