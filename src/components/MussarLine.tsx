import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { pickMusar, reshuffleMusar } from '../lib/musar';
import { baseMusarContext } from '../lib/musar/context';
import type { MusarContext } from '../lib/musar';

/**
 * Una frase de musar, en voz baja. El hebreo lidera; el castellano es el
 * subtítulo. La misma durante toda la sesión (no marea); cambia sola cuando el
 * día judío cambia con la app abierta, o cuando cambia el contexto (p. ej. una
 * caída hoy hace que pese תשובה). Al tocarla se abre la pantalla de מוסר.
 */
export default function MussarLine({
  className = '',
  extra,
  seed = 'footer',
}: {
  className?: string;
  /** Señales que dependen de los registros de hoy (caíste, día vacío…). */
  extra?: Partial<MusarContext>;
  seed?: string;
}) {
  const settings = useZury((s) => s.settings);
  const day = useZury((s) => s.day);
  const newDayAt = useZury((s) => s.newDayAt);
  // Cambia solo 3 veces al día (mañana/tarde/noche) para que la frase acompañe el momento.
  const slotBucket = useZury((s) => (s.now.getHours() < 12 ? 0 : s.now.getHours() < 18 ? 1 : 2));
  const navigate = useNavigate();
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (!newDayAt) return;
    reshuffleMusar();
    setBump((b) => b + 1);
  }, [newDayAt]);

  const line = useMemo(
    () => pickMusar({ ...baseMusarContext(settings, day), ...extra }, seed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings?.strictness, settings?.musar?.themes, day?.dayId, JSON.stringify(extra ?? {}), seed, bump, slotBucket],
  );

  return (
    <button
      onClick={() => navigate('/musar')}
      className={`mx-auto block max-w-sm text-center ${className}`}
      aria-label="Abrir מוסר"
    >
      {line.he && (
        <span className="hebrew block text-[15px] leading-relaxed text-ink-soft" dir="rtl">
          {line.he}
        </span>
      )}
      <span
        className={`block leading-relaxed text-ink-faint ${line.he ? 'mt-1 text-[11px] italic' : 'text-[12px] italic'}`}
      >
        {line.es}
      </span>
      {line.sourceEs && (
        <span className="mt-1 block text-[10px] uppercase tracking-[0.14em] text-ink-faint/70">
          {line.sourceEs}
        </span>
      )}
    </button>
  );
}
