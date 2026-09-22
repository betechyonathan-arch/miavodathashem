import { useEffect, useState } from 'react';
import { EncuestaError, fetchEncuestas, submitRespuesta, type PublicEncuesta } from '../lib/encuestas';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card } from './ui';

const TIMEOUT_MS = 6000; // sin conexión o muy lento: se deja pasar, no se atrapa a nadie sin internet

/**
 * Puerta obligatoria: si hay una encuesta activa sin responder, sale ANTES de todo lo demás
 * (antes de «Hoy») y no se puede saltar. Se contesta y se sigue. Sin conexión, o si tarda mucho
 * en responder el servidor, se deja pasar (no hay forma de exigir algo que no se puede consultar).
 */
export default function EncuestaGate({ onDone }: { onDone: () => void }) {
  const [pending, setPending] = useState<PublicEncuesta[] | null>(null); // null = todavía verificando

  useEffect(() => {
    if (!backendConfigured) {
      onDone();
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => alive && onDone(), TIMEOUT_MS);
    fetchEncuestas().then((list) => {
      window.clearTimeout(timer);
      if (!alive) return;
      if (!list) {
        onDone(); // no se pudo consultar: no se bloquea a nadie por eso
        return;
      }
      const p = list.filter((e) => e.active && !e.respondi);
      if (p.length === 0) onDone();
      else setPending(p);
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pending || pending.length === 0) return null;
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
