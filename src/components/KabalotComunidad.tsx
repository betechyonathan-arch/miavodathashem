import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import { createKabala, markKabalaDay } from '../lib/db/repo';
import type { Kabala } from '../lib/db/schema';
import { KIND_COPY, kabalaProgress } from '../lib/kabala';
import {
  acceptComunidad,
  cachedComunidad,
  daysLeft,
  endsLabel,
  fetchComunidad,
  safeArea,
  type KabalaComunidad,
} from '../lib/kabalaComunidad';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card, inputCls } from './ui';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Cuántas personas la aceptaron, en una frase cálida y verdadera. */
function countLine(n: number, mine: boolean): string {
  if (n <= 0) return 'Todavía nadie la ha aceptado. Puedes ser la primera persona.';
  if (mine && n === 1) return 'Eres la primera persona en aceptarla.';
  if (mine) return `Tú y otras ${plural(n - 1, 'persona', 'personas')} la aceptaron.`;
  return `${plural(n, 'persona ya la aceptó', 'personas ya la aceptaron')}.`;
}

function KabalaCard({ c, mine, todayKey, hebrewDate, now }: { c: KabalaComunidad; mine: Kabala | undefined; todayKey: string; hebrewDate: string; now: Date }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [subject, setSubject] = useState('');
  const [aceptaron, setAceptaron] = useState(c.aceptaron);
  const [acepte, setAcepte] = useState(c.acepte);

  useEffect(() => {
    setAceptaron(c.aceptaron);
    setAcepte(c.acepte);
  }, [c.aceptaron, c.acepte]);

  const yaAcepte = acepte || !!mine;
  const left = daysLeft(c.ends_on, todayKey);
  const ended = left === 0;

  /** Crea la kabalá personal (la de siempre) enlazada a esta, con la duración que falta. */
  async function startLocal() {
    const name = subject.trim();
    await createKabala({
      he: c.he,
      es: c.title,
      kavana: name ? `${c.kavana}${c.kavana ? ' ' : ''}(${name})` : c.kavana,
      kind: c.kind,
      comunidadId: c.id,
      area: safeArea(c.area),
      targetDays: Math.max(1, left),
      mode: 'acumulativo',
      onFall: 'pausa',
      startDayId: todayKey,
      startHebrewDate: hebrewDate,
      seedStartDay: null,
    });
  }

  async function accept() {
    setBusy(true);
    setError('');
    try {
      await acceptComunidad(c.id);
      await startLocal();
      setAcepte(true);
      setAceptaron((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'No se pudo aceptar. Revisa tu conexión e intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  async function resumeHere() {
    setBusy(true);
    setError('');
    try {
      await startLocal();
    } finally {
      setBusy(false);
    }
  }

  async function mark(status: 'limpio' | 'caida') {
    if (!mine) return;
    setBusy(true);
    try {
      await markKabalaDay({ id: mine.id, dayId: todayKey, hebrewDate, status });
    } finally {
      setBusy(false);
    }
  }

  const copy = KIND_COPY[c.kind];
  const progress = mine ? kabalaProgress(mine, now, todayKey) : null;
  const todayStatus = mine?.days?.[todayKey]?.status ?? null;

  return (
    <Card className="space-y-4 border-gold p-5">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
          <span aria-hidden>🤝</span>
          <span>Kabalá para todos</span>
          {!ended && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">hasta el {endsLabel(c.ends_on)}</span>}
        </div>
        <h3 className="text-[18px] leading-snug text-ink">{c.title}</h3>
        {c.he && <div className="hebrew text-lg text-gold">{c.he}</div>}
      </div>

      {c.blurb && <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{c.blurb}</p>}

      {c.pasuk_he && (
        <div className="rounded-xl border border-line bg-[var(--bg-sunken)] p-4 text-center">
          <p className="hebrew text-[19px] leading-relaxed text-gold" dir="rtl">
            {c.pasuk_he}
          </p>
          {c.pasuk_es && <p className="mt-2 text-[13px] italic leading-relaxed text-ink-soft">«{c.pasuk_es}»</p>}
          {c.pasuk_ref && <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">{c.pasuk_ref}</p>}
        </div>
      )}

      <p className="text-[13px] text-ink">
        <span aria-hidden>👥 </span>
        {countLine(aceptaron, yaAcepte)}
      </p>

      {/* Sin aceptar todavía */}
      {!yaAcepte && !ended && (
        <div className="space-y-3 border-t border-line pt-4">
          {c.subject_label && (
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-ink-soft">{c.subject_label}</span>
              <input className={inputCls} value={subject} maxLength={60} onChange={(e) => setSubject(e.target.value)} placeholder="Nombre o solo «una persona»" />
            </label>
          )}
          <Btn disabled={busy} onClick={() => void accept()} className="w-full">
            {busy ? 'Aceptando…' : 'Sí, acepto esta kabalá'}
          </Btn>
          <p className="text-center text-[11px] text-ink-faint">Bli neder: es un compromiso de buena voluntad. Si un día caes, lo que sigue es el regreso.</p>
        </div>
      )}

      {ended && <p className="border-t border-line pt-3 text-[13px] text-ink-faint">Esta kabalá ya terminó. Gracias a todos los que la tomaron.</p>}

      {/* Aceptada, pero sin el seguimiento en este dispositivo (otro teléfono, o se borró) */}
      {yaAcepte && !mine && !ended && (
        <div className="space-y-2 border-t border-line pt-4">
          <p className="text-[13px] text-ink-soft">Ya la aceptaste. En este dispositivo todavía no tienes el seguimiento diario.</p>
          <Btn variant="ghost" disabled={busy} onClick={() => void resumeHere()}>
            Seguirla aquí
          </Btn>
        </div>
      )}

      {/* Aceptada y con seguimiento: la pregunta de cada día */}
      {mine && progress && (
        <div className="space-y-3 border-t border-line pt-4">
          {todayStatus === null && !ended ? (
            <>
              <div className="text-[15px] font-medium text-ink">Hoy, ¿cumpliste tu kabalá?</div>
              <div className="grid grid-cols-2 gap-2">
                <Btn disabled={busy} onClick={() => void mark('limpio')}>
                  {copy.done}
                </Btn>
                <Btn variant="ghost" disabled={busy} onClick={() => void mark('caida')}>
                  {copy.miss}
                </Btn>
              </div>
            </>
          ) : todayStatus === 'limpio' ? (
            <p className="text-[14px] text-[var(--success)]">{copy.doneToday}</p>
          ) : todayStatus === 'caida' ? (
            <p className="text-[14px] text-ink-soft">{copy.missToday}</p>
          ) : null}
          <div className="flex items-center justify-between text-[12px] text-ink-faint">
            <span>
              {progress.cleanDays} de {progress.target} {copy.unitPlural}
            </span>
            <button onClick={() => navigate(`/kabala?id=${mine.id}`)} className="text-gold underline underline-offset-2">
              Ver mi kabalá
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
    </Card>
  );
}

/**
 * Las kabalot abiertas a todo el público (las crea un admin): se lee la kabalá, se ve su pasuk y
 * cuántas personas la aceptaron, se toca «acepto», y cada día pregunta si hoy se cumplió.
 * Solo se cuenta la aceptación; lo que cada quien cumple se queda en su dispositivo.
 */
export default function KabalotComunidad() {
  const { day, now } = useZury();
  const [list, setList] = useState<KabalaComunidad[]>(() => cachedComunidad());

  useEffect(() => {
    if (!backendConfigured) return;
    let alive = true;
    const load = () =>
      void fetchComunidad().then((l) => {
        if (alive && l) setList(l.filter((k) => k.active));
      });
    load();
    const onVisible = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Las kabalot personales que nacieron de una de estas (para la pregunta de cada día).
  const linked = useLiveQuery(async () => (await db.kabalot.toArray()).filter((k) => k.comunidadId), [], [] as Kabala[]);

  if (!backendConfigured || !day || list.length === 0) return null;

  return (
    <div className="space-y-3">
      {list.map((c) => {
        const mine = linked.filter((k) => k.comunidadId === c.id && k.status === 'activa').sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        // Terminadas: solo se muestran a quien la tomó (para cerrar con gracias).
        if (daysLeft(c.ends_on, day.dayId) === 0 && !c.acepte && !mine) return null;
        return <KabalaCard key={c.id} c={c} mine={mine} todayKey={day.dayId} hebrewDate={day.hebrewDate} now={now} />;
      })}
    </div>
  );
}
