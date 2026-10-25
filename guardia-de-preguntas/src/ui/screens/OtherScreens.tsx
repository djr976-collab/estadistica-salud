import { useState } from 'react';
import { academicModeAvailability, bank, countPlayable, type Bank } from '../../content/bank';
import { finalStepState, reviewQueue, sanitizeAlias } from '../../engine/game';
import { buildSummary, finalLabel, ratioText, summaryToText } from '../../engine/summary';
import type { ContentMode, GameState, Settings } from '../../types';
import type { OfflineStatus } from '../../pwa/register';
import type { StorageKind } from '../../persistence/storage';
import { AVATARS, Avatar, GuardianEmblem } from '../components/Avatar';
import { BadgeMedal, CategoryChip, ScreenTitle } from '../components/Common';
import { Icon } from '../components/Icons';

// ───────────────────────── Inicio ─────────────────────────

interface HomeProps {
  game: GameState | null;
  settings: Settings;
  storageKind: StorageKind | null;
  offline: OfflineStatus;
  updateAvailable: boolean;
  onContinue: () => void;
  onStudy: () => void;
  onNew: () => void;
  onReview: () => void;
  onSummary: () => void;
  onHelp: () => void;
  onSettings: (s: Settings) => void;
  onReset: () => void;
  onRetryOffline: () => void;
  onApplyUpdate: () => void;
}

export function offlineText(s: OfflineStatus): { text: string; tone: 'ok' | 'warn' | 'muted' } {
  switch (s.state) {
    case 'ready':
      return { text: `Preparación sin conexión completa (${s.total} recursos, versión ${s.version}). Probá abrirlo en modo avión antes de la clase.`, tone: 'ok' };
    case 'incomplete':
      return { text: `Preparación sin conexión incompleta: faltan ${s.missing} de ${s.total} recursos.`, tone: 'warn' };
    case 'preparing':
      return { text: 'Preparando el juego para usarlo sin conexión…', tone: 'muted' };
    case 'failed':
      return { text: `No se completó la preparación sin conexión: ${s.message}`, tone: 'warn' };
    case 'unsupported':
      return { text: 'Este navegador o esta dirección (sin HTTPS) no permite el uso sin conexión. El juego necesita internet para abrir.', tone: 'warn' };
    case 'dev':
      return { text: 'Modo desarrollo: el uso sin conexión solo se prepara en la versión compilada.', tone: 'muted' };
  }
}

export function HomeScreen(p: HomeProps) {
  const off = offlineText(p.offline);
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <div className="home">
      <div className="hero">
        <GuardianEmblem size={84} />
        <ScreenTitle className="hero-title">Guardia de Preguntas</ScreenTitle>
        <p className="hero-sub">Poné en juego lo que sabés. Fundamentá cómo cuidás.</p>
        <p className="muted small">Práctica Profesional II · Enfermería</p>
      </div>

      <div className="home-actions">
        {p.game ? (
          <>
            <button type="button" className="btn btn-primary btn-lg btn-block" onClick={p.onContinue}>
              <Icon.Play size={20} /> Continuar mi guardia
            </button>
            <button type="button" className="btn btn-secondary btn-block" onClick={p.onReview}>
              <Icon.Repeat size={20} /> Repasar mis errores ({reviewQueue(p.game, bank).length})
            </button>
            <button type="button" className="btn btn-ghost btn-block" onClick={p.onSummary}>
              <Icon.Book size={20} /> Resumen de aprendizaje
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={p.onNew}>
            <Icon.Play size={20} /> Empezar «Mi guardia»
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-block home-study" onClick={p.onStudy}>
          <Icon.Book size={20} /> Repaso por materia
        </button>
        <p className="muted small center">Anatomía, Fisiología, Bioquímica, Farmacología, Infectología, Epidemiología, Comunitaria e Inglés técnico.</p>
        <button type="button" className="btn btn-ghost btn-block" disabled aria-describedby="duel-note">
          Duelo local (dos jugadores en un celular)
        </button>
        <p id="duel-note" className="muted small center">
          Próxima etapa: todavía no está disponible. No hay partidas en línea entre celulares.
        </p>
        <button type="button" className="btn btn-ghost btn-block" onClick={p.onHelp}>
          <Icon.Info size={20} /> Cómo se juega y sobre el contenido
        </button>
      </div>

      <section className="card" aria-labelledby="settings-title">
        <h2 id="settings-title" className="card-title">
          Preferencias
        </h2>
        <label className="toggle">
          <input type="checkbox" checked={p.settings.sound} onChange={(e) => p.onSettings({ ...p.settings, sound: e.target.checked })} />
          <span>Sonido (apagado por defecto)</span>
        </label>
        <label className="field">
          <span>Animaciones</span>
          <select value={p.settings.motion} onChange={(e) => p.onSettings({ ...p.settings, motion: e.target.value as Settings['motion'] })}>
            <option value="auto">Según la preferencia del dispositivo</option>
            <option value="reduce">Reducidas (sin giro de ruleta)</option>
            <option value="full">Completas</option>
          </select>
        </label>
      </section>

      <section className="card status-card" aria-label="Estado del dispositivo">
        <p className={`tone-${off.tone}`}>{off.text}</p>
        {p.offline.state === 'failed' || p.offline.state === 'incomplete' ? (
          <button type="button" className="btn btn-ghost" onClick={p.onRetryOffline}>
            Reintentar preparación
          </button>
        ) : null}
        {p.updateAvailable ? (
          <div className="update">
            <p>Hay una versión nueva del juego. Tu progreso se conserva al actualizar.</p>
            <button type="button" className="btn btn-secondary" onClick={p.onApplyUpdate}>
              Actualizar ahora
            </button>
          </div>
        ) : null}
        <p className={p.storageKind === 'memory' ? 'tone-warn' : 'muted small'}>
          {p.storageKind === 'memory'
            ? 'Este navegador no permite guardar datos (por ejemplo, en navegación privada). El progreso se perderá al cerrar la página.'
            : p.storageKind
              ? 'El progreso se guarda solo en este dispositivo. No hay seguimiento centralizado del alumnado.'
              : 'Comprobando el guardado local…'}
        </p>
      </section>

      {p.game ? (
        <section className="card danger-zone">
          {!confirmReset ? (
            <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirmReset(true)}>
              Reiniciar progreso
            </button>
          ) : (
            <div role="alertdialog" aria-labelledby="reset-q" className="confirm">
              <p id="reset-q">
                <strong>¿Borrar toda la guardia?</strong> Se eliminan respuestas, insignias y resumen de este dispositivo. No se puede
                deshacer. Si querés conservarlo, exportá el CSV antes.
              </p>
              <div className="confirm-actions">
                <button type="button" className="btn btn-danger" onClick={p.onReset}>
                  Sí, borrar progreso
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)} autoFocus>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

// ───────────────────────── Configuración de la guardia ─────────────────────────

export function SetupScreen({ onStart, onBack }: { onStart: (alias: string, avatarId: string, mode: ContentMode) => void; onBack: () => void }) {
  const [alias, setAlias] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0].id);
  const academic = academicModeAvailability(bank);
  const [mode, setMode] = useState<ContentMode>('demo');
  return (
    <form
      className="setup"
      onSubmit={(e) => {
        e.preventDefault();
        onStart(sanitizeAlias(alias), avatar, mode);
      }}
    >
      <ScreenTitle>Preparar mi guardia</ScreenTitle>
      <label className="field">
        <span>Alias (opcional)</span>
        <input value={alias} maxLength={24} onChange={(e) => setAlias(e.target.value)} placeholder="Por ejemplo: Turno Noche" autoComplete="off" />
        <span className="muted small">No uses tu nombre completo, DNI, correo ni datos de pacientes.</span>
      </label>

      <fieldset className="avatar-pick">
        <legend>Elegí tu avatar</legend>
        <div className="avatar-grid">
          {AVATARS.map((a) => (
            <label key={a.id} className={`avatar-option ${avatar === a.id ? 'is-selected' : ''}`}>
              <input type="radio" name="avatar" value={a.id} checked={avatar === a.id} onChange={() => setAvatar(a.id)} />
              <Avatar id={a.id} size={64} />
              <span className="sr-only">{a.label}</span>
            </label>
          ))}
        </div>
        <p className="muted small">Ambo con chaqueta blanca, pantalón rojo y calzado cerrado. El círculo punteado es el lugar del emblema institucional autorizado.</p>
      </fieldset>

      <fieldset className="mode-pick">
        <legend>Contenido</legend>
        <label className="radio-row">
          <input type="radio" name="mode" checked={mode === 'demo'} onChange={() => setMode('demo')} />
          <span>
            <strong>Demostración</strong> — {countPlayable(bank, 'demo')} preguntas, incluye borradores identificados como pendientes de revisión docente.
          </span>
        </label>
        <label className={`radio-row ${academic.available ? '' : 'is-disabled'}`}>
          <input type="radio" name="mode" checked={mode === 'academic'} disabled={!academic.available} onChange={() => setMode('academic')} />
          <span>
            <strong>Académico</strong> — solo preguntas aprobadas por la cátedra.{' '}
            {academic.available
              ? `${academic.approved} preguntas aprobadas.`
              : `No disponible: hay ${academic.approved} preguntas aprobadas y faltan en: ${academic.missing.join(', ')}.`}
          </span>
        </label>
      </fieldset>

      <div className="action-bar action-bar-stack">
        <button type="submit" className="btn btn-primary btn-block">
          Empezar la guardia
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Volver
        </button>
      </div>
    </form>
  );
}

// ───────────────────────── Repasar mis errores ─────────────────────────

export function ReviewScreen({
  game,
  onStart,
  onBack,
  areaBank = bank,
  backLabel = 'Volver al tablero',
}: {
  game: GameState;
  onStart: (conceptId: string) => void;
  onBack: () => void;
  areaBank?: Bank;
  backLabel?: string;
}) {
  const queue = reviewQueue(game, areaBank);
  return (
    <div className="review">
      <ScreenTitle>Repasar mis errores</ScreenTitle>
      <p className="muted">
        Los conceptos que respondiste de forma incorrecta vuelven con una pregunta equivalente cuando el banco la tiene. Si no, se repite la
        misma pregunta y se indica. Los críticos están primero.
      </p>
      {queue.length === 0 ? (
        <p className="notice">No tenés conceptos pendientes. ¡Buen trabajo!</p>
      ) : (
        <ul className="review-list">
          {queue.map((item) => (
            <li key={item.concept.conceptId} className={`review-item ${item.concept.status === 'pending_critical' ? 'is-critical' : ''}`}>
              <CategoryChip category={item.concept.category} short />
              <p className="review-comp">{item.origin.competency}</p>
              <p className="small">
                {item.concept.status === 'pending_critical' ? <strong className="tone-critical">Crítico pendiente · </strong> : null}
                {item.concept.errorCount} {item.concept.errorCount === 1 ? 'error' : 'errores'} ·{' '}
                {item.hasNewVariant ? 'hay una pregunta nueva equivalente' : 'sin variante: se repetirá la misma pregunta'}
              </p>
              {item.ready ? (
                <button type="button" className="btn btn-secondary btn-block" onClick={() => onStart(item.concept.conceptId)}>
                  Repasar este concepto
                </button>
              ) : (
                <p className="small muted">
                  Para espaciar el repaso, se habilita después de {item.waitFor} {item.waitFor === 1 ? 'respuesta' : 'respuestas'} más.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="action-bar">
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          {backLabel}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Desafío final ─────────────────────────

export function FinalCase({ compact = false }: { compact?: boolean }) {
  const f = bank.final;
  if (compact) {
    return (
      <details className="final-case">
        <summary>Datos del caso: {f.caseTitle}</summary>
        {f.caseIntro.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </details>
    );
  }
  return (
    <section className="card final-case-card">
      <h2 className="card-title">{f.caseTitle}</h2>
      {f.caseIntro.map((t) => (
        <p key={t}>{t}</p>
      ))}
    </section>
  );
}

export function FinalSteps({ game }: { game: GameState }) {
  return (
    <ol className="final-steps" aria-label="Decisiones del caso">
      {bank.final.steps.map((s, i) => {
        const st = finalStepState(game, bank, i);
        return (
          <li key={s.label} className={`final-step is-${st}`}>
            <span className="final-step-n">{i + 1}</span> {s.label}
          </li>
        );
      })}
    </ol>
  );
}

export function FinalIntroScreen({ game, onStart, onBack }: { game: GameState; onStart: () => void; onBack: () => void }) {
  const g = bank.config.guardian;
  return (
    <div className="final-intro">
      <ScreenTitle>{bank.final.title}</ScreenTitle>
      <div className="guardian-card">
        <GuardianEmblem size={64} />
        <div>
          <p className="guardian-name">{g.name}</p>
          <p className="muted small">{g.title}</p>
        </div>
      </div>
      <p className="guardian-speech">{g.phrases.intro}</p>
      <FinalSteps game={game} />
      <FinalCase />
      <p className="muted small">Tres decisiones encadenadas sobre el mismo paciente: reconocer, actuar con seguridad y comunicar.</p>
      <div className="action-bar action-bar-stack">
        <button type="button" className="btn btn-final btn-block" onClick={onStart}>
          {game.final.status === 'in_progress' ? 'Retomar el caso' : 'Comenzar el caso'}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Volver al tablero
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Resumen ─────────────────────────

export function SummaryScreen({
  game,
  onCopy,
  onExport,
  onBack,
  copyStatus,
  areaBank = bank,
}: {
  game: GameState;
  onCopy: (text: string) => void;
  onExport: () => void;
  onBack: () => void;
  copyStatus: string | null;
  areaBank?: Bank;
}) {
  const s = buildSummary(game, areaBank);
  const text = summaryToText(s, areaBank);
  const hasFinal = areaBank.final.stepQuestionIds.length > 0;
  const single = areaBank.categories.length === 1 ? areaBank.categories[0] : null;
  return (
    <div className="summary">
      <ScreenTitle>{single ? `Resumen · ${single.name}` : 'Resumen de aprendizaje'}</ScreenTitle>
      <p className="muted small">
        Los puntos y las insignias reconocen logros dentro del juego: no son una nota académica ni certifican competencia clínica.
      </p>
      <div className="stat-grid">
        <div className="stat">
          <span className="stat-n">
            {s.categoriesWorked.num}/{s.categoriesWorked.den}
          </span>
          <span className="stat-l">categorías trabajadas</span>
        </div>
        <div className="stat">
          <span className="stat-n">{s.distinctAnswered}</span>
          <span className="stat-l">preguntas distintas respondidas ({s.totalAttempts} intentos)</span>
        </div>
        <div className="stat">
          <span className="stat-n">{ratioText(s.firstTryCorrect)}</span>
          <span className="stat-l">aciertos en primer intento (sobre conceptos respondidos por primera vez)</span>
        </div>
        <div className="stat">
          <span className="stat-n">{ratioText(s.recoveries)}</span>
          <span className="stat-l">recuperaciones completadas (sobre conceptos con error)</span>
        </div>
      </div>

      <section className="card">
        <h2 className="card-title">
          {s.badges.den === 1 ? `Insignia (${s.badges.num ? 'obtenida' : 'pendiente'})` : `Insignias (${s.badges.num} de ${s.badges.den})`}
        </h2>
        <ul className="badge-row">
          {s.perCategory.map((c) => (
            <li key={c.category}>
              <BadgeMedal category={c.category} earned={c.badge} size={44} />
              <span className="small">
                {areaBank.categoryById[c.category].shortName}: {c.resolved}/{c.presented}
              </span>
            </li>
          ))}
        </ul>
        {hasFinal ? <p className="small">Desafío final: {finalLabel(s.finalStatus)}.</p> : null}
      </section>

      <section className="card">
        <h2 className="card-title">Errores críticos detectados</h2>
        {s.criticalErrors.length === 0 ? (
          <p>Ninguno.</p>
        ) : (
          <ul className="plain-list">
            {s.criticalErrors.map((e) => (
              <li key={e.conceptId}>
                <span className={e.resolved ? 'tone-ok' : 'tone-critical'}>{e.resolved ? 'Recuperado' : 'Pendiente'}</span> · {e.competency}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Conceptos pendientes</h2>
        {s.pendingConcepts.length === 0 ? (
          <p>Ninguno.</p>
        ) : (
          <ul className="plain-list">
            {s.pendingConcepts.map((p) => (
              <li key={p.conceptId}>
                {p.competency} ({areaBank.categoryById[p.category].shortName}){p.critical ? ' · crítico' : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Recomendaciones de repaso</h2>
        {s.recommendations.length === 0 ? <p>Todavía no hay respuestas para analizar.</p> : null}
        <ul className="plain-list">
          {s.recommendations.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <p className="small">Puntos de juego: {s.points}</p>

      <div className="action-bar action-bar-stack">
        <button type="button" className="btn btn-secondary btn-block" onClick={() => onCopy(text)}>
          <Icon.Copy size={20} /> Copiar informe
        </button>
        <button type="button" className="btn btn-secondary btn-block" onClick={onExport} disabled={game.attempts.length === 0}>
          <Icon.Download size={20} /> Exportar resultados (CSV)
        </button>
        <p className="small center" aria-live="polite">
          {copyStatus ?? ''}
        </p>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Volver
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Ayuda ─────────────────────────

export function HelpScreen({ onBack }: { onBack: () => void }) {
  const p = bank.config.points;
  return (
    <div className="help">
      <ScreenTitle>Cómo se juega</ScreenTitle>
      <section className="card">
        <ol className="plain-list numbered">
          <li>Girá la ruleta (o elegí el desafío sin animación). La categoría se decide antes de girar y la ruleta se detiene en ese sector.</li>
          <li>Respondé una pregunta por vez. Tomate el tiempo que necesites: no hay puntos por rapidez.</li>
          <li>Leé la devolución: qué elegiste, cuál era la mejor respuesta, por qué y qué principio podés llevar a otras situaciones.</li>
          <li>
            Si elegís una acción insegura, la acción se detiene y aparece una instancia de recuperación. Ese concepto queda pendiente hasta
            resolverla, y ningún puntaje lo compensa.
          </li>
          <li>Cada categoría da una insignia al resolver 3 preguntas distintas (al menos una de aplicación) sin críticas pendientes.</li>
          <li>Con las seis insignias se habilita «{bank.final.title}»: un caso con tres decisiones encadenadas.</li>
          <li>En «Repasar mis errores» vuelven los conceptos que te costaron, con preguntas equivalentes cuando existen.</li>
          <li>
            Para estudiar, «Repaso por materia» ofrece 20 preguntas por materia (Anatomía, Fisiología, Bioquímica, Farmacología, Infectología,
            Epidemiología, Enfermería Comunitaria e Inglés técnico), con su propio repaso, resumen e insignia. No modifica tu «Mi guardia».
          </li>
        </ol>
      </section>
      <section className="card">
        <h2 className="card-title">Puntos de juego</h2>
        <p>
          Conceptual: {p.conceptual} · Aplicación: {p.aplicacion} · Integración: {p.integracion}. Tras una recuperación se otorga la mitad.
          Los puntos no son una nota académica.
        </p>
      </section>
      <section className="card">
        <h2 className="card-title">Sobre el contenido</h2>
        <p>
          Banco versión {bank.bankVersion}. Las preguntas, casos y devoluciones son originales y ficticios, redactados con asistencia de
          inteligencia artificial. <strong>Todo el contenido está en estado de borrador</strong> hasta que la cátedra lo revise y apruebe; por eso
          el juego funciona en modo demostración.
        </p>
        <p>
          Las fuentes citadas son documentos verificables (OMS, OPS, CDC, AHA, IHI, AHRQ, entre otros). Se comprobó que existen, pero el
          apartado citado debe revisarlo la cátedra. Los cálculos usan datos ficticios: no reemplazan la indicación médica, la ficha técnica
          del producto ni el protocolo institucional.
        </p>
        <p>
          Las categorías son una base configurable y no representan el programa oficial de Práctica Profesional II hasta que la cátedra lo
          valide.
        </p>
        <p>Privacidad: el alias es opcional y todo se guarda solo en este dispositivo. No se piden datos personales ni de pacientes.</p>
      </section>
      <div className="action-bar">
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Volver
        </button>
      </div>
    </div>
  );
}
