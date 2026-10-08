import { useEffect, useState } from 'react';
import { fetchEncuestas, type PublicEncuesta } from '../lib/encuestas';
import { backendConfigured } from '../lib/supabase';
import EncuestaForm from './EncuestaForm';
import { Card } from './ui';

const REINTENTOS = 4;
const ESPERA_MS = 2500; // entre reintentos, si el anterior falló de verdad (no solo tardó)

/**
 * Consulta hasta REINTENTOS veces, con espera entre cada una, pero SOLO si la vez anterior
 * falló de verdad (error de red). Una respuesta lenta que sí llega no cuenta como fallo: se
 * espera lo que haga falta, en vez de rendirse por un límite de tiempo arbitrario.
 */
async function consultarConReintentos(): Promise<PublicEncuesta[] | null> {
  for (let i = 0; i < REINTENTOS; i++) {
    const list = await fetchEncuestas();
    if (list) return list;
    if (i < REINTENTOS - 1) await new Promise((r) => window.setTimeout(r, ESPERA_MS));
  }
  return null;
}

/**
 * Puerta obligatoria: si hay una encuesta activa para esta persona sin responder, sale ANTES de
 * todo lo demás (antes de «Hoy») y no se puede saltar. Se contesta y se sigue. Solo se deja pasar
 * sin responder si de verdad no hay forma de consultar al servidor (varios intentos de red fallidos
 * seguidos): no hay manera de exigir algo que no se puede ni preguntar.
 */
export default function EncuestaGate({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState<PublicEncuesta[] | null>(null); // null = todavía verificando

  useEffect(() => {
    if (!backendConfigured) {
      onDone();
      return;
    }
    let alive = true;
    consultarConReintentos().then((list) => {
      if (!alive) return;
      if (!list) {
        onDone(); // varios intentos de red fallidos: no se atrapa a nadie sin conexión
        return;
      }
      const p = list.filter((e) => e.active && e.para_mi && !e.respondi);
      if (p.length === 0) onDone();
      else setPending(p);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (pending === null) {
    // Verificando (puede tardar si la conexión anda mal: se reintenta antes de rendirse).
    return (
      <div className="fixed inset-0 z-[92] grid place-items-center bg-bg">
        <span className="hebrew text-2xl text-gold">טוען…</span>
      </div>
    );
  }
  if (pending.length === 0) return null;
  const e = pending[0];

  return (
    <div className="fixed inset-0 z-[92] overflow-y-auto bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <Card className="space-y-4 border-gold p-6">
          <div className="text-center">
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Antes de entrar</div>
            <h1 className="mt-1 text-2xl leading-snug text-ink">{e.title}</h1>
            {e.description && <p className="mt-2 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{e.description}</p>}
          </div>
          <EncuestaForm
            key={e.id}
            e={e}
            submitLabel={pending.length > 1 ? 'Responder y seguir' : 'Responder y entrar'}
            onSent={() => {
              const rest = pending.slice(1);
              if (rest.length === 0) onDone();
              else setPending(rest);
            }}
          />
        </Card>
      </div>
    </div>
  );
}
