import type { CalcSolution, CalcSpec } from "../types";

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;
const fmt = (n: number) => String(round(n, 2)).replace(".", ",");

/** Resolución determinista de cálculos de enfermería. Nunca depende de la IA. */
export function solveCalc(spec: CalcSpec): CalcSolution {
  switch (spec.kind) {
    case "goteo": {
      if (spec.volumeMl <= 0 || spec.hours <= 0) throw new Error("Parámetros inválidos");
      const minutes = spec.hours * 60;
      const exact = (spec.volumeMl * spec.dropFactor) / minutes;
      const unit = spec.dropFactor === 60 ? "microgotas/min" : "gotas/min";
      return {
        value: Math.round(exact),
        unit,
        tolerance: 1,
        steps: [
          `Tiempo en minutos: ${fmt(spec.hours)} h × 60 = ${fmt(minutes)} min`,
          `${fmt(spec.volumeMl)} mL × ${spec.dropFactor} ${spec.dropFactor === 60 ? "microgotas" : "gotas"}/mL = ${fmt(spec.volumeMl * spec.dropFactor)}`,
          `${fmt(spec.volumeMl * spec.dropFactor)} ÷ ${fmt(minutes)} min = ${fmt(exact)} → ${Math.round(exact)} ${unit}`,
        ],
      };
    }
    case "dosis": {
      if (spec.stockMg <= 0 || spec.stockMl <= 0) throw new Error("Parámetros inválidos");
      const ml = (spec.orderedMg * spec.stockMl) / spec.stockMg;
      return {
        value: round(ml, 2),
        unit: "mL",
        tolerance: 0.05,
        steps: [
          `Concentración: ${fmt(spec.stockMg)} mg / ${fmt(spec.stockMl)} mL = ${fmt(spec.stockMg / spec.stockMl)} mg/mL`,
          `${fmt(spec.orderedMg)} mg × ${fmt(spec.stockMl)} mL ÷ ${fmt(spec.stockMg)} mg = ${fmt(ml)} mL`,
        ],
      };
    }
    case "mlh": {
      if (spec.hours <= 0) throw new Error("Parámetros inválidos");
      const v = spec.volumeMl / spec.hours;
      return {
        value: round(v, 1),
        unit: "mL/h",
        tolerance: 0.1,
        steps: [`${fmt(spec.volumeMl)} mL ÷ ${fmt(spec.hours)} h = ${fmt(v)} → ${fmt(round(v, 1))} mL/h`],
      };
    }
  }
}

export function renderCalcTemplate(template: string, spec: CalcSpec): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = (spec as unknown as Record<string, number>)[key];
    return v === undefined ? `{${key}}` : fmt(v);
  });
}
