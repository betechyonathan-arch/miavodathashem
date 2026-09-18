import { useZury } from '../state/zury';
import { patchDay } from '../lib/db/repo';
import { MITZVOT_CATALOG, mitzvahLabel } from '../lib/mitzvot';
import { Card, SectionTitle } from './ui';

export default function MitzvotToday() {
  const { day, dayRecord, settings, reloadDayRecord } = useZury();
  if (!day || !settings) return null;

  const tracked = settings.trackedMitzvot?.length
    ? settings.trackedMitzvot
    : MITZVOT_CATALOG.slice(0, 8).map((m) => m.id);
  const done = new Set(dayRecord?.mitzvot ?? []);

  async function toggle(id: string) {
    if (!day) return;
    const next = new Set(dayRecord?.mitzvot ?? []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    await patchDay(day.dayId, { mitzvot: [...next] });
    await reloadDayRecord();
  }

  return (
    <div>
      <SectionTitle es={`Mitzvot de hoy · ${done.size}/${tracked.length}`} he="מצוות" />
      <Card className="flex flex-wrap gap-1.5 p-4">
        {tracked.map((id) => {
          const l = mitzvahLabel(id);
          const on = done.has(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`rounded-lg border px-2.5 py-1 text-left text-[12px] transition ${
                on
                  ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_16%,transparent)] text-ink'
                  : 'border-line text-ink-soft'
              }`}
            >
              {on ? '✓ ' : ''}
              {l.es}
              <span className="hebrew text-[10px] text-ink-faint"> {l.he}</span>
            </button>
          );
        })}
      </Card>
      <p className="mt-1 px-1 text-[11px] text-ink-faint">
        Registra comportamiento, no una puntuación. Configura tu lista en Misión → Identidad.
      </p>
    </div>
  );
}
