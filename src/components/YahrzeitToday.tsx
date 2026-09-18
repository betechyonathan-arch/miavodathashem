import { useMemo, useState } from 'react';
import { HDate } from '@hebcal/core';
import { useZury } from '../state/zury';
import { yahrzeitsForDay } from '../lib/yahrzeits';
import { hebrewDateEs } from '../lib/format';

/**
 * יומא דהילולא — marca discreta en el día de hoy si cae el yahrzeit de un gadol.
 * Colapsada: una línea con los nombres. Tocar despliega quién fue cada uno.
 * Datos: dataset curado (src/lib/yahrzeits.ts) emparejado con la fecha hebrea real.
 */
export default function YahrzeitToday() {
  const day = useZury((s) => s.day);
  const [open, setOpen] = useState(false);

  const list = useMemo(() => {
    if (!day) return [];
    const isLeap = HDate.isLeapYear(day.displayHebrewYear);
    return yahrzeitsForDay(day.displayHebrewMonth, day.displayHebrewDay, isLeap);
  }, [day?.displayHebrewMonth, day?.displayHebrewDay, day?.displayHebrewYear]);

  if (!day || list.length === 0) return null;

  return (
    <button
      onClick={() => setOpen((v) => !v)}
      className="sefer-frame block w-full rounded-2xl border border-line bg-raised px-4 py-3 text-left"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="hebrew text-[15px] text-gold">יוֹם הִלּוּלָא</span>
        <span className="text-[10px] uppercase tracking-[0.16em] text-ink-faint">
          {open ? 'ocultar' : `yahrzeit · ${list.length}`}
        </span>
      </div>
      {day.displayLagsHalacha && (
        <p className="mt-1 text-[10px] text-ink-faint/80">
          Emparejado con la fecha que ves ({hebrewDateEs(day.displayHebrewDate)}).
        </p>
      )}

      {!open ? (
        <p className="mt-1 text-[13px] leading-snug text-ink-soft">
          Hoy es el yahrzeit de{' '}
          <span className="text-ink">
            {list.map((y) => y.es).join(' · ')}
          </span>
          .
        </p>
      ) : (
        <ul className="mt-2 space-y-2.5">
          {list.map((y, i) => (
            <li key={i} className="border-l-2 border-line pl-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-ink">{y.es}</span>
                <span className="hebrew text-[13px] text-ink-soft">{y.he}</span>
              </div>
              <p dir="ltr" className="mt-0.5 text-[12px] leading-relaxed text-ink-faint">
                {y.what}
                {y.sec ? ` · נפטר ${y.sec}` : ' · fecha tradicional'}
                {y.approx && y.sec ? ' · fecha discutida entre fuentes' : ''}
              </p>
            </li>
          ))}
          <li dir="ltr" className="pt-1 text-[11px] text-ink-faint">
            Lista curada, emparejada con el luaj; corrígela si hace falta. · לזכר נשמת הצדיקים
          </li>
        </ul>
      )}
    </button>
  );
}
