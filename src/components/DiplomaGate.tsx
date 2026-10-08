import { useEffect, useState } from 'react';
import { marcarVisto, misDiplomas, type Diploma } from '../lib/diplomas';
import { backendConfigured } from '../lib/supabase';
import DiplomaView from './DiplomaView';
import { Btn } from './ui';

/**
 * Al entrar: si a esta persona le dieron un diploma que todavía no ha visto, se lo muestra en
 * grande (una sola vez). Después queda guardado en «Mis diplomas». Sin conexión, deja pasar.
 */
export default function DiplomaGate({ onDone }: { onDone: () => void }) {
  const [nuevos, setNuevos] = useState<Diploma[] | null>(null);

  useEffect(() => {
    if (!backendConfigured) {
      onDone();
      return;
    }
    let alive = true;
    void misDiplomas().then((list) => {
      if (!alive) return;
      const n = (list ?? []).filter((d) => !d.visto_at);
      if (n.length === 0) onDone();
      else setNuevos(n);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!nuevos || nuevos.length === 0) return null;
  const d = nuevos[0];

  function seguir() {
    void marcarVisto(d.id);
    const rest = nuevos!.slice(1);
    if (rest.length === 0) onDone();
    else setNuevos(rest);
  }

  return (
    <div className="fixed inset-0 z-[92] overflow-y-auto bg-bg px-5 py-8">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="text-4xl" aria-hidden>
            🏆
          </div>
          <h1 className="mt-2 text-2xl text-ink">¡Recibiste un diploma!</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Mazal tov. Queda guardado en «Mis diplomas».</p>
        </div>
        <DiplomaView key={d.id} d={d} fecha={d.created_at} acciones />
        <Btn className="w-full" onClick={seguir}>
          {nuevos.length > 1 ? 'Ver el siguiente' : 'Entrar a la app'}
        </Btn>
      </div>
    </div>
  );
}
