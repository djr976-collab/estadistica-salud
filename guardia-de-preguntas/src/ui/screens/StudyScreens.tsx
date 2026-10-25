import { useState } from 'react';
import { subjectBanks, subjectQuestionCount, subjects } from '../../content/subjects';
import { categoryStats, pendingCriticalConcepts, reviewQueue } from '../../engine/game';
import type { GameState } from '../../types';
import { BadgeMedal, ScreenTitle } from '../components/Common';
import { CategoryIcon, Icon } from '../components/Icons';

// ───────────────────────── Lista de materias ─────────────────────────

export function SubjectsScreen({
  games,
  onOpen,
  onBack,
}: {
  games: Record<string, GameState>;
  onOpen: (subjectId: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="subjects">
      <ScreenTitle>Repaso por materia</ScreenTitle>
      <p className="muted">
        Elegí una materia y respondé a tu ritmo. Los errores vuelven en «Repasar mis errores» y cada materia tiene su insignia.
      </p>
      <p className="demo-note">
        <Icon.Info size={16} /> Contenido en borrador, basado en contenidos habituales de la carrera: puede no coincidir con el programa de tu
        cátedra.
      </p>
      <ul className="subject-list">
        {subjects.map((s) => {
          const bank = subjectBanks.get(s.id)!;
          const game = games[s.id];
          const st = game ? categoryStats(game, bank, s.id) : null;
          const pending = game ? reviewQueue(game, bank).length : 0;
          const total = subjectQuestionCount(s.id);
          return (
            <li key={s.id}>
              <button type="button" className="subject-card" onClick={() => onOpen(s.id)} style={{ '--cat': s.color } as React.CSSProperties}>
                <span className="subject-icon" aria-hidden="true">
                  <CategoryIcon category={s.id} size={26} />
                </span>
                <span className="subject-info">
                  <span className="subject-name">{s.name}</span>
                  <span className="small muted">
                    {st ? `${st.presented} de ${total} respondidas` : `${total} preguntas`}
                    {pending ? ` · ${pending} para repasar` : ''}
                  </span>
                </span>
                {st?.badge ? <BadgeMedal category={s.id} earned size={36} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <div className="action-bar action-bar-stack">
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Volver al inicio
        </button>
      </div>
    </div>
  );
}

// ───────────────────────── Tablero de una materia ─────────────────────────

export function SubjectScreen({
  subjectId,
  game,
  message,
  onNext,
  onReview,
  onRecoverCritical,
  onSummary,
  onReset,
  onBack,
}: {
  subjectId: string;
  game: GameState;
  message: string | null;
  onNext: () => void;
  onReview: () => void;
  onRecoverCritical: (conceptId: string) => void;
  onSummary: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const bank = subjectBanks.get(subjectId)!;
  const subject = bank.categories[0];
  const st = categoryStats(game, bank, subjectId);
  const queue = reviewQueue(game, bank);
  const criticals = pendingCriticalConcepts(game);
  const total = subjectQuestionCount(subjectId);
  const goal = bank.config.completion.distinctResolved;
  const [confirmReset, setConfirmReset] = useState(false);
  const answeredTopics = new Map<string, number>();
  for (const c of Object.values(game.concepts)) {
    const topic = bank.byId.get(c.originQuestionId)?.topic;
    if (topic) answeredTopics.set(topic, (answeredTopics.get(topic) ?? 0) + 1);
  }

  return (
    <div className="subject-board">
      <header className="subject-header" style={{ '--cat': subject.color } as React.CSSProperties}>
        <span className="subject-icon" aria-hidden="true">
          <CategoryIcon category={subjectId} size={30} />
        </span>
        <div>
          <ScreenTitle className="player-name">{subject.name}</ScreenTitle>
          <p className="muted small">
            {st.presented} de {total} respondidas · {st.resolved} resueltas
          </p>
        </div>
      </header>

      <section className="card" aria-label="Progreso hacia la insignia">
        <div className="badge-progress">
          <BadgeMedal category={subjectId} earned={st.badge} size={48} />
          <div>
            <p className="badge-name">{subject.badgeName}</p>
            <p className="small">
              {st.badge
                ? 'Obtenida.'
                : `${Math.min(st.resolved, goal)} de ${goal} conceptos resueltos${st.hasNonConceptual ? '' : ' · falta una de aplicación'}${
                    st.pendingCritical ? ' · crítica pendiente' : ''
                  }`}
            </p>
          </div>
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={Math.min(st.resolved, goal)} aria-label="Conceptos resueltos para la insignia">
          <span style={{ width: `${(Math.min(st.resolved, goal) / goal) * 100}%`, background: subject.color }} />
        </div>
      </section>

      {criticals.length > 0 ? (
        <section className="alert-critical" aria-label="Recuperaciones críticas pendientes">
          <p>
            <Icon.Alert size={18} /> <strong>Recuperación crítica pendiente.</strong> La insignia no se otorga hasta resolverla.
          </p>
          {criticals.map((c) => (
            <button key={c.conceptId} type="button" className="btn btn-critical btn-block" onClick={() => onRecoverCritical(c.conceptId)}>
              Resolver: {bank.byId.get(c.originQuestionId)?.competency}
            </button>
          ))}
        </section>
      ) : null}

      <div className="board-actions">
        {st.available > 0 ? (
          <button type="button" className="btn btn-primary btn-lg btn-block" onClick={onNext}>
            <Icon.Play size={20} /> Siguiente pregunta
          </button>
        ) : (
          <p className="notice">Respondiste todas las preguntas nuevas de esta materia. Seguí con «Repasar mis errores».</p>
        )}
        {message ? <p className="notice">{message}</p> : null}
        <button type="button" className="btn btn-secondary btn-block" onClick={onReview}>
          <Icon.Repeat size={20} /> Repasar mis errores {queue.length ? `(${queue.length})` : ''}
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onSummary}>
          <Icon.Book size={20} /> Resumen de la materia
        </button>
      </div>

      <section aria-labelledby="topics-title">
        <h2 id="topics-title" className="section-title">
          Temas
        </h2>
        <ul className="topic-list">
          {subject.topics.map((t) => {
            const n = bank.questions.filter((q) => q.topic === t && !q.isRecoveryVariant).length;
            const done = answeredTopics.get(t) ?? 0;
            if (n === 0) return null;
            return (
              <li key={t}>
                <span>{t}</span>
                <span className="small muted">
                  {done}/{n}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card danger-zone">
        {!confirmReset ? (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setConfirmReset(true)}>
            Reiniciar esta materia
          </button>
        ) : (
          <div role="alertdialog" aria-labelledby="reset-subject" className="confirm">
            <p id="reset-subject">
              <strong>¿Borrar el progreso de {subject.name}?</strong> No se puede deshacer y no afecta a las demás materias ni a «Mi guardia».
            </p>
            <div className="confirm-actions">
              <button type="button" className="btn btn-danger" onClick={onReset}>
                Sí, borrar
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setConfirmReset(false)} autoFocus>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="action-bar action-bar-stack">
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Volver a las materias
        </button>
      </div>
    </div>
  );
}
