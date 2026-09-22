import { useEffect, useState } from 'react';
import { EncuestaError, fetchEncuestas, submitRespuesta, type PublicEncuesta } from '../lib/encuestas';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card } from './ui';

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
 * Puerta obligatoria: si hay una encuesta activa sin responder, sale ANTES de todo lo demás
 * (antes de «Hoy») y no se puede saltar. Se contesta y se sigue. Solo se deja pasar sin responder
 * si de verdad no hay forma de consultar al servidor (varios intentos de red fallidos seguidos):
 * no hay manera de exigir algo que no se puede ni preguntar.
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
      const p = list.filter((e) => e.active && !e.respondi);
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
    <div className="fixed inset-0 z-[92] flex items-center justify-center overflow-y-auto bg-bg px-5 py-10">
      <div className="w-full max-w-md">
        <Formulario
          key={e.id}
          e={e}
          onSent={() => {
            const rest = pending.slice(1);
            if (rest.length === 0) onDone();
            else setPending(rest);
          }}
        />
      </div>
    </div>
  );
}

function Formulario({ e, onSent }: { e: PublicEncuesta; onSent: () => void }) {
  const [num, setNum] = useState<number | null>(null);
  const [texto, setTexto] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function send(valorNum: number | null, valorTexto: string | null) {
    setBusy(true);
    setError('');
    try {
      await submitRespuesta(e.id, valorNum, valorTexto);
      onSent();
    } catch (err) {
      setError(err instanceof EncuestaError ? err.message : 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const scale = e.kind === 'escala' ? Array.from({ length: e.scale_max - e.scale_min + 1 }, (_, i) => e.scale_min + i) : [];

  return (
    <Card className="space-y-4 border-gold p-6">
      <div className="text-center">
        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Antes de entrar</div>
        <h1 className="mt-1 text-2xl leading-snug text-ink">{e.title}</h1>
        {e.description && <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{e.description}</p>}
      </div>

      {e.kind === 'escala' ? (
        <div className="space-y-4 border-t border-line pt-4">
          <div className="grid grid-cols-5 gap-2">
            {scale.map((n) => (
              <button
                key={n}
                disabled={busy}
                onClick={() => setNum(n)}
                className={`rounded-xl border py-3 text-[16px] transition-colors ${
                  num === n ? 'border-gold bg-gold font-medium text-[#1a140a]' : 'border-line bg-raised text-ink-soft hover:border-gold'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <Btn disabled={busy || num == null} onClick={() => void send(num, null)} className="w-full">
            {busy ? 'Enviando…' : 'Responder y entrar'}
          </Btn>
        </div>
      ) : (
        <div className="space-y-4 border-t border-line pt-4">
          <textarea
            className="w-full rounded-xl border border-line bg-raised p-3 text-[15px] text-ink"
            rows={4}
            maxLength={1000}
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            placeholder="Escribe tu respuesta…"
            autoFocus
          />
          <Btn disabled={busy || texto.trim().length < 1} onClick={() => void send(null, texto.trim())} className="w-full">
            {busy ? 'Enviando…' : 'Responder y entrar'}
          </Btn>
        </div>
      )}

      {error && <p className="text-center text-[13px] text-[var(--danger)]">{error}</p>}
      <p className="text-center text-[11px] text-ink-faint">Anónima: nadie más ve que tú respondiste esto ni qué pusiste.</p>
    </Card>
  );
}
