import { useId, useState } from 'react';
import { bank } from '../../content/bank';
import { NUMERIC_ERROR_MESSAGE, parseNumericInput } from '../../engine/evaluate';
import type { AnswerInput } from '../../engine/game';
import type { Presentation, Question } from '../../types';
import { QuestionMeta, ReviewStatusNote, ScreenTitle } from '../components/Common';
import { Icon } from '../components/Icons';

interface Props {
  q: Question;
  presentation: Presentation;
  onAnswer: (input: AnswerInput) => void;
  finalCase?: React.ReactNode;
}

export function contextBanner(p: Presentation): { tone: 'critical' | 'review' | 'final'; text: string } | null {
  const variant = p.isRepeat
    ? 'Pregunta repetida: el banco todavía no tiene otra variante para este concepto.'
    : 'Pregunta nueva equivalente sobre el mismo concepto.';
  if (p.context === 'recuperacion_critica') return { tone: 'critical', text: `Instancia de recuperación. ${variant}` };
  if (p.context === 'repaso') return { tone: 'review', text: `Repasar mis errores. ${variant}` };
  if (p.context === 'final' && p.recoveryFor) return { tone: 'critical', text: 'Recuperación dentro del caso: volvé a decidir.' };
  return null;
}

export function QuestionScreen({ q, presentation, onAnswer, finalCase }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [numeric, setNumeric] = useState('');
  const [error, setError] = useState<string | null>(null);
  const name = useId();
  const banner = contextBanner(presentation);
  const options = presentation.optionOrder.map((id) => q.options.find((o) => o.id === id)!).filter(Boolean);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (q.type === 'numeric') {
      const parsed = parseNumericInput(numeric);
      if (!parsed.ok) {
        setError(NUMERIC_ERROR_MESSAGE[parsed.reason]);
        return;
      }
      onAnswer({ numeric });
    } else if (selected) {
      onAnswer({ optionId: selected });
    }
  };

  const toggleSign = () => {
    setError(null);
    setNumeric((v) => (v.trim().startsWith('-') ? v.trim().slice(1) : `-${v.trim().replace(/^\+/, '')}`));
  };

  const canSubmit = q.type === 'numeric' ? numeric.trim() !== '' : selected !== null;

  return (
    <form className="question-screen" onSubmit={submit} noValidate>
      {/* El contexto del caso queda fuera del bloque fijo: así la consigna siempre entra en pantalla. */}
      {finalCase ? <div className="final-context">{finalCase}</div> : null}
      <div className="stem-card">
        <QuestionMeta q={q} />
        {banner ? <p className={`context-banner tone-${banner.tone}`}>{banner.text}</p> : null}
        <ScreenTitle className="stem">{q.stem}</ScreenTitle>
      </div>

      {q.type === 'single_choice' ? (
        <fieldset className="options">
          <legend className="sr-only">Elegí la mejor respuesta</legend>
          {options.map((o, i) => (
            <label key={o.id} className={`option ${selected === o.id ? 'is-selected' : ''}`}>
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={selected === o.id}
                onChange={() => setSelected(o.id)}
              />
              <span className="option-key" aria-hidden="true">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="option-text">{o.text}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div className="numeric">
          <label htmlFor={`${name}-num`} className="numeric-label">
            Tu resultado
          </label>
          <div className="numeric-row">
            <button type="button" className="btn btn-ghost sign-btn" onClick={toggleSign} aria-label="Cambiar signo (positivo o negativo)">
              ±
            </button>
            <input
              id={`${name}-num`}
              className="numeric-input"
              inputMode="decimal"
              autoComplete="off"
              enterKeyHint="done"
              value={numeric}
              aria-invalid={error ? true : undefined}
              aria-describedby={`${name}-rule ${name}-err`}
              onChange={(e) => {
                setNumeric(e.target.value);
                setError(null);
              }}
              placeholder="0,0"
            />
            <span className="numeric-unit">{q.unit}</span>
          </div>
          <p id={`${name}-rule`} className="numeric-rule">
            Unidad: <strong>{q.unit}</strong>. {q.rounding} Podés usar coma o punto decimal. Sin separador de miles.
          </p>
          <p id={`${name}-err`} className="numeric-error" role="alert" aria-live="assertive">
            {error ?? ''}
          </p>
        </div>
      )}

      <ReviewStatusNote q={q} />

      <div className="action-bar">
        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit}>
          <Icon.Check size={20} /> Confirmar respuesta
        </button>
      </div>
    </form>
  );
}

export function categoryName(q: Question) {
  return bank.categoryById[q.category].name;
}
