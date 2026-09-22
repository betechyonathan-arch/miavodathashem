import { useEffect, useState } from 'react';
import { cachedEncuestas, fetchEncuestas, submitRespuesta, EncuestaError, type PublicEncuesta } from '../lib/encuestas';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card } from './ui';

function EncuestaCard({ e, onDone }: { e: PublicEncuesta; onDone: () => void }) {
  const [num, setNum] = useState<number | null>(e.mi_valor_num);
  const [texto, setTexto] = useState(e.mi_valor_texto ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(e.respondi);

  async function send(valorNum: number | null, valorTexto: string | null) {
    setBusy(true);
    setError('');
    try {
      await submitRespuesta(e.id, valorNum, valorTexto);
      setDone(true);
      onDone();
    } catch (err) {
      setError(err instanceof EncuestaError ? err.message : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  const scale = e.kind === 'escala' ? Array.from({ length: e.scale_max - e.scale_min + 1 }, (_, i) => e.scale_min + i) : [];

  return (
    <Card className="space-y-3 border-gold p-5">
      <div className="mb-0.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
        <span aria-hidden>📊</span>
        <span>Encuesta</span>
      </div>
      <h3 className="text-[17px] leading-snug text-ink">{e.title}</h3>
      {e.description && <p className="text-[13px] leading-relaxed text-ink-soft">{e.description}</p>}

      {done ? (
        <div className="space-y-1 border-t border-line pt-3">
          <p className="text-[14px] text-ink">
            Gracias, ya respondiste
            {e.kind === 'escala' && num != null ? <>: <strong className="text-gold">{num}</strong></> : '.'}
          </p>
          <p className="text-[12px] text-ink-faint">
            {e.respuestas} {e.respuestas === 1 ? 'persona ha respondido' : 'personas han respondido'}
            {e.kind === 'escala' && e.promedio != null ? ` · promedio ${e.promedio}` : ''}
          </p>
          {e.kind === 'escala' && (
            <button
              onClick={() => setDone(false)}
              className="pt-1 text-[12px] text-gold underline underline-offset-2"
            >
              Cambiar mi respuesta
            </button>
          )}
        </div>
      ) : e.kind === 'escala' ? (
        <div className="space-y-3 border-t border-line pt-3">
          <div className="grid grid-cols-5 gap-1.5">
            {scale.map((n) => (
              <button
                key={n}
                disabled={busy}
                onClick={() => setNum(n)}
                className={`rounded-lg border py-2 text-[15px] transition-colors ${
                  num === n ? 'border-gold bg-gold font-medium text-[#1a140a]' : 'border-line bg-raised text-ink-soft hover:border-gold'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <Btn disabled={busy || num == null} onClick={() => void send(num, null)} className="w-full">
            {busy ? 'Enviando…' : 'Enviar mi respuesta'}
          </Btn>
        </div>
      ) : (
        <div className="space-y-3 border-t border-line pt-3">
          <textarea
            className="w-full rounded-xl border border-line bg-raised p-3 text-[15px] text-ink"
            rows={3}
            maxLength={1000}
            value={texto}
            onChange={(ev) => setTexto(ev.target.value)}
            placeholder="Escribe tu respuesta…"
          />
          <Btn disabled={busy || texto.trim().length < 1} onClick={() => void send(null, texto.trim())} className="w-full">
            {busy ? 'Enviando…' : 'Enviar mi respuesta'}
          </Btn>
        </div>
      )}

      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <p className="text-[11px] text-ink-faint">Anónima: nadie más ve que tú respondiste esto ni qué pusiste.</p>
    </Card>
  );
}

/** Encuestas activas en «Hoy». Anónimas para todos, salvo para el admin (que las revisa en su panel). */
export default function Encuestas() {
  const [list, setList] = useState<PublicEncuesta[]>(() => cachedEncuestas());

  const load = () =>
    void fetchEncuestas().then((l) => {
      if (l) setList(l.filter((e) => e.active));
    });

  useEffect(() => {
    if (!backendConfigured) return;
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!backendConfigured || list.length === 0) return null;

  return (
    <div className="space-y-3">
      {list.map((e) => (
        <EncuestaCard key={e.id} e={e} onDone={load} />
      ))}
    </div>
  );
}
