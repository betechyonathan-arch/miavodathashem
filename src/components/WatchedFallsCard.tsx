import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import { useZury } from '../state/zury';
import { WATCHED_FALLS_CATALOG, watchedFallLabel } from '../lib/watchedFalls';
import { count } from '../lib/format';
import { Card, SectionTitle } from './ui';
import type { Entry } from '../lib/db/schema';

interface Row {
  id: string;
  es: string;
  he: string;
  last30: number;
  daysSince: number | null; // null = sin registros nunca
  lastAt: string | null;
  returnedAfterLast: boolean;
}

function daysBetween(aIso: string, b = new Date()): number {
  return Math.floor((b.getTime() - new Date(aIso).getTime()) / 864e5);
}

export default function WatchedFallsCard() {
  const settings = useZury((s) => s.settings);
  const ids =
    settings?.watchedFalls?.length
      ? settings.watchedFalls
      : WATCHED_FALLS_CATALOG.map((w) => w.id);

  const rows = useLiveQuery(
    async () => {
      const all = (await db.entries.toArray()).filter((e) => !e.deletedAt);
      const from30 = new Date(Date.now() - 30 * 864e5).toISOString();
      return ids.map((id): Row => {
        const hits = all
          .filter((e) => e.tags.includes(id) && e.valence !== 'victory')
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        const last = hits[hits.length - 1] as Entry | undefined;
        const lbl = watchedFallLabel(id);
        const returnedAfterLast = last
          ? all.some((e) => e.valence === 'recovery' && e.createdAt > last.createdAt)
          : false;
        return {
          id,
          es: lbl.es,
          he: lbl.he,
          last30: hits.filter((e) => e.createdAt >= from30).length,
          daysSince: last ? daysBetween(last.createdAt) : null,
          lastAt: last?.createdAt ?? null,
          returnedAfterLast,
        };
      });
    },
    [ids.join(',')],
    [] as Row[],
  );

  if (rows.length === 0) return null;

  return (
    <Card className="space-y-3 p-4">
      <SectionTitle es="Caídas que vigilo" he="נפילות במעקב" />
      <div className="space-y-2.5">
        {rows.map((r) => {
          const recent = r.daysSince != null && r.daysSince <= 2;
          const clean = r.daysSince != null && r.daysSince >= 7;
          return (
            <div key={r.id} className="border-b border-line pb-2.5 last:border-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] text-ink">
                  {r.es} <span className="hebrew text-[11px] text-ink-faint">{r.he}</span>
                </span>
                <span className="shrink-0 text-[11px] text-ink-faint">30 d: {r.last30}</span>
              </div>
              <p
                className={`mt-0.5 text-[12px] ${
                  recent ? 'text-[var(--danger)]' : clean ? 'text-[var(--success)]' : 'text-ink-soft'
                }`}
              >
                {r.daysSince == null
                  ? 'Sin registros. Si pasa, regístralo: el sistema necesita la verdad.'
                  : r.daysSince === 0
                    ? 'Fue hoy. El regreso es ahora, no mañana.'
                    : recent
                      ? `Hace ${count(r.daysSince, 'día', 'días')}. ${r.returnedAfterLast ? 'Ya registraste el regreso — sostenlo.' : 'Registra el regreso.'}`
                      : clean
                        ? `${r.daysSince} días sosteniendo el estándar.`
                        : `Última: hace ${r.daysSince} días.`}
              </p>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-ink-faint">
        Es un espejo, no un veredicto. Cuenta lo que pasó y te pide volver. Edita la lista en Misión →
        Identidad.
      </p>
    </Card>
  );
}
