"use client";

/* Síntesis y reconocimiento de voz del navegador, con degradación elegante. */

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function sttSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined && cachedVoice !== null) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const pref = ["es-AR", "es-UY", "es-419", "es-US", "es-MX", "es-ES"];
  for (const lang of pref) {
    const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase() === lang.toLowerCase());
    if (v) return (cachedVoice = v);
  }
  cachedVoice = voices.find((x) => x.lang.toLowerCase().startsWith("es")) ?? null;
  return cachedVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = undefined;
    pickVoice();
  };
}

/** Limpia símbolos que suenan mal al leerse en voz alta. */
function speakable(text: string): string {
  return text
    .replace(/O₂/g, "oxígeno")
    .replace(/CO₂/g, "dióxido de carbono")
    .replace(/SatO₂/g, "saturación")
    .replace(/FiO₂/g, "fracción inspirada de oxígeno")
    .replace(/\bmL\/h\b/g, "mililitros por hora")
    .replace(/\bmL\b/g, "mililitros")
    .replace(/\bmg\b/g, "miligramos")
    .replace(/\blpm\b/g, "latidos por minuto")
    .replace(/\brpm\b/g, "respiraciones por minuto")
    .replace(/\bEV\b/g, "endovenoso")
    .replace(/\bVO\b/g, "vía oral")
    .replace(/→/g, ", luego ")
    .replace(/[«»*#_]/g, "");
}

export function speak(text: string, opts: { onStart?: () => void; onEnd?: () => void; rate?: number } = {}): void {
  if (!ttsSupported() || !text) {
    opts.onEnd?.();
    return;
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(speakable(text));
  const v = pickVoice();
  if (v) u.voice = v;
  u.lang = v?.lang ?? "es-AR";
  u.rate = opts.rate ?? 1.05;
  u.pitch = 0.9;
  u.onstart = () => opts.onStart?.();
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  synth.speak(u);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

export interface Listener {
  stop(): void;
}

export function listen(handlers: {
  onPartial?: (t: string) => void;
  onFinal: (t: string) => void;
  onError?: (msg: string) => void;
  onEnd?: () => void;
}): Listener | null {
  if (!sttSupported()) {
    handlers.onError?.("Tu navegador no permite reconocimiento de voz. Respondé escribiendo o con los botones.");
    return null;
  }
  const w = window as unknown as Record<string, new () => SR>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = "es-AR";
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  let finalText = "";
  rec.onresult = (e) => {
    let interim = "";
    for (let i = 0; i < e.results.length; i++) {
      const r = e.results[i];
      if (r.isFinal) finalText += r[0].transcript;
      else interim += r[0].transcript;
    }
    handlers.onPartial?.(finalText + interim);
  };
  rec.onerror = (e) => {
    const map: Record<string, string> = {
      "not-allowed": "No hay permiso para usar el micrófono. Habilitalo en el navegador o respondé escribiendo.",
      "no-speech": "No te escuché. Probá de nuevo, más cerca del micrófono.",
      network: "El reconocimiento de voz necesita conexión. Respondé escribiendo.",
    };
    handlers.onError?.(map[e.error] ?? "No pude escucharte. Probá de nuevo o escribí la respuesta.");
  };
  rec.onend = () => {
    if (finalText.trim()) handlers.onFinal(finalText.trim());
    handlers.onEnd?.();
  };
  stopSpeaking();
  rec.start();
  return { stop: () => rec.stop() };
}
