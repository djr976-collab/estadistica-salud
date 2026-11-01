"use client";

import type { Vitals } from "@/lib/types";

/** Rangos orientativos de adulto para colorear el monitor (no reemplazan el juicio clínico). */
function status(key: keyof Vitals, v: Vitals[keyof Vitals]): "ok" | "warn" | "crit" {
  if (v === undefined || v === null || v === "") return "ok";
  const n = typeof v === "number" ? v : NaN;
  switch (key) {
    case "fc":
      return n > 130 || n < 40 ? "crit" : n > 100 || n < 50 ? "warn" : "ok";
    case "fr":
      return n >= 25 || n <= 8 ? "crit" : n > 20 || n < 12 ? "warn" : "ok";
    case "sat":
      return n < 90 ? "crit" : n < 94 ? "warn" : "ok";
    case "temp":
      return n >= 39 || n < 35 ? "crit" : n >= 38 ? "warn" : "ok";
    case "glu":
      return n < 54 || n > 300 ? "crit" : n < 70 || n > 180 ? "warn" : "ok";
    case "dolor":
      return n >= 7 ? "crit" : n >= 4 ? "warn" : "ok";
    case "pa": {
      const sys = parseInt(String(v), 10);
      return sys <= 90 ? "crit" : sys <= 100 || sys >= 160 ? "warn" : "ok";
    }
    case "conciencia":
      return /alerta|orientad/i.test(String(v)) && !/desorient/i.test(String(v)) ? "ok" : "warn";
    default:
      return "ok";
  }
}

const FIELDS: { key: keyof Vitals; label: string; unit: string }[] = [
  { key: "pa", label: "PA", unit: "mmHg" },
  { key: "fc", label: "FC", unit: "lpm" },
  { key: "fr", label: "FR", unit: "rpm" },
  { key: "sat", label: "SatO₂", unit: "%" },
  { key: "temp", label: "T", unit: "°C" },
  { key: "glu", label: "Glu", unit: "mg/dL" },
  { key: "dolor", label: "Dolor", unit: "/10" },
];

const COLOR = { ok: "text-neon-lima", warn: "text-amber-300", crit: "text-guardia animate-pulse" };

export default function VitalsMonitor({ vitals }: { vitals: Vitals }) {
  const shown = FIELDS.filter((f) => vitals[f.key] !== undefined);
  return (
    <div className="rounded-xl border border-neon-cyan/30 bg-black/60 p-3 font-mono shadow-neon" aria-label="Monitor de signos vitales">
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-neon-cyan/80">
        <span>● Monitor</span>
        {vitals.o2 && <span>O₂: {vitals.o2}</span>}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {shown.map((f) => {
          const v = vitals[f.key];
          return (
            <div key={f.key} className="rounded-lg bg-white/[.04] px-2 py-1.5">
              <p className="text-[10px] text-white/50">{f.label}</p>
              <p className={`text-lg font-bold leading-none ${COLOR[status(f.key, v)]}`}>
                {typeof v === "number" ? String(v).replace(".", ",") : v}
                <span className="ml-0.5 text-[10px] font-normal text-white/40">{f.unit}</span>
              </p>
            </div>
          );
        })}
      </div>
      {vitals.conciencia && (
        <p className={`mt-2 text-xs ${COLOR[status("conciencia", vitals.conciencia)].replace(" animate-pulse", "")}`}>Conciencia: {vitals.conciencia}</p>
      )}
    </div>
  );
}
