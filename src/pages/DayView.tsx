import { useLiveQuery } from 'dexie-react-hooks';
import { useParams, useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { getDay, listEntries, exportDay } from '../lib/db/repo';
import { hebrewDateEs, timeHM } from '../lib/format';
import { Btn, Card, SectionTitle } from '../components/ui';
import EntryList from '../components/EntryList';
import { download } from '../lib/exportFile';
import { dayHtml, openPrintable } from '../lib/exportHtml';

export default function DayView() {
  const { dayId = '' } = useParams();
  const navigate = useNavigate();
  const tz = useZury((s) => s.settings?.location.tzid);
  const day = useLiveQuery(() => getDay(dayId), [dayId]);
  const entries = useLiveQuery(() => listEntries({ dayId, includeArchived: true }), [dayId], []);

  if (day === undefined) return <p className="text-center text-ink-faint">Cargando…</p>;
  if (!day)
    return (
      <div className="space-y-3">
        <p className="text-ink-faint">Ese día aún no tiene registro.</p>
        <Btn variant="ghost" onClick={() => navigate(-1)}>
          ← Volver
        </Btn>
      </div>
    );

  return (
    <div className="space-y-4">
      <button onClick={() => navigate(-1)} className="text-[12px] text-gold">
        ← Volver
      </button>

      <div>
        <div className="hebrew text-3xl text-gold">{day.hebrewDateHe}</div>
        <div className="text-[13px] text-ink-soft">{hebrewDateEs(day.hebrewDate)}</div>
        <div className="mt-1 text-[12px] text-ink-faint">
          {day.isShabbat ? 'שבת · ' : ''}
          {day.isYomTov ? 'יום טוב · ' : ''}
          El día judío corrió de {timeHM(day.startsAt, tz)} a {timeHM(day.endsAt, tz)}
          {day.holidays.length ? ` · ${day.holidays.join(', ')}` : ''}
        </div>
      </div>

      {day.checkIn && (
        <Card className="p-4">
          <SectionTitle es="Check-in de inicio" he="כוונה ליום" />
          <ul className="space-y-2 text-[13px]">
            {day.checkIn.answers.map((a, i) => (
              <li key={i}>
                <span className="block text-ink-faint">{a.q}</span>
                <span className="text-ink">{a.a}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {day.autoSummary && (
        <Card className="whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-ink">
          <SectionTitle es="Resumen automático" he="📜 סיכום היום" />
          {day.autoSummary.text}
        </Card>
      )}

      {day.cheshbon && (
        <Card className="p-4">
          <SectionTitle es="חשבון הנפש" he="חשבון הנפש" />
          <ul className="space-y-2 text-[13px]">
            {day.cheshbon.answers.map((a, i) => (
              <li key={i}>
                <span className="block text-ink-faint">{a.q}</span>
                <span className="text-ink">{a.a}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div>
        <SectionTitle
          es={`Registros del día (${entries.length})`}
          he="מה קרה"
          extra={
            <span className="flex gap-2">
              <button className="text-[12px] text-gold" onClick={() => openPrintable(dayHtml(day, entries))}>
                PDF
              </button>
              <button
                className="text-[12px] text-ink-faint"
                onClick={async () => download(await exportDay(dayId), `zury-${dayId}.json`)}
              >
                JSON
              </button>
            </span>
          }
        />
        {entries.length ? (
          <EntryList entries={entries} />
        ) : (
          <Card className="p-6 text-center text-[13px] text-ink-faint">Sin registros este día.</Card>
        )}
      </div>
    </div>
  );
}
