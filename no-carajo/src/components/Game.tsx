"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Jefe from "./Jefe";
import Setup from "./Setup";
import Play, { type SessionResult } from "./Play";
import Summary from "./Summary";
import Stats from "./Stats";
import { getProgress } from "@/lib/progress";
import { getAIStatus, type AIStatus } from "@/lib/ai-client";
import { line } from "@/lib/personality";
import { speak, stopSpeaking } from "@/lib/speech";
import { setMuted } from "@/lib/sfx";
import { load, save } from "@/lib/storage";
import type { GameConfig } from "@/lib/types";

type Screen = "welcome" | "setup" | "play" | "summary" | "stats";

export interface Prefs {
  voice: boolean;
  sfx: boolean;
  useAI: boolean;
}

const DEFAULT_CONFIG: GameConfig = {
  moduleId: "todos",
  level: "basico",
  count: 10,
  answerMode: "escrita",
  personality: "ironico",
  mode: "duelo",
};

export default function Game() {
  const [screen, setScreen] = useState<Screen>("welcome");
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [prefs, setPrefs] = useState<Prefs>({ voice: true, sfx: true, useAI: true });
  const [ai, setAI] = useState<AIStatus>({ enabled: false });
  const [result, setResult] = useState<SessionResult | null>(null);
  const [runKey, setRunKey] = useState(0);
  const [installEvt, setInstallEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    setConfig(load("nc.lastConfig", DEFAULT_CONFIG));
    setPrefs(load("nc.prefs", { voice: true, sfx: true, useAI: true }));
    getAIStatus().then(setAI);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as Event & { prompt: () => Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  useEffect(() => {
    save("nc.prefs", prefs);
    setMuted(!prefs.sfx);
    if (!prefs.voice) stopSpeaking();
  }, [prefs]);

  const say = useCallback(
    (text: string) => {
      if (!prefs.voice) return;
      speak(text, { onStart: () => setSpeaking(true), onEnd: () => setSpeaking(false) });
    },
    [prefs.voice],
  );

  const start = (cfg: GameConfig) => {
    setConfig(cfg);
    save("nc.lastConfig", cfg);
    setRunKey((k) => k + 1);
    setScreen("play");
  };

  const [pendingRevancha, setPendingRevancha] = useState(0);
  // Se recalcula al volver a cada pantalla (el progreso vive en localStorage).
  useEffect(() => setPendingRevancha(Object.keys(getProgress().wrong).length), [screen]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <TopBar
        prefs={prefs}
        setPrefs={setPrefs}
        ai={ai}
        onHome={() => {
          stopSpeaking();
          setScreen("welcome");
        }}
        showHome={screen !== "welcome"}
      />

      {screen === "welcome" && (
        <section className="rise flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <Jefe mood={speaking ? "talking" : "idle"} speaking={speaking} size={230} />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[.3em] text-neon-cyan">Academia de Enfermería</p>
            <h1 className="neon-title mt-2 font-display text-5xl leading-none text-white sm:text-7xl">¡NO, CARAJO!</h1>
            <p className="mx-auto mt-4 max-w-md text-white/75">
              Enfrentá al <strong className="text-white">Jefe de Guardia</strong>: pregunta, escucha, corrige y te explica. Podés
              equivocarte y reírte, pero no te vas sin entender por qué.
            </p>
          </div>
          <div className="flex w-full max-w-sm flex-col gap-3">
            <button
              className="btn-primary text-lg"
              onClick={() => {
                say(line(config.personality === "sinfiltro" ? "ironico" : config.personality, "intro"));
                setScreen("setup");
              }}
            >
              🚨 Entrar a la guardia
            </button>
            {pendingRevancha > 0 && (
              <button className="btn-neon" onClick={() => start({ ...config, mode: "revancha", count: Math.min(10, pendingRevancha) })}>
                🥊 Revancha ({pendingRevancha} pendientes)
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button className="btn-ghost" onClick={() => setScreen("stats")}>
                📊 Mi progreso
              </button>
              <Link href="/docente" className="btn-ghost">
                🧑‍🏫 Docente
              </Link>
            </div>
            {installEvt && (
              <button className="btn-ghost text-sm" onClick={() => installEvt.prompt().then(() => setInstallEvt(null))}>
                📲 Instalar en el teléfono
              </button>
            )}
          </div>
          <p className="max-w-md text-xs text-white/45">
            Simulador educativo. No reemplaza la supervisión clínica real, la indicación médica ni los protocolos de tu institución.
          </p>
        </section>
      )}

      {screen === "setup" && <Setup initial={config} pendingRevancha={pendingRevancha} onStart={start} />}

      {screen === "play" && (
        <Play
          key={runKey}
          config={config}
          prefs={prefs}
          aiEnabled={ai.enabled && prefs.useAI}
          onFinish={(r) => {
            setResult(r);
            setScreen("summary");
          }}
          onExit={() => setScreen("setup")}
        />
      )}

      {screen === "summary" && result && (
        <Summary
          result={result}
          config={config}
          say={say}
          onRetry={() => start(config)}
          onRevancha={(n) => start({ ...config, mode: "revancha", count: Math.min(10, n) })}
          onHome={() => setScreen("welcome")}
          onStats={() => setScreen("stats")}
        />
      )}

      {screen === "stats" && <Stats onBack={() => setScreen("welcome")} />}
    </main>
  );
}

function TopBar({
  prefs,
  setPrefs,
  ai,
  onHome,
  showHome,
}: {
  prefs: Prefs;
  setPrefs: (p: Prefs) => void;
  ai: AIStatus;
  onHome: () => void;
  showHome: boolean;
}) {
  return (
    <header className="mb-3 flex items-center justify-between gap-2">
      {showHome ? (
        <button onClick={onHome} className="font-display text-lg text-guardia" aria-label="Volver al inicio">
          ¡NO, CARAJO!
        </button>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        <span
          className={`chip ${ai.enabled ? (prefs.useAI ? "border-neon-lima/50 text-neon-lima" : "text-white/60") : "text-white/60"}`}
          title={ai.enabled ? `IA conectada (${ai.model})` : "Sin IA: corrección local determinista"}
        >
          {ai.enabled ? (
            <button onClick={() => setPrefs({ ...prefs, useAI: !prefs.useAI })}>{prefs.useAI ? "IA ON" : "IA OFF"}</button>
          ) : (
            "DEMO"
          )}
        </span>
        <button
          className="chip"
          onClick={() => setPrefs({ ...prefs, voice: !prefs.voice })}
          aria-label={prefs.voice ? "Silenciar voz" : "Activar voz"}
        >
          {prefs.voice ? "🗣️ Voz" : "🔇 Voz"}
        </button>
        <button className="chip" onClick={() => setPrefs({ ...prefs, sfx: !prefs.sfx })} aria-label="Efectos de sonido">
          {prefs.sfx ? "🔊" : "🔈"}
        </button>
      </div>
    </header>
  );
}
