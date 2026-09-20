import { useEffect, useState } from 'react';
import { cachedAvisos, fetchActiveAvisos, type Aviso } from '../lib/avisos';
import { backendConfigured } from '../lib/supabase';

const NEW_MS = 3 * 86_400_000; // "Nuevo" durante 3 días

/**
 * Avisos del admin, arriba de «Hoy» y de «¿Cómo estoy?». Salen al instante con lo de la última
 * vez y se refrescan en silencio. Si no hay ninguno (o no hay conexión), no ocupa nada.
 */
export default function Avisos() {
  const [avisos, setAvisos] = useState<Aviso[]>(cachedAvisos);

  useEffect(() => {
    if (!backendConfigured) return;
    let alive = true;
    const load = () =>
      void fetchActiveAvisos().then((list) => {
        if (alive && list) setAvisos(list);
      });
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!backendConfigured || avisos.length === 0) return null;

  return (
    <div className="space-y-3">
      {avisos.map((a) => {
        const isNew = Date.now() - new Date(a.updated_at).getTime() < NEW_MS;
        return (
          <section
            key={a.id}
            aria-label="Aviso"
            className="rounded-2xl border border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)] p-4"
          >
            <div className="mb-1 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
              <span aria-hidden>📣</span>
              <span>Aviso</span>
              {isNew && <span className="rounded-md bg-gold px-1.5 py-0.5 text-[10px] text-[#1a140a]">Nuevo</span>}
            </div>
            {a.title && <h3 className="text-[16px] font-medium text-ink">{a.title}</h3>}
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">{a.body}</p>
          </section>
        );
      })}
    </div>
  );
}
