import { useEffect, useState } from 'react';
import { KIND_LABEL, cachedFeatured, fetchFeatured, type PublicAporte } from '../lib/aportes';

/**
 * Splash de entrada: fondo oscuro sobrio y un botón para continuar (tocar en cualquier parte).
 * Por defecto lleva el lema. Si un admin puso un aporte de la comunidad en esta pantalla
 * (Administración → Aportes), se muestra ese texto en lugar del lema.
 *
 * El fondo es una foto fija de una sucá en Jerusalén de noche (public/splash-sukot.jpg) — puesta
 * a mano por ahora, no por el sistema de aportes (que no maneja fotos). Cuando ya no aplique el
 * tema de Sucot, se puede volver al degradado liso quitando `backgroundImage` de abajo.
 */
export default function Splash({ onContinue }: { onContinue: () => void }) {
  // La copia guardada de la vez anterior sale al instante; la consulta la refresca para la próxima.
  const cached = cachedFeatured();
  const [featured, setFeatured] = useState<PublicAporte | null>(cached ?? null);
  // Nunca se ha consultado: se espera un instante para no mostrar el lema y cambiarlo enseguida.
  const [settled, setSettled] = useState(cached !== undefined);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => alive && setSettled(true), 1200);
    void fetchFeatured().then((f) => {
      if (!alive) return;
      if (f !== undefined) setFeatured(f);
      setSettled(true);
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <button
      onClick={onContinue}
      aria-label="Avodah — לעבוד את ה׳ בכל דרכיך. Continuar"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(13,11,7,0.55) 0%, rgba(13,11,7,0.6) 45%, rgba(10,8,5,0.85) 80%, rgba(8,6,4,0.94) 100%), url(/splash-sukot.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
      }}
    >
      <span className="hebrew text-3xl leading-snug" style={{ color: '#e3bd6c' }}>
        לעבוד את ה׳ בכל דרכיך
      </span>
      <span
        className="max-w-md transition-opacity duration-300"
        style={{ opacity: settled ? 1 : 0, color: 'rgba(247,241,226,0.7)' }}
      >
        {featured ? (
          <span className="flex flex-col items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: '#e3bd6c' }}>
              {KIND_LABEL[featured.kind]}
              {featured.title ? ` · ${featured.title}` : ''}
            </span>
            <span className="whitespace-pre-line text-[15px] leading-relaxed" style={{ color: 'rgba(247,241,226,0.9)' }}>
              {featured.body}
            </span>
            <span className="text-[12px]" style={{ color: 'rgba(247,241,226,0.6)' }}>
              — {featured.author_name ?? 'Anónimo'}
              {featured.source ? ` · ${featured.source}` : ''}
            </span>
          </span>
        ) : (
          <span className="text-sm">Servir a Hashem en todos tus caminos</span>
        )}
      </span>
      <span className="hebrew mt-8 text-xl" style={{ color: '#f7f1e2' }}>
        המשך
      </span>
    </button>
  );
}
