// Sonidos breves sintetizados con Web Audio: no requieren archivos ni conexión.
// Apagados por defecto; solo suenan si el jugador los activa.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = ctx ?? new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.08) {
  const a = audio();
  if (!a) return;
  const t0 = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export type Sfx = 'tick' | 'correct' | 'review' | 'stop' | 'badge';

export function play(kind: Sfx, enabled: boolean) {
  if (!enabled) return;
  switch (kind) {
    case 'tick':
      tone(660, 0, 0.08, 'triangle', 0.05);
      break;
    case 'correct':
      tone(660, 0, 0.14);
      tone(880, 0.1, 0.2);
      break;
    case 'review':
      tone(440, 0, 0.18, 'triangle', 0.06);
      break;
    case 'stop':
      tone(330, 0, 0.22, 'triangle', 0.07);
      tone(262, 0.18, 0.28, 'triangle', 0.07);
      break;
    case 'badge':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25));
      break;
  }
}
