import type { Level, Question, QuestionType } from "./types";
import { MODULES } from "@/data/modules";

/** Parser CSV con comillas; detecta separador "," o ";" (Excel en español usa ";"). */
export function parseCSV(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export function toCSV(rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[;"\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // ";" + BOM para que Excel en español lo abra con tildes y columnas correctas.
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n");
}

export const CSV_HEADERS = [
  "modulo",
  "nivel",
  "tipo",
  "enunciado",
  "opcion_a",
  "opcion_b",
  "opcion_c",
  "opcion_d",
  "correcta",
  "explicacion",
  "referencia",
  "conceptos_clave",
];

export const CSV_EXAMPLE = [
  CSV_HEADERS,
  ["bioseguridad", "basico", "mcq", "¿Cuál es el primer momento de higiene de manos?", "Antes del contacto con el paciente", "Al salir del hospital", "Al llegar a casa", "Nunca", "A", "Es el momento 1 de la OMS.", "OMS 5 momentos", ""],
  ["signos", "basico", "vf", "La FC normal del adulto en reposo es 60-100 lpm.", "", "", "", "", "V", "Rango habitual del adulto.", "", ""],
  ["pae", "intermedio", "abierta", "¿Qué es un dato subjetivo?", "", "", "", "", "", "Lo que refiere el paciente.", "", "refiere|dice|expresa; paciente|persona"],
];

export interface ImportResult {
  ok: Question[];
  errors: string[];
}

/**
 * Importa filas CSV. tipo: mcq | vf | abierta. correcta: letra (mcq) o V/F.
 * conceptos_clave (abiertas): grupos separados por ";" y sinónimos por "|".
 */
export function importQuestions(text: string): ImportResult {
  const rows = parseCSV(text);
  const errors: string[] = [];
  const ok: Question[] = [];
  if (!rows.length) return { ok, errors: ["Archivo vacío."] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? "").trim();
  const moduleIds = MODULES.map((m) => m.id);

  rows.slice(1).forEach((r, i) => {
    const n = i + 2;
    const moduleId = col(r, "modulo").toLowerCase();
    const level = col(r, "nivel").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") as Level;
    const rawType = col(r, "tipo").toLowerCase();
    const type: QuestionType | null = rawType === "mcq" || rawType === "multiple" ? "mcq" : rawType === "vf" || rawType === "tf" ? "tf" : rawType === "abierta" || rawType === "open" ? "open" : null;
    const prompt = col(r, "enunciado");
    const explanation = col(r, "explicacion");
    if (!moduleIds.includes(moduleId)) return errors.push(`Fila ${n}: módulo «${moduleId}» inexistente.`);
    if (!["basico", "intermedio", "avanzado"].includes(level)) return errors.push(`Fila ${n}: nivel inválido.`);
    if (!type) return errors.push(`Fila ${n}: tipo inválido (mcq, vf o abierta).`);
    if (!prompt || !explanation) return errors.push(`Fila ${n}: falta enunciado o explicación.`);

    const base: Question = {
      id: `doc-${Date.now()}-${i}`,
      moduleId,
      level,
      type,
      prompt,
      explanation,
      reference: col(r, "referencia") || undefined,
      origin: "docente",
      active: true,
    };
    if (type === "mcq") {
      const options = ["opcion_a", "opcion_b", "opcion_c", "opcion_d"].map((k) => col(r, k)).filter(Boolean);
      const answer = "abcd".indexOf(col(r, "correcta").toLowerCase());
      if (options.length < 2 || answer < 0 || answer >= options.length) return errors.push(`Fila ${n}: opciones o respuesta correcta inválidas.`);
      ok.push({ ...base, options, answer });
    } else if (type === "tf") {
      const v = col(r, "correcta").toLowerCase();
      if (!["v", "f", "verdadero", "falso"].includes(v)) return errors.push(`Fila ${n}: correcta debe ser V o F.`);
      ok.push({ ...base, tfAnswer: v.startsWith("v") });
    } else {
      const groups = col(r, "conceptos_clave")
        .split(";")
        .map((g) => g.split("|").map((s) => s.trim()).filter(Boolean))
        .filter((g) => g.length);
      if (!groups.length) return errors.push(`Fila ${n}: las abiertas necesitan conceptos_clave.`);
      ok.push({ ...base, keyConcepts: groups.map((g) => ({ label: g[0], synonyms: g })), minConcepts: groups.length });
    }
  });
  return { ok, errors };
}
