import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import { catEmoji, catLabel, DASHBOARD_AREAS } from '../lib/categories';
import { detectPatterns } from '../lib/adaptiveEngine';
import { useZury } from '../state/zury';
import { aiReady } from '../lib/ai/config';
import { aiInsights, readInsightsCache } from '../lib/ai/tasks';
import { aiToneLine } from '../lib/accountability';
import { recoveryStats } from '../lib/history';
import { relative, count } from '../lib/format';
import { Btn, Card, SectionTitle } from '../components/ui';
import PeriodDashboard from '../components/PeriodDashboard';
import WatchedFallsCard from '../components/WatchedFallsCard';
import type { AreaId, Entry } from '../lib/db/schema';
import type { PeriodKind } from '../lib/periods';

const WINDOWS = [
  { d: 7, label: '7 días' },
  { d: 30, label: '30 días' },
  { d: 90, label: '90 días' },
];

const TABS: { id: 'ahora' | PeriodKind; label: string; he: string }[] = [
  { id: 'ahora', label: 'Ahora', he: 'עכשיו' },
  { id: 'week', label: 'Semana', he: 'שבוע' },
  { id: 'month', label: 'Mes', he: 'חודש' },
  { id: 'year', label: 'Año', he: 'שנה' },
];

export default function ComoEstoy() {
  const settings = useZury((s) => s.settings);
  const [tab, setTab] = useState<'ahora' | PeriodKind>('ahora');
  const [win, setWin] = useState(30);
  const [aiObs, setAiObs] = useState<string[] | null>(() => readInsightsCache()?.observations ?? null);
  const [aiAt, setAiAt] = useState<number | null>(() => readInsightsCache()?.at ?? null);
  const [aiBusy, setAiBusy] = useState(false);
  const from = useMemo(() => new Date(Date.now() - win * 864e5).toISOString(), [win]);
  const prevFrom = useMemo(() => new Date(Date.now() - win * 2 * 864e5).toISOString(), [win]);

  const rows = useLiveQuery(async () => {
    const all = await db.entries.where('createdAt').aboveOrEqual(prevFrom).toArray();
    return all.filter((e) => !e.deletedAt) as Entry[];
  }, [prevFrom], [] as Entry[]);

  const cur = rows.filter((e) => e.createdAt >= from);
  const prev = rows.filter((e) => e.createdAt < from);

  const countArea = (list: Entry[], a: AreaId) =>
    list.filter((e) => e.area === a || e.areasSecondary.includes(a)).length;

  const victories = cur.filter((e) => e.valence === 'victory').length;
  const falls = cur.filter((e) => e.valence === 'fall').length;
  const recoveries = cur.filter((e) => e.valence === 'recovery').length;
  const prevVictories = prev.filter((e) => e.valence === 'victory').length;
  const prevFalls = prev.filter((e) => e.valence === 'fall').length;

  const fallAreaBag: Record<string, number> = {};
  for (const e of cur.filter((e) => e.valence === 'fall'))
    for (const a of [e.area, ...e.areasSecondary]) fallAreaBag[a] = (fallAreaBag[a] ?? 0) + 1;
  const hardest = Object.entries(fallAreaBag).sort((a, b) => b[1] - a[1])[0];

  const growing: { a: AreaId; now: number; before: number }[] = [];
  const falling: { a: AreaId; now: number; before: number }[] = [];
  for (const a of DASHBOARD_AREAS) {
    const n = countArea(cur, a);
    const b = countArea(prev, a);
    if (n > b) growing.push({ a, now: n, before: b });
    else if (n < b) falling.push({ a, now: n, before: b });
  }
  growing.sort((x, y) => y.now - y.before - (x.now - x.before));
  falling.sort((x, y) => x.now - x.before - (y.now - y.before));

  const patterns = detectPatterns(cur, win);
  const biggestVictory = cur.filter((e) => e.valence === 'victory').slice(-1)[0];

  return (
    <div className="space-y-4">
      <SectionTitle es="¿Cómo estoy?" he="איך אני?" />

      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg border py-1.5 text-[12px] ${
              tab === t.id ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-soft'
            }`}
          >
            {t.label}
            <span className="hebrew block text-[10px] opacity-70">{t.he}</span>
          </button>
        ))}
      </div>

      {tab !== 'ahora' ? (
        <PeriodDashboard kind={tab} />
      ) : (
      <>
      <div className="flex gap-1.5">
        {WINDOWS.map((w) => (
          <button
            key={w.d}
            onClick={() => setWin(w.d)}
            className={`rounded-lg border px-3 py-1 text-[13px] ${
              win === w.d ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-soft'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat n={victories} prev={prevVictories} label="🟢 Victorias" />
        <Stat n={falls} prev={prevFalls} label="🔴 Caídas" invert />
        <Stat n={recoveries} label="🔄 Recuperación" />
      </div>

      <Card className="p-4">
        <SectionTitle es="Actividad por área" he="תחומים" />
        <div className="space-y-2">
          {DASHBOARD_AREAS.map((a) => {
            const n = countArea(cur, a);
            const max = Math.max(1, ...DASHBOARD_AREAS.map((x) => countArea(cur, x)));
            return (
              <div key={a} className="flex items-center gap-2 text-[12px]">
                <span className="w-28 shrink-0 text-ink-soft">
                  {catEmoji(a)} {catLabel(a)}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
                  <span className="block h-full rounded-full bg-gold" style={{ width: `${(n / max) * 100}%` }} />
                </span>
                <span className="w-6 text-right text-ink-faint">{n}</span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card className="p-4">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-ink-faint">Está creciendo</div>
          {growing.length ? (
            growing.slice(0, 4).map((g) => (
              <p key={g.a} className="text-[13px] text-ink">
                {catEmoji(g.a)} {catLabel(g.a)} <span className="text-ink-faint">{g.before}→{g.now}</span>
              </p>
            ))
          ) : (
            <p className="text-[12px] text-ink-faint">—</p>
          )}
        </Card>
        <Card className="p-4">
          <div className="mb-1 text-[12px] uppercase tracking-wide text-ink-faint">Está bajando</div>
          {falling.length ? (
            falling.slice(0, 4).map((g) => (
              <p key={g.a} className="text-[13px] text-ink">
                {catEmoji(g.a)} {catLabel(g.a)} <span className="text-ink-faint">{g.before}→{g.now}</span>
              </p>
            ))
          ) : (
            <p className="text-[12px] text-ink-faint">—</p>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <SectionTitle es="Dónde está la dificultad" he="הקושי" />
        <p className="text-[13px] text-ink">
          {hardest
            ? `Área con más caídas: ${catEmoji(hardest[0] as AreaId)} ${catLabel(hardest[0] as AreaId)} (${hardest[1]}).`
            : 'No hay caídas registradas en esta ventana.'}
        </p>
        {biggestVictory && (
          <p className="mt-2 text-[13px] text-ink">
            <span className="text-ink-faint">Victoria reciente: </span>
            {biggestVictory.text.slice(0, 160)}
          </p>
        )}
      </Card>

      {(() => {
        const rs = recoveryStats(cur);
        if (rs.pairs.length === 0 && rs.fallsWithoutRecovery === 0) return null;
        return (
          <Card className="p-4">
            <SectionTitle es="Tiempo de recuperación" he="זמן התאוששות" />
            <p className="text-[13px] text-ink">
              {rs.avgHours != null
                ? `De la caída al regreso: ${rs.avgHours} h de media (mediana ${rs.medianHours} h), sobre ${count(rs.pairs.length, 'recuperación', 'recuperaciones')}.`
                : 'Aún no hay caídas con recuperación registrada en esta ventana.'}
            </p>
            {rs.trend && (
              <p className="mt-1 text-[12px]">
                Tendencia:{' '}
                <span className={rs.trend === 'mejora' ? 'text-[var(--success)]' : rs.trend === 'empeora' ? 'text-[var(--danger)]' : 'text-ink-faint'}>
                  {rs.trend === 'mejora' ? 'vuelves más rápido' : rs.trend === 'empeora' ? 'tardas más en volver' : 'estable'}
                </span>
              </p>
            )}
            {rs.fallsWithoutRecovery > 0 && (
              <p className="mt-1 text-[12px] text-ink-faint">
                {count(rs.fallsWithoutRecovery, 'caída', 'caídas')} sin recuperación registrada. Registrar la vuelta también cuenta.
              </p>
            )}
          </Card>
        );
      })()}

      <WatchedFallsCard />

      {patterns.length > 0 && (
        <Card className="space-y-1.5 p-4">
          <SectionTitle es="Patrones observados" he="דפוסים" />
          {patterns.map((p, i) => (
            <p key={i} className="text-[13px] text-ink-soft">
              • {p.observation}
            </p>
          ))}
        </Card>
      )}

      {aiReady(settings) && (
        <Card className="space-y-2 p-4">
          <SectionTitle
            es="Observaciones (IA)"
            he="✦"
            extra={
              <Btn
                variant="ghost"
                onClick={async () => {
                  setAiBusy(true);
                  const r = await aiInsights(cur, settings!.aiModel, aiToneLine(settings!.strictness));
                  setAiBusy(false);
                  if (r) {
                    setAiObs(r);
                    setAiAt(Date.now());
                  }
                }}
              >
                {aiBusy ? 'Analizando…' : aiObs ? 'Volver a analizar' : 'Analizar'}
              </Btn>
            }
          />
          {aiObs?.length ? (
            <>
              {aiObs.map((o, i) => (
                <p key={i} className="text-[13px] text-ink-soft">
                  • {o}
                </p>
              ))}
              {aiAt && <p className="pt-1 text-[11px] text-ink-faint">{relative(new Date(aiAt).toISOString())}</p>}
            </>
          ) : (
            <p className="text-[12px] text-ink-faint">
              La IA lee tus registros recientes y devuelve tendencias y correlaciones. Solo se ejecuta cuando lo pides.
              Nunca causalidad, nunca psak, nunca “Tikún”.
            </p>
          )}
        </Card>
      )}

      <p className="text-center text-[11px] text-ink-faint">
        Esto no se reduce a un solo número. Es un espejo, no un veredicto.
      </p>
      </>
      )}
    </div>
  );
}

function Stat({ n, prev, label, invert }: { n: number; prev?: number; label: string; invert?: boolean }) {
  const delta = prev == null ? null : n - prev;
  const good = delta == null ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <Card className="p-3 text-center">
      <div className="text-2xl font-semibold text-ink">{n}</div>
      <div className="text-[11px] text-ink-faint">{label}</div>
      {delta != null && (
        <div className={`text-[11px] ${good ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {delta > 0 ? '+' : ''}
          {delta} vs. periodo previo
        </div>
      )}
    </Card>
  );
}
