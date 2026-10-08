import { useState } from 'react';
import {
  EncuestaError,
  respondida,
  responderEncuesta,
  type Pregunta,
  type PublicEncuesta,
  type Valor,
  type Valores,
} from '../lib/encuestas';
import { Btn } from './ui';

const opcionCls = (on: boolean) =>
  `rounded-xl border px-3 py-2.5 text-left text-[15px] transition-colors ${
    on ? 'border-gold bg-gold font-medium text-[#1a140a]' : 'border-line bg-raised text-ink-soft hover:border-gold'
  }`;

function Campo({ p, valor, onChange, disabled }: { p: Pregunta; valor: Valor | undefined; onChange: (v: Valor | undefined) => void; disabled: boolean }) {
  if (p.tipo === 'escala') {
    const min = p.min ?? 1;
    const max = p.max ?? 10;
    const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
    return (
      <div className="grid grid-cols-5 gap-1.5">
        {nums.map((n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            aria-pressed={valor === n}
            onClick={() => onChange(n)}
            className={`rounded-lg border py-2.5 text-[15px] transition-colors ${
              valor === n ? 'border-gold bg-gold font-medium text-[#1a140a]' : 'border-line bg-raised text-ink-soft hover:border-gold'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    );
  }

  if (p.tipo === 'sino') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(['si', 'no'] as const).map((v) => (
          <button key={v} type="button" disabled={disabled} aria-pressed={valor === v} onClick={() => onChange(v)} className={opcionCls(valor === v) + ' text-center'}>
            {v === 'si' ? 'Sí' : 'No'}
          </button>
        ))}
      </div>
    );
  }

  if (p.tipo === 'opcion') {
    return (
      <div className="grid gap-1.5">
        {(p.opciones ?? []).map((o) => (
          <button key={o} type="button" disabled={disabled} aria-pressed={valor === o} onClick={() => onChange(o)} className={opcionCls(valor === o)}>
            {o}
          </button>
        ))}
      </div>
    );
  }

  if (p.tipo === 'multiple') {
    const sel = Array.isArray(valor) ? valor : [];
    return (
      <div className="grid gap-1.5">
        <p className="text-[12px] text-ink-faint">Puedes elegir varias.</p>
        {(p.opciones ?? []).map((o) => {
          const on = sel.includes(o);
          return (
            <button
              key={o}
              type="button"
              disabled={disabled}
              aria-pressed={on}
              onClick={() => onChange(on ? sel.filter((x) => x !== o) : [...sel, o])}
              className={opcionCls(on)}
            >
              <span aria-hidden className="mr-2">{on ? '☑' : '☐'}</span>
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <textarea
      className="w-full rounded-xl border border-line bg-raised p-3 text-[15px] text-ink"
      rows={3}
      maxLength={2000}
      disabled={disabled}
      value={typeof valor === 'string' ? valor : ''}
      onChange={(ev) => onChange(ev.target.value)}
      placeholder="Escribe tu respuesta…"
    />
  );
}

/**
 * El cuestionario de una encuesta: todas sus preguntas, en orden, y un botón para enviar. Se usa en
 * la puerta de entrada (EncuestaGate) y en «Hoy» (Encuestas).
 */
export default function EncuestaForm({ e, submitLabel, onSent }: { e: PublicEncuesta; submitLabel: string; onSent: () => void }) {
  const [valores, setValores] = useState<Valores>(() => ({ ...(e.mis_valores ?? {}) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const varias = e.preguntas.length > 1;
  const faltan = e.preguntas.filter((p) => p.obligatoria && !respondida(valores[p.id])).length;

  async function send() {
    setBusy(true);
    setError('');
    const limpio: Valores = {};
    for (const p of e.preguntas) {
      const v = valores[p.id];
      if (respondida(v)) limpio[p.id] = typeof v === 'string' ? v.trim() : (v as Valor);
    }
    try {
      await responderEncuesta(e.id, limpio);
      onSent();
    } catch (err) {
      setError(err instanceof EncuestaError ? err.message : 'No se pudo enviar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {e.preguntas.map((p, i) => (
        <div key={p.id} className="space-y-2 border-t border-line pt-4">
          {(varias || p.texto) && (
            <div>
              {varias && (
                <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                  Pregunta {i + 1} de {e.preguntas.length}
                  {!p.obligatoria && ' · opcional'}
                </div>
              )}
              {p.texto && <p className="mt-0.5 text-[16px] leading-snug text-ink">{p.texto}</p>}
            </div>
          )}
          <Campo
            p={p}
            valor={valores[p.id]}
            disabled={busy}
            onChange={(v) => setValores((cur) => ({ ...cur, [p.id]: v as Valor }))}
          />
        </div>
      ))}

      <div className="space-y-2 border-t border-line pt-4">
        {faltan > 0 && varias && (
          <p className="text-center text-[12px] text-ink-faint">
            {faltan === 1 ? 'Falta 1 pregunta por responder.' : `Faltan ${faltan} preguntas por responder.`}
          </p>
        )}
        <Btn disabled={busy || faltan > 0} onClick={() => void send()} className="w-full">
          {busy ? 'Enviando…' : submitLabel}
        </Btn>
        {error && <p className="text-center text-[13px] text-[var(--danger)]">{error}</p>}
        <p className="text-center text-[11px] text-ink-faint">
          {e.anonima
            ? 'Anónima: nadie, ni el equipo de la app, ve quién respondió qué.'
            : 'Privada: solo el equipo de la app ve tus respuestas.'}
        </p>
      </div>
    </div>
  );
}
