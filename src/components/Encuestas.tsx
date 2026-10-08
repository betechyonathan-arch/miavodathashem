import { useEffect, useState } from 'react';
import { cachedEncuestas, fetchEncuestas, type PublicEncuesta } from '../lib/encuestas';
import { backendConfigured } from '../lib/supabase';
import EncuestaForm from './EncuestaForm';
import { Card } from './ui';

function EncuestaCard({ e, onDone }: { e: PublicEncuesta; onDone: () => void }) {
  const [done, setDone] = useState(e.respondi);
  const escalaUnica = e.preguntas.length === 1 && e.preguntas[0].tipo === 'escala';
  const miNumero = escalaUnica ? e.mis_valores?.[e.preguntas[0].id] : undefined;

  return (
    <Card className="space-y-3 border-gold p-5">
      <div className="mb-0.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
        <span aria-hidden>📊</span>
        <span>Encuesta</span>
      </div>
      <h3 className="text-[17px] leading-snug text-ink">{e.title}</h3>
      {e.description && <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink-soft">{e.description}</p>}

      {done ? (
        <div className="space-y-1 border-t border-line pt-3">
          <p className="text-[14px] text-ink">
            Gracias, ya respondiste
            {typeof miNumero === 'number' ? <>: <strong className="text-gold">{miNumero}</strong></> : '.'}
          </p>
          {e.respuestas != null && (
            <p className="text-[12px] text-ink-faint">
              {e.respuestas} {e.respuestas === 1 ? 'persona ha respondido' : 'personas han respondido'}
              {e.promedio != null ? ` · promedio ${e.promedio}` : ''}
            </p>
          )}
          <button onClick={() => setDone(false)} className="pt-1 text-[12px] text-gold underline underline-offset-2">
            Cambiar mis respuestas
          </button>
        </div>
      ) : (
        <EncuestaForm
          e={e}
          submitLabel="Enviar mis respuestas"
          onSent={() => {
            setDone(true);
            onDone();
          }}
        />
      )}
    </Card>
  );
}

/** Encuestas abiertas para esta persona, en «Hoy». */
export default function Encuestas() {
  const [list, setList] = useState<PublicEncuesta[]>(() => cachedEncuestas());

  const load = () =>
    void fetchEncuestas().then((l) => {
      if (l) setList(l.filter((e) => e.active && e.para_mi));
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
        <EncuestaCard key={e.id + (e.respondi ? '-r' : '')} e={e} onDone={load} />
      ))}
    </div>
  );
}
