import type { ModuleInfo } from "@/lib/types";

export const MODULES: ModuleInfo[] = [
  { id: "anatomia", number: 1, title: "Anatomía y fisiología humana", short: "Anatomía", icon: "🫀", color: "#ff4fd8" },
  { id: "bioseguridad", number: 2, title: "Bioseguridad y prevención de infecciones", short: "Bioseguridad", icon: "🧼", color: "#22e4ff" },
  { id: "higiene", number: 3, title: "Higiene y confort del paciente", short: "Confort", icon: "🛏️", color: "#7dd3fc" },
  { id: "signos", number: 4, title: "Signos vitales e interpretación clínica", short: "Signos vitales", icon: "📈", color: "#b6ff3b" },
  { id: "farmaco", number: 5, title: "Farmacología y administración segura", short: "Farmacología", icon: "💊", color: "#ff2e4d" },
  { id: "calculos", number: 6, title: "Cálculos de dosis, diluciones y goteo", short: "Cálculos", icon: "🧮", color: "#facc15" },
  { id: "oxigeno", number: 7, title: "Oxigenoterapia y cuidados respiratorios", short: "Oxigenoterapia", icon: "🫁", color: "#38bdf8" },
  { id: "pae", number: 8, title: "Proceso de Atención de Enfermería", short: "PAE", icon: "🧭", color: "#a78bfa" },
  { id: "periop", number: 9, title: "Cuidados preoperatorios y postoperatorios", short: "Perioperatorio", icon: "🩺", color: "#34d399" },
  { id: "urgencias", number: 10, title: "Urgencias y emergencias", short: "Urgencias", icon: "🚑", color: "#fb7185" },
  { id: "seguridad", number: 11, title: "Seguridad del paciente y calidad asistencial", short: "Seguridad", icon: "🛡️", color: "#f97316" },
  { id: "casos", number: 12, title: "Casos clínicos integradores", short: "Casos", icon: "🧩", color: "#e879f9" },
];

export const moduleById = (id: string) => MODULES.find((m) => m.id === id);
