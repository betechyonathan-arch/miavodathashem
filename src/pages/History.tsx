import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link, useSearchParams } from 'react-router-dom';
import { db } from '../lib/db/db';
import { listDays, listEntries } from '../lib/db/repo';
import { CATEGORIES } from '../lib/categories';
import { hebrewDateEs, count } from '../lib/format';
import { daySnapshots, lifeline, type DaySnapshot } from '../lib/history';
import { useZury } from '../state/zury';
import { Card, SectionTitle, inputCls } from '../components/ui';
import EntryList from '../components/EntryList';
import type { AreaId, Entry } from '../lib/db/schema';

export default function History() {
  const [params] = useSearchParams();
  const [tab, setTab] = useState<'dias' | 'comparar'>(params.get('t') === 'comparar' ? 'comparar' : 'dias');
  const [q, setQ] = useState('');
  const [area, setArea] = useState<AreaId | ''>('');
  const [valence, setValence] = useState<'' | 'victory' | 'fall' | 'recovery'>('');

  const days = useLiveQuery(() => listDays(120), [], []);
  const searching = q.trim().length > 1 || area !== '' || valence !== '';

  const results = useLiveQuery(async () => {
    if (!searching) return [] as Entry[];
    const rows = await listEntries({
      text: q.trim() || undefined,
      area: area || undefined,
      valence: valence || undefined,
      limit: 200,
    });
    return rows.reverse();
  }, [q, area, valence], [] as Entry[]);

  const countByDay = useLiveQuery(async () => {
    const all = await db.entries.toArray();
    const m: Record<string, number> = {};
    for (const e of all) if (!e.deletedAt) m[e.dayId] = (m[e.dayId] ?? 0) + 1;
    return m;
  }, [], {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <SectionTitle es="Tu historia" he="המסע שלי" />

      <div className="flex gap-1">
        {[
          { id: 'dias', label: 'Días', he: 'ימים' },
          { id: 'comparar', label: 'Comparar', he: 'השוואה' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as 'dias' | 'comparar')}
            className={`flex-1 rounded-lg border py-1.5 text-[12px] ${
              tab === t.id ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-soft'
            }`}
          >
            {t.label}
            <span className="hebrew block text-[10px] opacity-70">{t.he}</span>
          </button>
        ))}
      </div>

      {tab === 'comparar' ? (
        <CompareView />
      ) : (
        <>
          <Card className="space-y-2 p-3">
            <input
              className={inputCls}
              placeholder="Buscar en todo: Bitajón, Kaas, Yerushalayim, una frase…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="flex flex-wrap gap-1.5">
              <select className={inputCls + ' w-auto flex-1'} value={area} onChange={(e) => setArea(e.target.value as AreaId | '')}>
                <option value="">Todas las áreas</option>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.emoji} {c.es}
                  </option>
                ))}
              </select>
              <select
                className={inputCls + ' w-auto'}
                value={valence}
                onChange={(e) => setValence(e.target.value as '' | 'victory' | 'fall' | 'recovery')}
              >
                <option value="">Todo</option>
                <option value="victory">🟢 Victorias</option>
                <option value="fall">🔴 Caídas</option>
                <option value="recovery">🔄 Recuperación</option>
              </select>
            </div>
          </Card>

          {searching ? (
            <div>
              <p className="mb-2 text-[12px] text-ink-faint">{count(results.length, 'resultado', 'resultados')}</p>
              <EntryList entries={results} />
            </div>
          ) : (
            <ul className="space-y-2">
              {days.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/dia/${d.id}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-raised p-3"
                  >
                    <span>
                      <span className="hebrew block text-[15px] text-ink">{d.hebrewDateHe}</span>
                      <span className="block text-[12px] text-ink-faint">
                        {hebrewDateEs(d.hebrewDate)}
                        {d.isShabbat ? ' · שבת' : ''}
                        {d.isYomTov ? ' · יו״ט' : ''}
                      </span>
                    </span>
                    <span className="text-right text-[12px] text-ink-faint">
                      {countByDay[d.id] ?? 0} reg.
                      {d.cheshbon ? <span className="block text-gold">✓ חשבון</span> : null}
                    </span>
                  </Link>
                </li>
              ))}
              {days.length === 0 && (
                <Card className="p-6 text-center text-[13px] text-ink-faint">
                  Todavía no hay días registrados. Empieza hoy.
                </Card>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function CompareView() {
  const today = useZury((s) => s.day);
  const snaps = useLiveQuery(() => (today ? daySnapshots(today.dayId) : Promise.resolve([])), [today?.dayId], [] as DaySnapshot[]);
  const months = useLiveQuery(() => lifeline(), [], []);
  const maxM = useMemo(() => Math.max(1, ...months.map((m) => m.entries)), [months]);

  const withData = snaps.filter((s) => s.exists);
  const now = snaps.find((s) => s.offsetDays === 0);

  return (
    <div className="space-y-4">
      <SectionTitle es="Hoy vs. el pasado" he="היום מול העבר" />
      {withData.length <= 1 ? (
        <Card className="p-5 text-center text-[13px] text-ink-faint">
          Aún no hay historial para comparar. Con el tiempo verás hoy junto a hace 1 mes, 1 año, 5 años…
        </Card>
      ) : (
        <div className="space-y-2">
          {withData.map((s) => (
            <Card key={s.offsetDays} className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-medium text-ink">{s.label}</div>
                  <div className="hebrew text-[11px] text-ink-faint">{s.hebrewDateHe ?? s.dayId}</div>
                </div>
                {s.offsetDays > 0 && now && (
                  <div className="text-right text-[11px] text-ink-faint">
                    <Delta label="reg." now={now.entries} then={s.entries} />
                    <Delta label="🟢" now={now.victories} then={s.victories} />
                    <Delta label="🔴" now={now.falls} then={s.falls} invert />
                  </div>
                )}
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-ink-soft">
                <span>{s.entries} registros</span>
                {s.torahMin > 0 && <span>· {s.torahMin} min Torá</span>}
                {s.victories > 0 && <span>· {s.victories} 🟢</span>}
                {s.falls > 0 && <span>· {s.falls} 🔴</span>}
                {s.moodEnd != null && <span>· ánimo {s.moodEnd}/10</span>}
                {s.cheshbon && <span className="text-gold">· ✓ חשבון</span>}
              </div>
              {s.summary && s.offsetDays > 0 && (
                <p className="mt-1 line-clamp-2 text-[11px] text-ink-faint">{s.summary}</p>
              )}
              {s.offsetDays > 0 && (
                <Link to={`/dia/${s.dayId}`} className="mt-1 inline-block text-[11px] text-gold">
                  ver ese día →
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}

      {months.length > 1 && (
        <div>
          <SectionTitle es="Línea de vida" he="קו החיים" />
          <Card className="p-4">
            <div className="flex items-end gap-[3px]" style={{ height: 80 }}>
              {months.map((m) => (
                <div
                  key={m.ym}
                  title={`${m.ym}: ${m.entries} registros`}
                  className="flex-1 rounded-t bg-gold"
                  style={{ height: `${Math.max(3, (m.entries / maxM) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-ink-faint">
              <span>{months[0].ym}</span>
              <span>{months[months.length - 1].ym}</span>
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">Registros por mes en todo tu historial.</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function Delta({ label, now, then, invert }: { label: string; now: number; then: number; invert?: boolean }) {
  const d = now - then;
  if (d === 0) return <div>{label} =</div>;
  const good = invert ? d < 0 : d > 0;
  return (
    <div className={good ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
      {label} {d > 0 ? '+' : ''}
      {d}
    </div>
  );
}
