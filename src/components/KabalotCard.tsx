import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import { KIND_COPY, kabalaProgress, kindOf, presetsFor } from '../lib/kabala';
import { getGender } from '../lib/gender';
import type { Kabala } from '../lib/db/schema';
import { Card, Ring } from './ui';

/** Tarjeta del Tablero: mis kabalot activas, o una invitación a empezar la primera. */
export default function KabalotCard() {
  const navigate = useNavigate();
  const { now, day } = useZury();
  const active = useLiveQuery(
    async () => {
      const rows = await db.kabalot.where('status').equals('activa').toArray();
      return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    [],
    [] as Kabala[],
  );

  if (active.length === 0) {
    const recommended = presetsFor(getGender())[0];
    return (
      <button onClick={() => navigate('/kabala')} className="block w-full text-left">
        <Card className="flex items-center gap-4 border-gold/50 p-4">
          <span className="hebrew shrink-0 text-3xl text-gold">קַבָּלָה</span>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Kabalá con fecha</div>
            <div className="text-[15px] text-ink">Empieza tu primera kabalá</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-ink-faint">
              Tú eliges qué y cuántos días{recommended ? ` · Te sugerimos: ${recommended.es}` : ''}. Bli neder.
            </p>
          </div>
          <span className="text-ink-faint">›</span>
        </Card>
      </button>
    );
  }

  return (
    <Card className="space-y-1 border-gold/50 p-3">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Mis kabalot · bli neder</span>
        <button onClick={() => navigate('/kabala')} className="text-[12px] text-gold">
          Ver todas ›
        </button>
      </div>
      {active.slice(0, 3).map((k) => {
        const p = kabalaProgress(k, now, day?.dayId);
        const copy = KIND_COPY[kindOf(k)];
        return (
          <button
            key={k.id}
            onClick={() => navigate(`/kabala?id=${k.id}`)}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left hover:bg-[var(--bg-sunken)]"
          >
            <Ring value={p.pct} size={48} stroke={5} emoji={`${p.cleanDays}`} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] text-ink">{k.es}</div>
              <div className="text-[11px] text-ink-faint">
                {p.cleanDays} de {p.target} {copy.unitPlural} ·{' '}
                {p.done ? 'completada' : p.todayStatus ? 'hoy ya marcado' : 'hoy pendiente'}
              </div>
            </div>
            <span className="text-ink-faint">›</span>
          </button>
        );
      })}
      {active.length > 3 && <p className="px-1 text-[11px] text-ink-faint">y {active.length - 3} más…</p>}
    </Card>
  );
}
