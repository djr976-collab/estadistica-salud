import { useEffect, useRef } from 'react';
import { bank } from '../../content/bank';
import { areaById } from '../../content/subjects';
import type { GameState } from '../../types';
import { GuardianEmblem } from './Avatar';
import { BadgeMedal } from './Common';

function useDialogFocus() {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => prev?.focus?.();
  }, []);
  return ref;
}

export function Celebration({ celebration, onClose, reduceMotion }: { celebration: NonNullable<GameState['celebration']>; onClose: () => void; reduceMotion: boolean }) {
  const btn = useDialogFocus();
  const isFinal = celebration.kind === 'final';
  const cat = celebration.kind === 'badge' ? areaById(celebration.category) : null;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="cel-title">
      <div className="overlay-card celebration">
        {!reduceMotion ? (
          <div className="confetti" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <span key={i} style={{ '--i': i, background: bank.categories[i % 6].color } as React.CSSProperties} />
            ))}
          </div>
        ) : null}
        {isFinal ? <GuardianEmblem size={88} /> : <BadgeMedal category={cat!.id} earned size={96} />}
        <h2 id="cel-title">{isFinal ? 'Guardia completa' : `Obtuviste la ${cat!.badgeName}`}</h2>
        <p>{isFinal ? bank.config.guardian.phrases.closing : cat!.name}</p>
        <p className="muted small">
          {isFinal
            ? 'Revisá tu resumen de aprendizaje para ver qué conviene repasar.'
            : 'La insignia reconoce el logro dentro del juego; no certifica competencia clínica presencial.'}
        </p>
        <button ref={btn} type="button" className="btn btn-primary btn-block" onClick={onClose}>
          {isFinal ? 'Ver mi resumen' : 'Seguir'}
        </button>
      </div>
    </div>
  );
}

export function PauseOverlay({ onResume, onHome }: { onResume: () => void; onHome: () => void }) {
  const btn = useDialogFocus();
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
      <div className="overlay-card">
        <h2 id="pause-title">Guardia en pausa</h2>
        <p>Tu progreso está guardado en este dispositivo. Podés cerrar la página y retomarla después en el mismo punto.</p>
        <button ref={btn} type="button" className="btn btn-primary btn-block" onClick={onResume}>
          Retomar
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onHome}>
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
