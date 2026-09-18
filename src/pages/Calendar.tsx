import { useMemo, useState } from 'react';
import { useZury } from '../state/zury';
import {
  dowEs,
  dowHe,
  omerFor,
  parashaFor,
  specialToday,
  upcomingHolidays,
  zmanimRows,
  type HolidayCountdown,
} from '../lib/hebcalExtra';
import { hebrewDateEs, timeHM, count } from '../lib/format';
import { Card, SectionTitle } from '../components/ui';

const FEATURED: { re: RegExp; label: string; he: string }[] = [
  { re: /^Rosh Hashana 5\d\d\d/, label: 'Rosh Hashaná', he: 'ראש השנה' },
  { re: /^Yom Kippur/, label: 'Yom Kipur', he: 'יום כיפור' },
  { re: /^Sukkot I$/, label: 'Sucot', he: 'סוכות' },
  { re: /^Simchat Torah$|^Shmini Atzeret$/, label: 'Sim. Torá', he: 'שמחת תורה' },
  { re: /^Chanukah: 1 Candle/, label: 'Janucá', he: 'חנוכה' },
  { re: /^Purim$/, label: 'Purim', he: 'פורים' },
  { re: /^Pesach I$/, label: 'Pésaj', he: 'פסח' },
  { re: /^Shavuot I?$/, label: 'Shavuot', he: 'שבועות' },
];

function daysLabel(n: number): string {
  if (n === 0) return 'HOY';
  if (n === 1) return 'mañana';
  return `faltan ${n} días`;
}

export default function Calendar() {
  const { day, settings } = useZury();
  const [showZmanim, setShowZmanim] = useState(false);

  const data = useMemo(() => {
    if (!day || !settings) return null;
    const il = settings.location.israel;
    const all = upcomingHolidays(settings, 400, 60);
    const featured = FEATURED.map((f) => ({
      ...f,
      h: all.find((x) => f.re.test(x.desc)) ?? null,
    })).filter((x) => x.h) as { label: string; he: string; h: HolidayCountdown }[];
    return {
      parasha: parashaFor(day.dayId, il),
      special: specialToday(day.dayId, settings),
      omer: omerFor(settings),
      featured: featured.slice(0, 4),
      list: all,
      zmanim: zmanimRows(day.dayId, settings),
    };
  }, [day, settings]);

  if (!day || !settings || !data) return null;
  const tz = settings.location.tzid;

  return (
    <div className="space-y-4">
      <SectionTitle es="Calendario hebreo" he="לוח עברי" />

      {/* Hoy */}
      <Card className="p-4 text-center">
        <div className="hebrew text-lg text-ink-soft">
          {day.displayLagsHalacha && day.nightLabelHe ? day.nightLabelHe : dowHe(day.displayDow)}
        </div>
        <div className="hebrew mt-0.5 text-3xl leading-tight text-gold">{day.displayHebrewDateHe}</div>
        <div className="mt-1 text-[13px] text-ink-soft">
          {day.displayLagsHalacha && day.nightLabelEs ? day.nightLabelEs : dowEs(day.displayDow)} ·{' '}
          {hebrewDateEs(day.displayHebrewDate)}
        </div>
        <div className="mt-1 text-[12px] text-ink-faint">
          El día judío corre de {timeHM(day.startsAt, tz)} a {timeHM(day.endsAt, tz)}
        </div>
        <div className="mt-0.5 text-[11px] text-ink-faint/80">
          {settings.location.label || tz} · hora de {tz.split('/').pop()?.replace(/_/g, ' ')}
          {settings.location.israel ? ' · Éretz Israel' : ''}
        </div>
        {day.displayLagsHalacha ? (
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint/80">
            Ya anocheció, pero {settings.dateDisplayMode === 'despertar' ? 'hasta tu hora de despertar' : 'hasta la medianoche'} sigues
            viendo esta fecha (y los yahrzeits van con ella). Para la halajá — Shabat y festivos — ya corre {hebrewDateEs(day.hebrewDate)}.
          </p>
        ) : day.eveningPhase ? (
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint/80">
            Ya anocheció en tu ciudad: desde el anochecer corre esta fecha hebrea y con ella los yahrzeits.
          </p>
        ) : (
          <p className="mt-1 text-[11px] leading-relaxed text-ink-faint/80">
            La fecha hebrea y los yahrzeits se calculan con esta ubicación.
          </p>
        )}
      </Card>

      {/* Días especiales */}
      {data.special.length > 0 && (
        <Card className="space-y-1 p-4">
          {data.special.map((s, i) => (
            <p key={i} className="hebrew text-[15px] text-gold">
              {s}
            </p>
          ))}
        </Card>
      )}

      {/* Parashá */}
      {data.parasha && (
        <Card className="p-4">
          <SectionTitle es="Parashá de la semana" he="פרשת השבוע" />
          <div className="hebrew text-2xl text-gold">{data.parasha.he}</div>
          <div className="text-[13px] text-ink-soft">
            {data.parasha.name}
            {data.parasha.daysUntil > 0 && (
              <span className="text-ink-faint"> · se lee en {count(data.parasha.daysUntil, 'día', 'días')}</span>
            )}
          </div>
        </Card>
      )}

      {/* Omer */}
      {data.omer && (
        <Card className="p-4 text-center">
          <SectionTitle es="Cuenta del Omer" he="ספירת העומר" />
          <div className="hebrew text-xl text-gold">{data.omer.he}</div>
          <div className="text-[12px] text-ink-faint">
            Día {data.omer.day} de 49 · {count(data.omer.weeks, 'semana', 'semanas')} y {count(data.omer.daysInWeek, 'día', 'días')}
          </div>
        </Card>
      )}

      {/* Cuentas regresivas destacadas */}
      <div>
        <SectionTitle es="Cuánto falta" he="כמה נשאר" />
        <div className="grid grid-cols-2 gap-2">
          {data.featured.map((f) => (
            <Card key={f.label} className="p-3 text-center">
              <div className="hebrew text-lg text-gold">{f.he}</div>
              <div className="text-[11px] text-ink-faint">{f.label}</div>
              <div className="mt-1 text-2xl font-semibold text-ink">
                {f.h.daysUntil === 0 ? '—' : f.h.daysUntil}
              </div>
              <div className="text-[11px] text-ink-faint">{daysLabel(f.h.daysUntil)}</div>
              <div className="text-[10px] text-ink-faint">{hebrewDateEs(f.h.hebrewDate)}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Lista completa */}
      <div>
        <SectionTitle es="Próximas fechas" he="מועדים קרובים" />
        <Card className="divide-y divide-line p-0">
          {data.list.map((h, i) => (
            <div key={i} className="flex items-center justify-between gap-2 px-4 py-2.5">
              <div className="min-w-0">
                <div className="hebrew truncate text-[14px] text-ink">
                  {h.emoji !== '•' ? h.emoji + ' ' : ''}
                  {h.he}
                </div>
                <div className="text-[11px] text-ink-faint">{hebrewDateEs(h.hebrewDate)}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[13px] text-ink-soft">{h.daysUntil === 0 ? 'HOY' : `${h.daysUntil}d`}</div>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Zmanim */}
      <div>
        <button
          onClick={() => setShowZmanim((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-line bg-raised px-4 py-3 text-[14px] text-ink-soft"
        >
          <span>
            {showZmanim ? '▾' : '▸'} Zmanim de hoy <span className="hebrew text-ink-faint">· זמנים</span>
          </span>
        </button>
        {showZmanim && (
          <Card className="mt-2 divide-y divide-line p-0">
            {data.zmanim.map((z) => (
              <div key={z.key} className="flex items-center justify-between px-4 py-2 text-[13px]">
                <span className="text-ink-soft">
                  {z.label} <span className="hebrew text-ink-faint">{z.he}</span>
                </span>
                <span className="tabular-nums text-ink">{timeHM(z.time, tz)}</span>
              </div>
            ))}
            <div className="px-4 py-2 text-[10px] text-ink-faint">
              Calculados para {settings.location.label} ({tz}). Ajusta la ubicación en Ajustes.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
