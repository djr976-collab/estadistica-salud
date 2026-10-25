import { useCallback, useEffect, useRef, useState } from 'react';
import { bank } from './content/bank';
import { subjectBanks } from './content/subjects';
import {
  answer,
  closeFeedback,
  currentAttempt,
  dismissCelebration,
  newGame,
  presentFromSpin,
  presentNext,
  reconcileWithBank,
  spin,
  startFinal,
  startRecovery,
  type AnswerInput,
} from './engine/game';
import { attemptsToRows, exportFileName, toCsv } from './export/csv';
import { KEYS, openBestStore, type KeyValueStore } from './persistence/storage';
import { registerPwa, type OfflineStatus, type PwaController } from './pwa/register';
import type { ContentMode, GameState, Settings } from './types';
import { Icon } from './ui/components/Icons';
import { Celebration, PauseOverlay } from './ui/components/Overlays';
import { BoardScreen, type SpinPhase } from './ui/screens/BoardScreen';
import { FeedbackScreen } from './ui/screens/FeedbackScreen';
import { FinalCase, FinalIntroScreen, FinalSteps, HelpScreen, HomeScreen, ReviewScreen, SetupScreen, SummaryScreen } from './ui/screens/OtherScreens';
import { QuestionScreen } from './ui/screens/QuestionScreen';
import { SubjectScreen, SubjectsScreen } from './ui/screens/StudyScreens';
import { play } from './ui/sfx';

type Screen = 'home' | 'setup' | 'board' | 'review' | 'final-intro' | 'summary' | 'help' | 'subjects' | 'subject';

const DEFAULT_SETTINGS: Settings = { sound: false, motion: 'auto' };

function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Respaldo para navegadores sin API de portapapeles o sin permiso.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export default function App() {
  const [store, setStore] = useState<KeyValueStore | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [game, setGame] = useState<GameState | null>(null);
  // Repaso por materia: una partida por materia, independiente de «Mi guardia».
  const [studyGames, setStudyGames] = useState<Record<string, GameState>>({});
  const [subject, setSubject] = useState<string | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [screen, setScreen] = useState<Screen>('home');
  const [returnTo, setReturnTo] = useState<Screen>('board');
  const [summaryBack, setSummaryBack] = useState<Screen>('board');
  const [phase, setPhase] = useState<SpinPhase>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [offline, setOffline] = useState<OfflineStatus>({ state: 'preparing' });
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const pwa = useRef<PwaController | null>(null);
  const spinLock = useRef(false);

  const systemReduce = usePrefersReducedMotion();
  const reduceMotion = settings.motion === 'reduce' || (settings.motion === 'auto' && systemReduce);

  // Carga inicial: almacenamiento, partida guardada y Service Worker.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await openBestStore();
      const savedGame = await s.get<GameState>(KEYS.game).catch(() => undefined);
      const savedSettings = await s.get<Settings>(KEYS.settings).catch(() => undefined);
      const savedStudy = await s.get<Record<string, GameState>>(KEYS.study).catch(() => undefined);
      if (cancelled) return;
      setStore(s);
      if (savedGame && savedGame.schemaVersion === 1) {
        const g = reconcileWithBank(savedGame, bank);
        setGame(g);
        if (g.pendingSpin) setPhase('landed');
      }
      if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...savedSettings });
      if (savedStudy) {
        const restored: Record<string, GameState> = {};
        for (const [id, g] of Object.entries(savedStudy)) {
          const b = subjectBanks.get(id);
          if (b && g?.schemaVersion === 1) restored[id] = reconcileWithBank(g, b);
        }
        setStudyGames(restored);
      }
      setLoaded(true);
      void navigator.storage?.persist?.().catch(() => undefined);
    })();
    pwa.current = registerPwa((st, upd) => {
      setOffline(st);
      setUpdateAvailable(upd);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Guardado continuo: cada cambio de la partida se persiste.
  useEffect(() => {
    if (!store || !loaded) return;
    const op = game ? store.set(KEYS.game, game) : store.remove(KEYS.game);
    op.then(() => setSaveError(false)).catch(() => setSaveError(true));
  }, [game, store, loaded]);

  useEffect(() => {
    if (!store || !loaded) return;
    store.set(KEYS.settings, settings).catch(() => undefined);
  }, [settings, store, loaded]);

  useEffect(() => {
    if (!store || !loaded) return;
    store.set(KEYS.study, studyGames).then(() => setSaveError(false)).catch(() => setSaveError(true));
  }, [studyGames, store, loaded]);

  // Sesión activa: «Mi guardia» o la materia abierta. Las preguntas, devoluciones,
  // recuperaciones, repaso y resumen funcionan igual en ambos casos.
  const activeBank = subject ? subjectBanks.get(subject)! : bank;
  const activeGame = subject ? studyGames[subject] ?? null : game;
  const setActive = (g: GameState) => {
    if (subject) setStudyGames((prev) => ({ ...prev, [subject]: g }));
    else setGame(g);
  };
  const homeOfSession: Screen = subject ? 'subject' : 'board';

  useEffect(() => {
    document.documentElement.dataset.motion = reduceMotion ? 'reduce' : 'full';
  }, [reduceMotion]);

  const go = (s: Screen) => {
    setMessage(null);
    setCopyStatus(null);
    // Salir a una pantalla de «Mi guardia» o al inicio cierra la materia abierta.
    if (['home', 'subjects', 'board', 'setup', 'final-intro', 'help'].includes(s)) setSubject(null);
    setScreen(s);
  };

  const openSubject = (id: string) => {
    if (!studyGames[id]) {
      const g = newGame({ alias: game?.player.alias ?? '', avatarId: game?.player.avatarId ?? 'a1', contentMode: 'demo' });
      setStudyGames((prev) => ({ ...prev, [id]: g }));
    }
    setSubject(id);
    setMessage(null);
    setCopyStatus(null);
    setScreen('subject');
  };

  const handleNext = () => {
    if (!subject || !activeGame) return;
    const p = presentNext(activeGame, activeBank, subject);
    if (!p.ok) {
      setMessage('No quedan preguntas nuevas en esta materia. Seguí con «Repasar mis errores».');
      return;
    }
    setReturnTo('subject');
    setActive(p.state);
  };

  const handleResetSubject = () => {
    if (!subject) return;
    const g = newGame({ alias: game?.player.alias ?? '', avatarId: game?.player.avatarId ?? 'a1', contentMode: 'demo' });
    setStudyGames((prev) => ({ ...prev, [subject]: g }));
    setMessage('Se reinició el progreso de la materia.');
  };

  // ── Ruleta ──
  const handleSpin = (animated: boolean) => {
    if (!game || spinLock.current || phase !== 'idle') return;
    const anim = animated && !reduceMotion;
    const r = spin(game, bank, anim);
    if (!r.ok) {
      setMessage(
        r.reason === 'exhausted'
          ? 'No quedan preguntas nuevas en ninguna categoría. Usá «Repasar mis errores» para completar insignias.'
          : 'Terminá el desafío en curso antes de volver a girar.',
      );
      return;
    }
    spinLock.current = anim;
    setMessage(null);
    setGame(r.state);
    setPhase(anim ? 'spinning' : 'landed');
    play('tick', settings.sound);
  };

  const handleSpinEnd = useCallback(() => {
    spinLock.current = false;
    setPhase('landed');
  }, []);

  const handleAnswerSpin = () => {
    if (!game) return;
    const p = presentFromSpin(game, bank);
    if (!p.ok) {
      const cat = p.category ? bank.categoryById[p.category].name : 'esta categoría';
      setMessage(`${cat} no tiene preguntas disponibles en este momento. Volvé a girar: el juego no cambia de categoría por su cuenta.`);
      setGame({ ...game, pendingSpin: null });
      setPhase('idle');
      return;
    }
    setPhase('idle');
    setReturnTo('board');
    setGame(p.state);
  };

  // ── Preguntas ──
  const handleAnswer = (input: AnswerInput) => {
    if (!activeGame) return;
    const r = answer(activeGame, activeBank, input);
    if (!r.ok) return;
    setActive(r.state);
    play(r.attempt.correct ? 'correct' : r.attempt.critical ? 'stop' : 'review', settings.sound);
    if (r.state.celebration && !activeGame.celebration) play('badge', settings.sound);
  };

  const handleContinue = () => {
    if (!activeGame) return;
    const next = closeFeedback(activeGame, activeBank);
    setActive(next);
    if (!next.current) {
      setMessage(null);
      setScreen(returnTo);
    }
  };

  const handleRecoverCurrent = () => {
    if (!activeGame?.current) return;
    const q = activeBank.byId.get(activeGame.current.questionId)!;
    setActive(startRecovery(closeFeedback(activeGame, activeBank), activeBank, q.conceptId));
  };

  const handleLater = () => {
    if (!activeGame) return;
    setActive(closeFeedback(activeGame, activeBank));
    setScreen(homeOfSession);
  };

  const startRecoveryFrom = (conceptId: string, from: Screen) => {
    if (!activeGame) return;
    setReturnTo(from);
    setActive(startRecovery(activeGame, activeBank, conceptId));
  };

  // ── Exportación ──
  const handleExport = async () => {
    if (!activeGame) return;
    const csv = toCsv(attemptsToRows(activeGame, activeBank));
    const base = exportFileName(activeGame);
    const name = subject ? base.replace('guardia-de-preguntas_', `guardia-de-preguntas_${subject.replace('mat-', '')}_`) : base;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'text/csv' }) : null;
    // En celulares, compartir el archivo suele ser más práctico que descargarlo.
    if (file && navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
      try {
        await navigator.share({ files: [file], title: name });
        setCopyStatus('Archivo CSV listo para compartir.');
        return;
      } catch {
        /* se cae a la descarga */
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setCopyStatus(`Se descargó ${name}.`);
  };

  const handleCopy = async (text: string) => {
    const ok = await copyText(text);
    setCopyStatus(ok ? 'Informe copiado. Podés pegarlo en un mensaje o documento.' : 'No se pudo copiar automáticamente en este navegador.');
  };

  const handleReset = async () => {
    setGame(null);
    setPhase('idle');
    spinLock.current = false;
    await store?.remove(KEYS.game).catch(() => undefined);
    go('home');
  };

  const handleStart = (alias: string, avatarId: string, mode: ContentMode) => {
    setGame(newGame({ alias, avatarId, contentMode: mode }));
    setPhase('idle');
    go('board');
  };

  // ── Render ──
  const playing =
    activeGame?.current && !['home', 'help', 'summary', 'subjects', 'setup'].includes(screen) ? activeGame.current : null;
  const q = playing ? activeBank.byId.get(playing.questionId) ?? null : null;
  const attempt = activeGame && playing?.phase === 'feedback' ? currentAttempt(activeGame) : null;

  const content = (() => {
    if (!loaded) return <p className="loading">Cargando…</p>;
    if (activeGame && playing && q) {
      if (playing.phase === 'feedback' && attempt) {
        return (
          <FeedbackScreen
            key={`fb-${attempt.n}`}
            q={q}
            presentation={playing}
            attempt={attempt}
            concept={activeGame.concepts[q.conceptId]}
            onContinue={handleContinue}
            onRecover={handleRecoverCurrent}
            onLater={handleLater}
          />
        );
      }
      const finalCase =
        playing.context === 'final' ? (
          <>
            <FinalSteps game={activeGame} />
            <FinalCase compact />
          </>
        ) : undefined;
      return (
        <QuestionScreen
          key={`q-${playing.questionId}-${activeGame.presented.length}-${activeGame.attempts.length}`}
          q={q}
          presentation={playing}
          onAnswer={handleAnswer}
          finalCase={finalCase}
        />
      );
    }
    switch (screen) {
      case 'setup':
        return <SetupScreen onStart={handleStart} onBack={() => go('home')} />;
      case 'help':
        return <HelpScreen onBack={() => go(game ? 'board' : 'home')} />;
      case 'review':
        return activeGame ? (
          <ReviewScreen
            game={activeGame}
            areaBank={activeBank}
            onStart={(c) => startRecoveryFrom(c, 'review')}
            onBack={() => setScreen(homeOfSession)}
            backLabel={subject ? 'Volver a la materia' : 'Volver al tablero'}
          />
        ) : null;
      case 'subjects':
        return <SubjectsScreen games={studyGames} onOpen={openSubject} onBack={() => go('home')} />;
      case 'subject':
        return subject && activeGame ? (
          <SubjectScreen
            subjectId={subject}
            game={activeGame}
            message={message}
            onNext={handleNext}
            onReview={() => setScreen('review')}
            onRecoverCritical={(c) => startRecoveryFrom(c, 'subject')}
            onSummary={() => {
              setSummaryBack('subject');
              setScreen('summary');
            }}
            onReset={handleResetSubject}
            onBack={() => go('subjects')}
          />
        ) : null;
      case 'final-intro':
        return game ? (
          <FinalIntroScreen
            game={game}
            onStart={() => {
              setReturnTo('board');
              setGame(startFinal(game, bank));
            }}
            onBack={() => go('board')}
          />
        ) : null;
      case 'summary':
        return activeGame ? (
          <SummaryScreen
            game={activeGame}
            areaBank={activeBank}
            onCopy={handleCopy}
            onExport={handleExport}
            onBack={() => {
              setCopyStatus(null);
              setScreen(summaryBack);
            }}
            copyStatus={copyStatus}
          />
        ) : null;
      case 'board':
        if (game) {
          return (
            <BoardScreen
              game={game}
              phase={phase}
              message={message}
              onSpin={handleSpin}
              onSpinEnd={handleSpinEnd}
              onAnswerSpin={handleAnswerSpin}
              onReview={() => go('review')}
              onRecoverCritical={(c) => startRecoveryFrom(c, 'board')}
              onFinal={() => go('final-intro')}
              onSummary={() => {
                setSummaryBack('board');
                go('summary');
              }}
            />
          );
        }
        return null;
      default:
        return (
          <HomeScreen
            game={game}
            settings={settings}
            storageKind={store?.kind ?? null}
            offline={offline}
            updateAvailable={updateAvailable}
            onContinue={() => go('board')}
            onStudy={() => go('subjects')}
            onNew={() => go('setup')}
            onReview={() => go('review')}
            onSummary={() => {
              setSummaryBack('home');
              go('summary');
            }}
            onHelp={() => go('help')}
            onSettings={setSettings}
            onReset={handleReset}
            onRetryOffline={() => pwa.current?.update()}
            onApplyUpdate={() => pwa.current?.applyUpdate()}
          />
        );
    }
  })();

  const inGame = !!activeGame && !['home', 'setup', 'subjects'].includes(screen);

  return (
    <div className="app">
      <header className="topbar">
        <button
          type="button"
          className="icon-btn"
          aria-label="Ir al inicio"
          onClick={() => {
            if (phase === 'spinning') return;
            go('home');
          }}
          disabled={phase === 'spinning'}
        >
          <Icon.Home size={22} />
        </button>
        <span className="topbar-title">Guardia de Preguntas</span>
        <button
          type="button"
          className="icon-btn"
          aria-label={settings.sound ? 'Desactivar sonido' : 'Activar sonido'}
          aria-pressed={settings.sound}
          onClick={() => setSettings({ ...settings, sound: !settings.sound })}
        >
          {settings.sound ? <Icon.Sound size={22} /> : <Icon.Mute size={22} />}
        </button>
        {inGame ? (
          <button type="button" className="icon-btn" aria-label="Pausar la guardia" onClick={() => setPaused(true)} disabled={phase === 'spinning'}>
            <Icon.Pause size={22} />
          </button>
        ) : null}
      </header>
      {saveError ? (
        <p className="save-error" role="alert">
          No se pudo guardar el último cambio en este dispositivo. Si el problema sigue, exportá el CSV para no perder tus resultados.
        </p>
      ) : null}
      <main className="main" inert={paused || (!!activeGame?.celebration && !activeGame.current) ? true : undefined}>
        {content}
      </main>
      {paused ? (
        <PauseOverlay
          onResume={() => setPaused(false)}
          onHome={() => {
            setPaused(false);
            go('home');
          }}
        />
      ) : null}
      {/* La celebración aparece después de leer la devolución, nunca encima de ella. */}
      {activeGame?.celebration && !paused && !activeGame.current ? (
        <Celebration
          celebration={activeGame.celebration}
          reduceMotion={reduceMotion}
          onClose={() => {
            const wasFinal = activeGame.celebration?.kind === 'final';
            setActive(dismissCelebration(activeGame));
            if (wasFinal) {
              setSummaryBack('board');
              go('summary');
            }
          }}
        />
      ) : null}
    </div>
  );
}
