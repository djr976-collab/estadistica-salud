"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Jefe, { type Mood } from "./Jefe";
import { moduleById } from "@/data/modules";
import { buildSession } from "@/lib/engine/session";
import { gradeLocal, type StudentAnswer } from "@/lib/engine/grade";
import { aiEvaluate } from "@/lib/ai-client";
import { effectivePersonality, line } from "@/lib/personality";
import { getBank, spicyAvailable } from "@/lib/settings";
import { getProgress, newBadges, rankFor, setProgress, xpFor } from "@/lib/progress";
import { listen, speak, stopSpeaking, sttSupported, type Listener } from "@/lib/speech";
import { sfx } from "@/lib/sfx";
import type { GameConfig, GradeResult, PlayableQuestion } from "@/lib/types";
import type { Prefs } from "./Game";

export interface SessionItem {
  q: PlayableQuestion;
  grade: GradeResult;
  xp: number;
  answer: string;
  retried: boolean;
}

export interface SessionResult {
  items: SessionItem[];
  xp: number;
  graves: number;
  bestStreak: number;
  newBadges: string[];
  xpBefore: number;
  xpAfter: number;
}

type Phase = "asking" | "evaluating" | "feedback" | "grave" | "recovery";

const LETTERS = ["A", "B", "C", "D", "E"];
const LEVEL_LABEL = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado" } as const;
const TIME_BY_LEVEL = { basico: 30, intermedio: 25, avanzado: 20 } as const;

export default function Play({
  config,
  prefs,
  aiEnabled,
  onFinish,
  onExit,
}: {
  config: GameConfig;
  prefs: Prefs;
  aiEnabled: boolean;
  onFinish: (r: SessionResult) => void;
  onExit: () => void;
}) {
  const personality = useMemo(() => effectivePersonality(config.personality, spicyAvailable()), [config.personality]);
  const [questions] = useState<PlayableQuestion[]>(() => buildSession(config, { bank: getBank(), wrongIds: Object.keys(getProgress().wrong) }));
  const [xpBefore] = useState(() => getProgress().xp);

  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [attempt, setAttempt] = useState(1);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [explained, setExplained] = useState(false);
  const [disabledOpts, setDisabledOpts] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | boolean | null>(null);
  const [text, setText] = useState("");
  const [bubble, setBubble] = useState("");
  const [mood, setMood] = useState<Mood>("idle");
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [micMsg, setMicMsg] = useState("");
  const [viaVoice, setViaVoice] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [items, setItems] = useState<SessionItem[]>([]);
  const [xpFloat, setXpFloat] = useState<{ n: number; k: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [recoveryPick, setRecoveryPick] = useState<number | null>(null);

  const listener = useRef<Listener | null>(null);
  const answeredAt = useRef<number | null>(null);
  const q = questions[idx];
  const timed = config.mode === "codigo-rojo";
  const allowRetry = config.mode !== "examen" && config.mode !== "codigo-rojo";
  const totalTime = TIME_BY_LEVEL[config.level];

  const say = useCallback(
    (t: string, onEnd?: () => void) => {
      if (!prefs.voice) {
        onEnd?.();
        return;
      }
      speak(t, {
        onStart: () => setSpeaking(true),
        onEnd: () => {
          setSpeaking(false);
          onEnd?.();
        },
      });
    },
    [prefs.voice],
  );

  const stopListening = () => {
    listener.current?.stop();
    listener.current = null;
    setListening(false);
  };

  // ── Presentar la pregunta ──
  useEffect(() => {
    if (!q || phase !== "asking") return;
    const intro = idx === 0 && attempt === 1 ? line(personality, "intro") + " " : "";
    const lead = attempt > 1 ? "Segundo intento." : line(personality, "pregunta");
    const caseText = q.caseIntro && attempt === 1 ? q.caseIntro + " " : "";
    const opts = config.answerMode === "oral" && q.options ? " " + q.options.map((o, i) => `${LETTERS[i]}: ${o}.`).join(" ") : "";
    const tf = config.answerMode === "oral" && q.type === "tf" ? " ¿Verdadero o falso?" : "";
    setBubble(attempt > 1 ? "Dale, otra oportunidad. Pensalo bien." : idx === 0 ? intro.trim() : lead);
    setMood("talking");
    say(`${intro}${lead} ${caseText}${q.renderedPrompt}${opts}${tf}`, () => {
      setMood("idle");
      if (config.answerMode === "oral" && sttSupported()) startListening();
    });
    if (timed) setTimeLeft(totalTime);
    answeredAt.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, attempt, phase === "asking"]);

  // ── Temporizador (Código rojo) ──
  useEffect(() => {
    if (!timed || phase !== "asking" || timeLeft === null) return;
    if (timeLeft <= 0) {
      stopListening();
      stopSpeaking();
      const g: GradeResult = { verdict: "incorrecta", score: 0, feedback: `Tiempo agotado.\n${q.explanation}`, source: "local" };
      setBubble(line(personality, "tiempo"));
      applyGrade(g, "(sin respuesta)", true);
      return;
    }
    if (timeLeft <= 5) sfx.tick();
    const t = setTimeout(() => setTimeLeft((s) => (s === null ? s : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, timed]);

  useEffect(() => () => {
    stopSpeaking();
    listener.current?.stop();
  }, []);

  if (!q) {
    return (
      <div className="card rise mt-10 text-center">
        <Jefe mood="thinking" size={160} />
        <p className="mt-2">No hay preguntas disponibles para esta combinación. Probá otro módulo o nivel.</p>
        <button className="btn-ghost mt-4" onClick={onExit}>
          Volver
        </button>
      </div>
    );
  }

  function startListening() {
    setMicMsg("");
    setText("");
    setListening(true);
    listener.current = listen({
      onPartial: (t) => setText(t),
      onFinal: (t) => {
        setText(t);
        setViaVoice(true);
        // En opción múltiple, V/F y cálculos se envía directo; en abiertas se deja revisar.
        if (q.type !== "open") submit({ text: t, viaVoice: true });
      },
      onError: (m) => setMicMsg(m),
      onEnd: () => setListening(false),
    });
    if (!listener.current) setListening(false);
  }

  async function submit(a: StudentAnswer) {
    if (phase !== "asking") return;
    stopListening();
    stopSpeaking();
    answeredAt.current = timeLeft;
    setChosen(a.choice ?? a.tf ?? null);
    const answerText = a.text ?? (a.choice !== undefined ? q.options?.[a.choice] ?? "" : a.tf !== undefined ? (a.tf ? "Verdadero" : "Falso") : "");
    let g = gradeLocal(q, a);

    // Si la voz no se entendió, no se penaliza: se pide repetir.
    if (g.expressionIssue && q.type !== "open" && a.viaVoice) {
      setMicMsg(g.feedback);
      setChosen(null);
      return;
    }

    if (q.type === "open" && aiEnabled && answerText.trim()) {
      setPhase("evaluating");
      setMood("thinking");
      setBubble("Mmm… dejame pensar tu razonamiento.");
      const ai = await aiEvaluate(q, answerText, personality, Boolean(a.viaVoice));
      if (ai) {
        g = ai;
        if (g.verdict === "grave" && !q.critical) {
          g = { ...g, verdict: "incorrecta", feedback: `⚠️ Riesgo para el paciente: ${g.feedback}` };
        }
      }
    }
    applyGrade(g, answerText);
  }

  function applyGrade(g: GradeResult, answerText: string, timedOut = false) {
    setGrade(g);
    if (g.verdict === "grave") {
      sfx.alarm();
      setMood("alarm");
      const l = line(personality, "grave");
      setBubble(l);
      say(`${l} ${q.critical?.risk ?? ""}`);
      finalize(g, answerText);
      setPhase("grave");
      return;
    }
    if (g.verdict === "correcta") {
      sfx.correct();
      setMood("happy");
      const newStreak = streak + 1;
      const l = newStreak > 0 && newStreak % 5 === 0 ? line(personality, "racha") : line(personality, "correcta");
      setBubble(l);
      say(l);
      setExplained(true);
      finalize(g, answerText);
      setPhase("feedback");
      return;
    }
    // Parcial o incorrecta
    if (g.verdict === "parcial") {
      sfx.partial();
      setMood("partial");
    } else {
      sfx.wrong();
      setMood("wrong");
    }
    const l = timedOut ? line(personality, "tiempo") : line(personality, g.verdict);
    setBubble(l);
    const canRetry = allowRetry && attempt === 1 && !timedOut;
    if (canRetry) {
      setExplained(false);
      say(l);
    } else {
      setExplained(true);
      say(`${l} ${firstSentences(g.feedback, 2)}`);
      finalize(g, answerText);
    }
    setPhase("feedback");
  }

  function finalize(g: GradeResult, answerText: string) {
    const retried = attempt > 1;
    const newStreak = g.verdict === "correcta" ? streak + 1 : 0;
    const fast = timed && g.verdict === "correcta" && (answeredAt.current ?? 0) > totalTime / 2;
    const xp = xpFor({ verdict: g.verdict, level: q.level, type: q.type, streak: g.verdict === "correcta" ? streak : 0, fast, retry: retried });
    setStreak(newStreak);
    setBestStreak((b) => Math.max(b, newStreak));
    setItems((arr) => [...arr, { q, grade: g, xp, answer: answerText, retried }]);
    if (xp > 0) setXpFloat({ n: xp, k: Date.now() });

    // Persistencia inmediata (si sale a mitad de sesión no se pierde).
    const p = getProgress();
    p.xp += xp;
    p.bestStreak = Math.max(p.bestStreak, newStreak);
    const wasPending = q.id in p.wrong;
    // Acertar al primer intento saca la pregunta de la Revancha; cualquier error (aunque luego corrija) la agrega.
    if (g.verdict === "correcta" && !retried) delete p.wrong[q.id];
    else p.wrong[q.id] = (p.wrong[q.id] ?? 0) + 1;
    if (g.verdict === "grave") p.graveCount += 1;
    p.history.push({
      questionId: q.id,
      moduleId: q.moduleId,
      verdict: g.verdict,
      score: g.score,
      xp,
      answerText: answerText.slice(0, 300),
      at: Date.now(),
      revanchaOk: config.mode === "revancha" && wasPending && g.verdict === "correcta" && !retried,
    });
    setProgress(p);
  }

  function retry() {
    sfx.click();
    if (typeof chosen === "number") setDisabledOpts((d) => [...d, chosen]);
    setChosen(null);
    setText("");
    setGrade(null);
    setAttempt(2);
    setPhase("asking");
  }

  function revealExplanation() {
    if (!grade) return;
    setExplained(true);
    finalize(grade, text || (typeof chosen === "number" ? q.options?.[chosen] ?? "" : String(chosen ?? "")));
    say(firstSentences(grade.feedback, 2));
  }

  function next() {
    sfx.click();
    stopSpeaking();
    if (idx + 1 >= questions.length) {
      const p = getProgress();
      p.sessions += 1;
      const earned = newBadges(p);
      p.badges.push(...earned);
      setProgress(p);
      if (earned.length || rankFor(p.xp).level > rankFor(xpBefore).level) sfx.levelUp();
      onFinish({
        items,
        xp: items.reduce((s, i) => s + i.xp, 0),
        graves: items.filter((i) => i.grade.verdict === "grave").length,
        bestStreak,
        newBadges: earned,
        xpBefore,
        xpAfter: p.xp,
      });
      return;
    }
    setIdx(idx + 1);
    setAttempt(1);
    setGrade(null);
    setExplained(false);
    setDisabledOpts([]);
    setChosen(null);
    setText("");
    setMicMsg("");
    setViaVoice(false);
    setRecoveryPick(null);
    setPhase("asking");
  }

  function pickRecovery(i: number) {
    const r = q.critical!.recovery;
    setRecoveryPick(i);
    if (i === r.answer) {
      sfx.correct();
      setMood("happy");
      const l = line(personality, "recuperacionOk");
      setBubble(l);
      say(`${l} ${r.explanation}`);
    } else {
      sfx.wrong();
      setMood("wrong");
      setBubble("No. Leé la explicación y volvé a intentarlo: esta no se saltea.");
      say(`No. ${r.explanation}`);
    }
  }

  const mod = moduleById(q.moduleId);
  const answeredCount = items.length;
  const correctCount = items.filter((i) => i.grade.verdict === "correcta").length;
  const sessionXp = items.reduce((s, i) => s + i.xp, 0);
  const showNext = (phase === "feedback" && explained) || (phase === "recovery" && recoveryPick === q.critical?.recovery.answer);

  return (
    <section className={`relative flex flex-col gap-4 ${phase === "grave" ? "flash-red rounded-3xl" : ""}`}>
      {/* HUD */}
      <div className="card flex flex-col gap-2 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-white/70">
            {idx + 1}/{questions.length} · {mod?.icon} {mod?.short}
          </span>
          <span className="flex items-center gap-3 font-bold">
            <span title="Aciertos">✅ {correctCount}</span>
            <span title="Racha" className={streak >= 3 ? "text-orange-400" : ""}>
              🔥 {streak}
            </span>
            <span className="relative text-neon-lima" title="XP de la sesión">
              ⭐ {sessionXp}
              {xpFloat && (
                <span key={xpFloat.k} className="xp-float absolute -top-4 right-0 text-xs text-neon-lima">
                  +{xpFloat.n}
                </span>
              )}
            </span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-neon-cyan to-guardia transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
        {timed && timeLeft !== null && phase === "asking" && (
          <div className="flex items-center gap-2">
            <span className={`w-10 font-display text-lg ${timeLeft <= 5 ? "text-guardia" : "text-white"}`}>{timeLeft}s</span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-linear ${timeLeft <= 5 ? "bg-guardia" : "bg-amber-400"}`}
                style={{ width: `${(timeLeft / totalTime) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Jefe + globo */}
      <div className="flex items-center gap-3">
        <div className="shrink-0">
          <Jefe mood={speaking && mood === "idle" ? "talking" : mood} speaking={speaking} size={120} />
        </div>
        <div
          key={bubble}
          className={`rise relative flex-1 rounded-2xl border p-3 text-[15px] font-semibold leading-snug ${
            mood === "alarm" ? "border-guardia bg-guardia/15" : mood === "happy" ? "border-neon-lima/50 bg-neon-lima/10" : "border-white/15 bg-white/5"
          }`}
        >
          {bubble || "…"}
        </div>
      </div>

      {/* Pregunta */}
      {(phase === "asking" || phase === "evaluating" || phase === "feedback") && (
        <div className="card rise">
          {q.caseIntro && (
            <div className="mb-3 rounded-xl border border-neon-rosa/30 bg-neon-rosa/10 p-3 text-sm">
              <span className="font-bold text-neon-rosa">🧩 Caso clínico · </span>
              {q.caseIntro}
            </div>
          )}
          <div className="mb-1 flex flex-wrap gap-2">
            <span className="chip">{typeLabel(q.type)}</span>
            <span className="chip">{LEVEL_LABEL[q.level]}</span>
            {q.caseStep && <span className="chip">Paso {q.caseStep}</span>}
          </div>
          <h2 className="mt-2 text-lg font-bold leading-snug sm:text-xl">{q.renderedPrompt}</h2>

          {q.type === "mcq" && (
            <div className="mt-4 grid gap-2">
              {q.options!.map((o, i) => {
                const isAnswer = phase === "feedback" && explained && i === q.answer;
                const isChosenWrong = phase === "feedback" && chosen === i && i !== q.answer;
                return (
                  <button
                    key={i}
                    disabled={phase !== "asking" || disabledOpts.includes(i)}
                    onClick={() => submit({ choice: i })}
                    className={`flex min-h-[52px] items-start gap-3 rounded-xl border px-4 py-3 text-left transition disabled:cursor-default ${
                      isAnswer
                        ? "border-neon-lima bg-neon-lima/15 shadow-lima"
                        : isChosenWrong
                          ? "border-guardia bg-guardia/15"
                          : disabledOpts.includes(i)
                            ? "border-white/5 bg-white/[.02] opacity-40 line-through"
                            : "border-white/15 bg-noche-800/70 hover:border-neon-cyan hover:bg-noche-700"
                    }`}
                  >
                    <span className="font-display text-neon-cyan">{LETTERS[i]}</span>
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "tf" && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[true, false].map((v) => {
                const isAnswer = phase === "feedback" && explained && v === q.tfAnswer;
                const isChosenWrong = phase === "feedback" && chosen === v && v !== q.tfAnswer;
                return (
                  <button
                    key={String(v)}
                    disabled={phase !== "asking"}
                    onClick={() => submit({ tf: v })}
                    className={`min-h-[56px] rounded-xl border text-lg font-bold transition ${
                      isAnswer ? "border-neon-lima bg-neon-lima/15" : isChosenWrong ? "border-guardia bg-guardia/15" : "border-white/15 bg-noche-800/70 hover:border-neon-cyan"
                    }`}
                  >
                    {v ? "✔ Verdadero" : "✘ Falso"}
                  </button>
                );
              })}
            </div>
          )}

          {(q.type === "open" || q.type === "calc") && phase === "asking" && (
            <form
              className="mt-4 flex flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (text.trim()) submit({ text, viaVoice });
              }}
            >
              {q.type === "open" ? (
                <textarea
                  className="input min-h-[110px]"
                  placeholder={listening ? "Te escucho…" : "Escribí tu razonamiento (o usá el micrófono)…"}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setViaVoice(false);
                  }}
                />
              ) : (
                <input
                  className="input text-2xl"
                  inputMode="decimal"
                  placeholder={listening ? "Te escucho…" : `Resultado en ${q.calcSolved?.unit}`}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setViaVoice(false);
                  }}
                />
              )}
              <button className="btn-primary" type="submit" disabled={!text.trim()}>
                Responder
              </button>
            </form>
          )}

          {phase === "asking" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {sttSupported() ? (
                <button
                  className={`btn-ghost ${listening ? "animate-pulse border-guardia text-guardia" : ""}`}
                  onClick={() => (listening ? stopListening() : startListening())}
                  type="button"
                >
                  {listening ? "⏹ Detener" : "🎙️ Responder hablando"}
                </button>
              ) : (
                config.answerMode === "oral" && <span className="text-xs text-white/50">Dictado no disponible en este navegador.</span>
              )}
              {listening && q.type !== "open" && text && <span className="text-sm italic text-white/70">«{text}»</span>}
              {micMsg && <span className="text-sm text-amber-300">{micMsg}</span>}
            </div>
          )}

          {phase === "evaluating" && <p className="mt-4 animate-pulse text-neon-cyan">El Jefe está evaluando tu razonamiento…</p>}

          {/* Corrección */}
          {phase === "feedback" && grade && (
            <div className="rise mt-4 flex flex-col gap-3">
              <VerdictBanner verdict={grade.verdict} source={grade.source} />
              {(q.type === "open" || q.type === "calc") && <p className="rounded-lg bg-white/5 p-3 text-sm italic text-white/80">Tu respuesta: «{items.at(-1)?.answer ?? text}»</p>}
              {grade.expressionIssue && grade.verdict !== "correcta" && (
                <p className="text-sm text-amber-300">🗣️ Parte del problema parece de expresión o dictado, no conceptual. Revisá cómo lo formulaste.</p>
              )}
              {!explained ? (
                <>
                  <p className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm">💡 {hintFor(q, grade)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="btn-neon" onClick={retry}>
                      🔁 Intentar de nuevo
                    </button>
                    <button className="btn-ghost" onClick={revealExplanation}>
                      📖 Ver explicación
                    </button>
                  </div>
                </>
              ) : (
                <Explanation q={q} grade={grade} onListen={() => say(grade.feedback)} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Error grave */}
      {phase === "grave" && q.critical && (
        <div className="card rise border-2 border-guardia shadow-rojo">
          <p className="font-display text-xl text-guardia">⚠ ERROR GRAVE DE SEGURIDAD</p>
          <p className="mt-1 text-sm text-white/60">Simulación detenida.</p>
          <div className="mt-3 rounded-xl bg-guardia/15 p-3">
            <p className="font-bold">Riesgo para el paciente</p>
            <p className="mt-1">{q.critical.risk}</p>
          </div>
          <div className="mt-3">
            <p className="font-bold">Conducta correcta</p>
            <p className="mt-1 whitespace-pre-line text-white/85">{q.explanation}</p>
            {q.reference && <p className="mt-2 text-xs text-white/50">📚 {q.reference}</p>}
          </div>
          <button
            className="btn-primary mt-4 w-full"
            onClick={() => {
              setPhase("recovery");
              setMood("idle");
              setBubble("Pregunta de recuperación obligatoria. Sin esta no seguimos.");
              say(`Pregunta de recuperación. ${q.critical!.recovery.prompt}`);
            }}
          >
            Ir a la pregunta de recuperación
          </button>
        </div>
      )}

      {phase === "recovery" && q.critical && (
        <div className="card rise border border-guardia/50">
          <span className="chip border-guardia/60 text-guardia">Recuperación obligatoria</span>
          <h3 className="mt-3 text-lg font-bold">{q.critical.recovery.prompt}</h3>
          <div className="mt-3 grid gap-2">
            {q.critical.recovery.options.map((o, i) => {
              const r = q.critical!.recovery;
              const solved = recoveryPick === r.answer;
              return (
                <button
                  key={i}
                  disabled={solved}
                  onClick={() => pickRecovery(i)}
                  className={`min-h-[52px] rounded-xl border px-4 py-3 text-left transition ${
                    recoveryPick === i ? (i === r.answer ? "border-neon-lima bg-neon-lima/15" : "border-guardia bg-guardia/15") : "border-white/15 bg-noche-800/70 hover:border-neon-cyan"
                  }`}
                >
                  <span className="mr-2 font-display text-neon-cyan">{LETTERS[i]}</span>
                  {o}
                </button>
              );
            })}
          </div>
          {recoveryPick !== null && <p className="rise mt-3 rounded-xl bg-white/5 p-3 text-sm">{q.critical.recovery.explanation}</p>}
        </div>
      )}

      {showNext && (
        <button className="btn-primary rise text-lg" onClick={next}>
          {idx + 1 >= questions.length ? "🏁 Ver resultados" : "Siguiente ➜"}
        </button>
      )}

      <button
        className="mt-2 self-center text-xs text-white/40 underline"
        onClick={() => {
          stopSpeaking();
          stopListening();
          onExit();
        }}
      >
        Abandonar la guardia
      </button>
    </section>
  );
}

function VerdictBanner({ verdict, source }: { verdict: GradeResult["verdict"]; source: GradeResult["source"] }) {
  const map = {
    correcta: { t: "✅ ¡Correcta!", c: "border-neon-lima/60 bg-neon-lima/10 text-neon-lima" },
    parcial: { t: "🟡 Parcialmente correcta", c: "border-amber-400/60 bg-amber-400/10 text-amber-300" },
    incorrecta: { t: "❌ Incorrecta", c: "border-guardia/60 bg-guardia/10 text-guardia" },
    grave: { t: "⚠ Error grave", c: "border-guardia bg-guardia/20 text-guardia" },
  } as const;
  return (
    <div className={`flex items-center justify-between rounded-xl border px-4 py-2 font-display ${map[verdict].c}`}>
      <span>{map[verdict].t}</span>
      <span className="font-sans text-[10px] uppercase tracking-wider text-white/50">{source === "ia" ? "evaluado por IA" : "corrección local"}</span>
    </div>
  );
}

function Explanation({ q, grade, onListen }: { q: PlayableQuestion; grade: GradeResult; onListen: () => void }) {
  return (
    <div className="rounded-xl border border-neon-cyan/30 bg-noche-950/60 p-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm text-neon-cyan">¿POR QUÉ?</p>
        <button className="chip" onClick={onListen}>
          🔊 Escuchar
        </button>
      </div>
      {grade.matchedConcepts && grade.matchedConcepts.length > 0 && grade.source === "ia" && (
        <p className="mt-2 text-sm text-neon-lima">✔ {grade.matchedConcepts.join(" · ")}</p>
      )}
      {grade.missingConcepts && grade.missingConcepts.length > 0 && grade.source === "ia" && (
        <p className="mt-1 text-sm text-amber-300">✘ Faltó: {grade.missingConcepts.join(" · ")}</p>
      )}
      <p className="mt-2 whitespace-pre-line leading-relaxed text-white/90">{grade.feedback}</p>
      {grade.source === "ia" && <p className="mt-3 whitespace-pre-line border-t border-white/10 pt-3 text-sm text-white/70">📘 Referencia docente: {q.explanation}</p>}
      {grade.followUp && <p className="mt-3 text-sm text-neon-rosa">🤔 Para pensar: {grade.followUp}</p>}
      {q.reference && <p className="mt-2 text-xs text-white/45">📚 {q.reference}</p>}
    </div>
  );
}

function typeLabel(t: PlayableQuestion["type"]) {
  return { mcq: "Opción múltiple", tf: "Verdadero / Falso", open: "Respuesta abierta", calc: "Cálculo" }[t];
}

function hintFor(q: PlayableQuestion, g: GradeResult): string {
  if (q.hint) return q.hint;
  switch (q.type) {
    case "calc":
      return "Revisá unidades y conversiones: ¿pasaste las horas a minutos? ¿Usaste el factor de goteo correcto? ¿mg o g?";
    case "open": {
      const n = g.missingConcepts?.length ?? 0;
      return n ? `Te ${n === 1 ? "falta 1 concepto clave" : `faltan ${n} conceptos clave`}. Pensá en qué, por qué y cómo.` : "Profundizá el fundamento.";
    }
    case "tf":
      return "Ojo con los absolutos: «siempre», «nunca», «reemplaza», «descarta». Pensá en una excepción.";
    default:
      return "Descartá tu opción y preguntate qué protege más al paciente y qué dice la fisiología.";
  }
}

function firstSentences(s: string, n: number): string {
  const parts = s.replace(/\n/g, " ").match(/[^.!?]+[.!?]+/g);
  return parts ? parts.slice(0, n).join(" ") : s;
}
