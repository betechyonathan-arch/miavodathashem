/*
  Gráfica de actividad del dashboard. Barras coloreadas por TENDENCIA:
   - verde  si ese tramo tuvo igual o más registros que el anterior
   - rojo   si tuvo menos
  Granularidad conmutar: día / semana / mes / año (calendario hebreo para
  semana/mes/año, vía periods.ts). Todo lo que haya, por poco que sea, se refleja:
  cualquier tramo con ≥1 registro pinta una barra visible; los vacíos, una línea.
*/
import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import { civilDateKey, keyToNoon } from '../lib/jewishDay';
import { periodFor, prevPeriod, type PeriodKind } from '../lib/periods';
import type { Entry } from '../lib/db/schema';

type Gran = 'dia' | 'semana' | 'mes' | 'año';

const TABS: { id: Gran; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
  { id: 'año', label: 'Año' },
];

const COUNTS: Record<Gran, number> = { dia: 21, semana: 16, mes: 14, año: 6 };

function addKey(key: string, delta: number): string {
  const d = keyToNoon(key);
  d.setDate(d.getDate() + delta);
  return civilDateKey(d);
}

interface Bucket {
  label: string;
  fromKey: string;
  toKey: string;
}

function shortLabel(kind: PeriodKind, fromKey: string, toKey: string): string {
  const d = keyToNoon(kind === 'week' ? toKey : fromKey);
  if (kind === 'week') return `${d.getDate()}/${d.getMonth() + 1}`;
  if (kind === 'month') return d.toLocaleDateString('es', { month: 'short' }).replace('.', '');
  return String(d.getFullYear());
}

function makeBuckets(anchorKey: string, gran: Gran): Bucket[] {
  if (gran === 'dia') {
    const n = COUNTS.dia;
    return Array.from({ length: n }, (_, i) => {
      const k = addKey(anchorKey, -(n - 1 - i));
      return { label: String(keyToNoon(k).getDate()), fromKey: k, toKey: k };
    });
  }
  const kind: PeriodKind = gran === 'semana' ? 'week' : gran === 'mes' ? 'month' : 'year';
  const n = COUNTS[gran];
  const periods: { fromKey: string; toKey: string }[] = [];
  let p = periodFor(kind, anchorKey);
  for (let i = 0; i < n; i++) {
    periods.unshift({ fromKey: p.fromKey, toKey: p.toKey });
    p = prevPeriod(p);
  }
  return periods.map((pp) => ({
    label: shortLabel(kind, pp.fromKey, pp.toKey),
    fromKey: pp.fromKey,
    toKey: pp.toKey,
  }));
}

export default function ActivityChart({ anchorKey }: { anchorKey: string }) {
  const [gran, setGran] = useState<Gran>('dia');

  const buckets = useMemo(() => makeBuckets(anchorKey, gran), [anchorKey, gran]);
  const fromKey = buckets[0]?.fromKey ?? anchorKey;
  const toKey = buckets[buckets.length - 1]?.toKey ?? anchorKey;

  const rows = useLiveQuery(
    async () => {
      const all = await db.entries.where('dayId').between(fromKey, toKey, true, true).toArray();
      return all.filter((e) => !e.deletedAt);
    },
    [fromKey, toKey],
    [] as Entry[],
  );

  const series = useMemo(() => {
    return buckets.map((b) => {
      const inRange = rows.filter((e) => e.dayId >= b.fromKey && e.dayId <= b.toKey);
      return {
        ...b,
        count: inRange.length,
        victories: inRange.filter((e) => e.valence === 'victory').length,
        falls: inRange.filter((e) => e.valence === 'fall').length,
      };
    });
  }, [buckets, rows]);

  const n = series.length;
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((a, s) => a + s.count, 0);
  const totV = series.reduce((a, s) => a + s.victories, 0);
  const totF = series.reduce((a, s) => a + s.falls, 0);
  const last = series[n - 1];

  // Línea (como antes) pero con color por tendencia: cada tramo verde si igualó
  // o superó al anterior, rojo si quedó por debajo.
  const W = 100;
  const H = 40;
  const pad = 3;
  const x = (i: number) => (n <= 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad));
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad);
  const areaPath =
    `M ${x(0).toFixed(2)} ${y(series[0]?.count ?? 0).toFixed(2)} ` +
    series.map((s, i) => `L ${x(i).toFixed(2)} ${y(s.count).toFixed(2)}`).join(' ') +
    ` L ${x(n - 1).toFixed(2)} ${H - pad} L ${x(0).toFixed(2)} ${H - pad} Z`;

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setGran(t.id)}
            className={`rounded-lg border px-2.5 py-1 text-[12px] ${
              gran === t.id ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ height: 72, width: '100%', display: 'block' }}
        role="img"
        aria-label="Actividad"
      >
        <path d={areaPath} fill="var(--gold)" opacity="0.1" />
        {series.map((s, i) => {
          if (i === 0) return null;
          const up = s.count >= series[i - 1].count;
          return (
            <line
              key={s.fromKey}
              x1={x(i - 1)}
              y1={y(series[i - 1].count)}
              x2={x(i)}
              y2={y(s.count)}
              stroke={up ? 'var(--success)' : 'var(--danger)'}
              strokeWidth="1.8"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {series.map((s, i) => {
          const up = i === 0 ? true : s.count >= series[i - 1].count;
          return (
            <circle
              key={s.fromKey}
              cx={x(i)}
              cy={y(s.count)}
              r={i === n - 1 ? 2.4 : 1.5}
              fill={up ? 'var(--success)' : 'var(--danger)'}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${s.label}: ${s.count}`}</title>
            </circle>
          );
        })}
      </svg>

      <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
        <span>{series[0]?.label}</span>
        <span>
          {gran === 'dia' ? 'hoy' : 'ahora'} · {last?.count ?? 0} reg.
        </span>
      </div>

      <p className="mt-2 text-[11px] leading-relaxed text-ink-faint">
        En este rango: <span className="text-ink-soft">{total}</span> registros ·{' '}
        <span style={{ color: 'var(--success)' }}>{totV} 🟢</span> ·{' '}
        <span style={{ color: 'var(--danger)' }}>{totF} 🔴</span>. Tramo verde = ese{' '}
        {gran === 'dia' ? 'día' : gran === 'año' ? 'año' : gran}{' '}
        igualó o superó al anterior; rojo = quedó por debajo.
      </p>
    </div>
  );
}
