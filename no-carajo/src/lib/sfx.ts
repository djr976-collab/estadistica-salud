"use client";

/* Efectos de sonido ORIGINALES sintetizados con Web Audio (sin archivos con derechos). */

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.15, slideTo?: number) {
  const c = ac();
  if (!c || muted) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export const sfx = {
  correct() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.08, 0.22, "triangle", 0.14));
  },
  partial() {
    tone(523, 0, 0.18, "triangle", 0.12);
    tone(587, 0.12, 0.25, "triangle", 0.1);
  },
  wrong() {
    tone(330, 0, 0.25, "sawtooth", 0.08, 220);
    tone(220, 0.22, 0.4, "sawtooth", 0.08, 140);
  },
  alarm() {
    for (let i = 0; i < 4; i++) {
      tone(880, i * 0.36, 0.18, "square", 0.07);
      tone(660, i * 0.36 + 0.18, 0.18, "square", 0.07);
    }
  },
  tick() {
    tone(1200, 0, 0.04, "square", 0.04);
  },
  levelUp() {
    [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.07, 0.3, "triangle", 0.12));
  },
  click() {
    tone(700, 0, 0.05, "sine", 0.06);
  },
};
