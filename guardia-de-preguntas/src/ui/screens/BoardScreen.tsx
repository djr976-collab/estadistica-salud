import { useCallback } from 'react';
import { bank } from '../../content/bank';
import { anyNewQuestionLeft, categoryStats, finalUnlocked, pendingCriticalConcepts, reviewQueue, totalPoints } from '../../engine/game';
import type { CategoryId, GameState } from '../../types';
import { Avatar } from '../components/Avatar';
import { BadgeMedal, CategoryChip, ScreenTitle } from '../components/Common';
import { CategoryIcon, Icon } from '../components/Icons';
import { Wheel } from '../components/Wheel';

export type SpinPhase = 'idle' | 'spinning' | 'landed';

interface Props {
  game: GameState;
  phase: SpinPhase;
  message: string | null;
  onSpin: (animated: boolean) => void;
  onSpinEnd: () => void;
  onAnswerSpin: () => void;
  onReview: () => void;
  onRecoverCritical: (conceptId: string) => void;
  onFinal: () => void;
  onSummary: () => void;
}

export function BoardScreen({ game, phase, message, onSpin, onSpinEnd, onAnswerSpin, onReview, onRecoverCritical, onFinal, onSummary }: Props) {
  const stats = bank.categories.map((c) => ({ c, st: categoryStats(game, bank, c.id) }));
  const exhausted = new Set<CategoryId>(stats.filter((x) => x.st.available === 0).map((x) => x.c.id));
  const landed = game.pendingSpin?.category ?? null;
  const criticals = pendingCriticalConcepts(game).filter((c) => !c.finalChallenge);
  const queue = reviewQueue(game, bank);
  const unlocked = finalUnlocked(game, bank);
  const noneLeft = !anyNewQuestionLeft(game, bank);
  const busy = phase === 'spinning';
  const end = useCallback(() => onSpinEnd(), [onSpinEnd]);

  return (
    <div className="board">
      <header className="player-card">
        <Avatar id={game.player.avatarId} size={52} />
        <div className="player-info">
          <ScreenTitle className="player-name">{game.player.alias || 'Mi guardia'}</ScreenTitle>
          <p className="muted small">
            {game.badges.length} de 6 insignias · {totalPoints(game)} puntos de juego
          </p>
        </div>
      </header>

      {game.contentMode === 'demo' ? (
        <p className="demo-note">
          <Icon.Info size={16} /> Modo demostración: el contenido está en borrador y pendiente de revisión docente.
        </p>
      ) : null}

      {criticals.length > 0 ? (
        <section className="alert-critical" aria-label="Recuperaciones críticas pendientes">
          <p>
            <Icon.Alert size={18} /> <strong>Recuperación crítica pendiente.</strong> Hasta resolverla, la categoría no se completa y el
            desafío final no se habilita.
          </p>
          {criticals.map((c) => (
            <button key={c.conceptId} type="button" className="btn btn-critical btn-block" onClick={() => onRecoverCritical(c.conceptId)}>
              Resolver: {bank.byId.get(c.originQuestionId)?.competency}
            </button>
          ))}
        </section>
      ) : null}

      <section className="spin-zone" aria-label="Ruleta de categorías">
        <Wheel
          categories={bank.categories}
          rotation={game.wheelRotation}
          animate={busy}
          exhausted={exhausted}
          highlight={phase === 'landed' ? landed : null}
          onSpinEnd={end}
        />
        <div className="spin-result" aria-live="polite">
          {phase === 'spinning' ? <p className="muted">Girando…</p> : null}
          {phase === 'landed' && landed ? (
            <div className="landed">
              <p>Salió:</p>
              <CategoryChip category={landed} />
              {/* El foco pasa al resultado: el botón que lo originó deja de existir. */}
              <button type="button" className="btn btn-primary btn-block" onClick={onAnswerSpin} autoFocus>
                Responder el desafío
              </button>
            </div>
          ) : null}
          {message ? <p className="notice">{message}</p> : null}
        </div>
        {phase === 'idle' ? (
          noneLeft ? (
            <p className="notice">
              Ya respondiste todas las preguntas nuevas del banco. Para completar insignias, usá «Repasar mis errores».
            </p>
          ) : (
            <div className="spin-actions">
              <button type="button" className="btn btn-primary btn-lg btn-block" onClick={() => onSpin(true)} disabled={busy}>
                <Icon.Wheel size={22} /> Girar la ruleta
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={() => onSpin(false)} disabled={busy}>
                Elegir desafío sin animación
              </button>
            </div>
          )
        ) : null}
      </section>

      <section aria-labelledby="badges-title">
        <h2 id="badges-title" className="section-title">
          Insignias por categoría
        </h2>
        <ul className="badge-grid">
          {stats.map(({ c, st }) => (
            <li key={c.id} className={`badge-cell ${st.badge ? 'is-earned' : ''}`}>
              <BadgeMedal category={c.id} earned={st.badge} size={48} />
              <div className="badge-info">
                <span className="badge-name">{c.name}</span>
                <span className="small">
                  {Math.min(st.resolved, 3)}/3 resueltas · {st.hasNonConceptual ? 'con aplicación' : 'falta una de aplicación'}
                </span>
                {st.pendingCritical > 0 ? <span className="small tone-critical">Crítica pendiente</span> : null}
                {st.pending > 0 ? <span className="small tone-pending">{st.pending} para repasar</span> : null}
                {st.available === 0 ? <span className="small muted">Sin preguntas nuevas</span> : null}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Cada insignia se obtiene al resolver 3 preguntas diferentes de la categoría, al menos una de aplicación, sin recuperaciones
          críticas pendientes. Reconoce el logro dentro del juego: no certifica competencia clínica presencial.
        </p>
      </section>

      <section className="board-actions">
        <button type="button" className="btn btn-secondary btn-block" onClick={onReview} disabled={busy}>
          <Icon.Repeat size={20} /> Repasar mis errores {queue.length > 0 ? `(${queue.length})` : ''}
        </button>
        <button type="button" className="btn btn-final btn-block" onClick={onFinal} disabled={busy || (!unlocked && game.final.status !== 'completed')}>
          {unlocked || game.final.status === 'completed' ? <Icon.Flag size={20} /> : <Icon.Lock size={20} />}
          {game.final.status === 'completed' ? 'Desafío final completado' : bank.final.title}
        </button>
        {!unlocked && game.final.status !== 'completed' ? (
          <p className="muted small center">
            {game.badges.length < 6
              ? `Se habilita con las seis insignias (tenés ${game.badges.length}).`
              : 'Resolvé las recuperaciones críticas pendientes para habilitarlo.'}
          </p>
        ) : null}
        <button type="button" className="btn btn-ghost btn-block" onClick={onSummary} disabled={busy}>
          <Icon.Book size={20} /> Resumen de aprendizaje
        </button>
      </section>

      <ul className="legend" aria-label="Referencias de la ruleta">
        {bank.categories.map((c) => (
          <li key={c.id}>
            <span className="legend-dot" style={{ background: exhausted.has(c.id) ? '#B8C0CC' : c.color }}>
              <CategoryIcon category={c.id} size={14} />
            </span>
            {c.letter}. {c.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
