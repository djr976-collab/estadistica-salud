import { bank } from '../../content/bank';
import { formatNumber } from '../../engine/evaluate';
import type { Attempt, ConceptRecord, Presentation, Question } from '../../types';
import { QuestionMeta, ReviewStatusNote, ScreenTitle, SourcesList } from '../components/Common';
import { Icon } from '../components/Icons';
import { GuardianEmblem } from '../components/Avatar';

interface Props {
  q: Question;
  presentation: Presentation;
  attempt: Attempt;
  concept: ConceptRecord;
  onContinue: () => void;
  onRecover: () => void;
  onLater: () => void;
}

function outcomeLabel(a: Attempt, c: ConceptRecord): { text: string; tone: string } {
  if (a.correct && a.firstOnConcept && !a.isRepeat) return { text: 'Acierto en primer intento', tone: 'ok' };
  if (a.correct) return { text: 'Acierto tras recuperación: el concepto queda resuelto', tone: 'ok' };
  if (c.status === 'pending_critical') return { text: 'Competencia crítica pendiente: necesitás resolver la recuperación', tone: 'critical' };
  return { text: 'Concepto pendiente: volverá en «Repasar mis errores»', tone: 'pending' };
}

export function FeedbackScreen({ q, presentation, attempt, concept, onContinue, onRecover, onLater }: Props) {
  const critical = attempt.critical;
  const outcome = outcomeLabel(attempt, concept);
  const chosen = attempt.chosenOptionId ? q.options.find((o) => o.id === attempt.chosenOptionId) : null;
  const correct = q.options.find((o) => o.id === q.correctOptionId) ?? null;
  const others = q.options.filter((o) => o.id !== attempt.chosenOptionId && o.id !== q.correctOptionId);
  const inFinal = presentation.context === 'final';

  const title = attempt.correct ? 'Bien fundamentado' : critical ? 'Acción detenida' : 'Revisemos esta decisión';

  return (
    <div className="feedback-screen">
      <div className={`feedback-head ${attempt.correct ? 'is-ok' : critical ? 'is-critical' : 'is-review'}`}>
        <span className="feedback-icon" aria-hidden="true">
          {attempt.correct ? <Icon.Check size={28} /> : critical ? <Icon.Stop size={28} /> : <Icon.Repeat size={28} />}
        </span>
        <div>
          <ScreenTitle>{title}</ScreenTitle>
          <p className={`outcome tone-${outcome.tone}`}>{outcome.text}</p>
          {attempt.isRepeat ? <p className="outcome-note">Esta pregunta ya la habías visto en esta guardia.</p> : null}
        </div>
      </div>

      {critical ? (
        <section className="card card-critical" aria-label="Riesgo para el paciente">
          <div className="guardian-line">
            <GuardianEmblem size={44} />
            <p>
              <strong>{bank.config.guardian.name}:</strong> {bank.config.guardian.phrases.stop}
            </p>
          </div>
          <p>
            <strong>Riesgo:</strong> {q.riskNote}
          </p>
          <p className="muted">
            La acción elegida se interrumpe dentro del caso antes de llegar al paciente. Los puntos de otras preguntas no compensan
            esta competencia: queda pendiente hasta que resuelvas la recuperación.
          </p>
        </section>
      ) : null}

      <QuestionMeta q={q} />
      <section className="card">
        <h2 className="card-title">Consigna</h2>
        <p>{q.stem}</p>
      </section>

      {q.type === 'numeric' ? (
        <section className="card">
          <h2 className="card-title">Tu respuesta</h2>
          <p className={`answer-line ${attempt.correct ? 'is-ok' : 'is-wrong'}`}>
            {attempt.numericInput} {q.unit}
          </p>
          <h2 className="card-title">Resultado esperado</h2>
          <p className="answer-line is-ok">
            {formatNumber(q.numericAnswer!)} {q.unit}{' '}
            <span className="muted">
              (se acepta ±{formatNumber(q.tolerance ?? 0)} {q.unit})
            </span>
          </p>
          <p className="muted">{q.rounding}</p>
          {!attempt.correct && q.numericFeedback ? <p>{q.numericFeedback}</p> : null}
        </section>
      ) : (
        <section className="card">
          <h2 className="card-title">Tu elección</h2>
          {chosen ? (
            <div className={`answer-block ${attempt.correct ? 'is-ok' : 'is-wrong'}`}>
              <p className="answer-text">{chosen.text}</p>
              <p>{chosen.feedback}</p>
            </div>
          ) : null}
          {!attempt.correct && correct ? (
            <>
              <h2 className="card-title">Mejor respuesta</h2>
              <div className="answer-block is-ok">
                <p className="answer-text">{correct.text}</p>
                <p>{correct.feedback}</p>
              </div>
            </>
          ) : null}
          {others.length > 0 ? (
            <details className="other-options">
              <summary>Ver por qué las otras opciones no son la mejor respuesta</summary>
              {others.map((o) => (
                <div key={o.id} className="answer-block">
                  <p className="answer-text">{o.text}</p>
                  <p>{o.feedback}</p>
                </div>
              ))}
            </details>
          ) : null}
        </section>
      )}

      <section className="card">
        <h2 className="card-title">Por qué</h2>
        <p>{q.rationale}</p>
        <h2 className="card-title">Principio para llevarte</h2>
        <p className="principle">{q.transferPrinciple}</p>
      </section>

      <section className="card">
        <h2 className="card-title">Fuentes</h2>
        <SourcesList q={q} />
        <ReviewStatusNote q={q} />
      </section>

      <div className="action-bar action-bar-stack">
        {critical ? (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={inFinal ? onContinue : onRecover}>
              <Icon.Repeat size={20} /> Resolver la instancia de recuperación
            </button>
            {!inFinal ? (
              <button type="button" className="btn btn-ghost btn-block" onClick={onLater}>
                Volver al tablero (queda pendiente)
              </button>
            ) : null}
          </>
        ) : (
          <button type="button" className="btn btn-primary btn-block" onClick={onContinue}>
            Continuar
          </button>
        )}
      </div>
    </div>
  );
}
