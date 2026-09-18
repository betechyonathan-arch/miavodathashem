import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../lib/db/db';
import type { DayRecord, Entry } from '../lib/db/schema';
import { useZury } from '../state/zury';
import { buckets, periodFor, prevPeriod, nextPeriod, type PeriodKind } from '../lib/periods';
import { buildReport, type Metric } from '../lib/metrics';
import { openPrintable, periodHtml } from '../lib/exportHtml';
import { aiReady } from '../lib/ai/config';
import { aiPeriodAssessment } from '../lib/ai/tasks';
import { Card, SectionTitle } from './ui';

async function rangeEntries(fromKey: string, toKey: string): Promise<Entry[]> {
  const rows = await db.entries.where('dayId').between(fromKey, toKey, true, true).toArray();
  return rows.filter((r) => !r.deletedAt);
}
async function rangeDays(fromKey: string, toKey: string): Promise<DayRecord[]> {
  return db.days.where('id').between(fromKey, toKey, true, true).toArray();
}

export default function PeriodDashboard({ kind }: { kind: PeriodKind }) {
  const today = useZury((s) => s.day);
  const settings = useZury((s) => s.settings);
  const [refKey, setRefKey] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const anchor = refKey ?? today?.dayId ?? null;
  const period = useMemo(() => (anchor ? periodFor(kind, anchor) : null), [kind, anchor]);
  const prev = useMemo(() => (period ? prevPeriod(period) : null), [period]);

  const data = useLiveQuery(async () => {
    if (!period || !prev) return null;
    const [entries, prevEntries, days] = await Promise.all([
      rangeEntries(period.fromKey, period.toKey),
      rangeEntries(prev.fromKey, prev.toKey),
      rangeDays(period.fromKey, period.toKey),
    ]);
    return { entries, prevEntries, days };
  }, [period?.fromKey, period?.toKey, prev?.fromKey]);

  if (!period || !prev) return null;

  const bk = buckets(period);
  const monthBuckets =
    kind === 'year' && data
      ? bk.map((b) => ({
          label: b.label,
          entries: data.entries.filter((e) => e.dayId >= b.fromKey && e.dayId <= b.toKey),
        }))
      : undefined;

  const report =
    data &&
    buildReport({
      entries: data.entries,
      prevEntries: data.prevEntries,
      days: data.days,
      spanDays: period.spanDays,
      monthBuckets,
    });

  const evo = data
    ? bk.map((b) => ({
        label: b.label,
        n: data.entries.filter((e) => e.dayId >= b.fromKey && e.dayId <= b.toKey).length,
      }))
    : [];
  const evoMax = Math.max(1, ...evo.map((x) => x.n));

  const isCurrent = period.toKey >= (today?.dayId ?? '9999');

  async function doExport() {
    if (!report || !data || exporting) return;
    setExporting(true);
    try {
      let assessment;
      if (aiReady(settings)) {
        const vic = data.entries.filter((e) => e.valence === 'victory').length;
        const fal = data.entries.filter((e) => e.valence === 'fall').length;
        const rec = data.entries.filter((e) => e.valence === 'recovery').length;
        assessment =
          (await aiPeriodAssessment(
            {
              kind,
              label: period!.label,
              spanDays: report.spanDays,
              activeDays: report.activeDays,
              totalEntries: report.totalEntries,
              victories: vic,
              falls: fal,
              recoveries: rec,
              prevEntries: data.prevEntries.length,
              prevVictories: data.prevEntries.filter((e) => e.valence === 'victory').length,
              prevFalls: data.prevEntries.filter((e) => e.valence === 'fall').length,
              metrics: report.groups.flatMap((g) =>
                g.metrics.map((m) => ({ group: g.title, label: m.label, value: m.value, tone: m.tone, delta: m.delta })),
              ),
              predominantMiddot: report.predominantMiddot,
              learnings: report.learnings.map((l) => l.text),
              doDifferent: report.doDifferent.map((l) => l.text),
              strongMonths: kind === 'year' ? report.strongMonths : undefined,
              hardMonths: kind === 'year' ? report.hardMonths : undefined,
            },
            settings!.aiModel,
            settings!.strictness,
          )) ?? undefined;
      }
      openPrintable(
        periodHtml({
          title: period!.label,
          labelHe: period!.labelHe,
          rangeText: `${shortDay(period!.fromKey)} – ${shortDay(period!.toKey)}`,
          assessment,
          metrics: report.groups.map((g) => ({
            title: g.title,
            rows: g.metrics.map((m) => ({ label: m.label, value: m.value })),
          })),
          evolution: evo.map((b) => ({ label: b.label, n: b.n })),
          learnings: report.learnings.map((l) => ({ day: l.dayId, text: l.text })),
        }),
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Navegador de periodo */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setRefKey(prev.fromKey)}
          className="rounded-lg border border-line px-3 py-1 text-[13px] text-ink-soft"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="text-[15px] font-medium text-ink">{period.label}</div>
          <div className="text-[11px] text-ink-faint">
            {shortDay(period.fromKey)} – {shortDay(period.toKey)}
          </div>
        </div>
        <button
          disabled={isCurrent}
          onClick={() => setRefKey(nextPeriod(period).fromKey)}
          className="rounded-lg border border-line px-3 py-1 text-[13px] text-ink-soft disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {report && (
        <div className="space-y-1">
          <button
            onClick={doExport}
            disabled={exporting}
            className="w-full rounded-lg border border-line py-1.5 text-[12px] text-gold disabled:opacity-50"
          >
            {exporting
              ? 'Generando la lectura…'
              : aiReady(settings)
                ? 'Exportar PDF — con lectura de la IA'
                : 'Exportar este periodo (PDF / HTML)'}
          </button>
          {!aiReady(settings) && (
            <p className="text-center text-[10px] text-ink-faint">
              Activa la IA en Ajustes para que el PDF incluya “cómo voy / dónde fallé / qué corregir”.
            </p>
          )}
        </div>
      )}

      {!report ? (
        <p className="text-center text-[13px] text-ink-faint">Calculando…</p>
      ) : (
        <>
          {/* Titulares */}
          <div className="grid grid-cols-3 gap-2">
            <Head n={report.totalEntries} prev={data!.prevEntries.length} label="Registros" />
            <Head
              n={data!.entries.filter((e) => e.valence === 'victory').length}
              prev={data!.prevEntries.filter((e) => e.valence === 'victory').length}
              label="🟢 Victorias"
            />
            <Head
              n={data!.entries.filter((e) => e.valence === 'fall').length}
              prev={data!.prevEntries.filter((e) => e.valence === 'fall').length}
              label="🔴 Caídas"
              invert
            />
          </div>

          {/* Evolución */}
          <Card className="p-4">
            <SectionTitle es="Evolución" he="התפתחות" />
            <div className="flex items-end gap-1.5" style={{ height: 90 }}>
              {evo.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-gold"
                      style={{ height: `${(b.n / evoMax) * 100}%`, minHeight: b.n ? 3 : 0 }}
                      title={`${b.n} registros`}
                    />
                  </div>
                  <span className="text-[9px] text-ink-faint">{b.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">Registros por {kind === 'week' ? 'día' : kind === 'month' ? 'semana' : 'mes hebreo'}.</p>
          </Card>

          {/* Grupos de métricas */}
          {report.groups.map((g) => (
            <Card key={g.title} className="p-4">
              <SectionTitle es={g.title} he={g.he} />
              {g.meaning && (
                <p className="mb-3 border-l-2 border-line pl-3 text-[12px] leading-relaxed text-ink-faint">
                  {g.meaning}
                </p>
              )}
              <div className="space-y-2">
                {g.metrics.map((m) => (
                  <MetricRow key={m.id} m={m} />
                ))}
              </div>
            </Card>
          ))}

          {/* Midot predominantes */}
          {report.predominantMiddot.length > 0 && (
            <Card className="p-4">
              <SectionTitle es="Midot predominantes" he="מידות בולטות" />
              <div className="flex flex-wrap gap-1.5">
                {report.predominantMiddot.map(([t, n]) => (
                  <span key={t} className="rounded-lg border border-line px-2 py-1 text-[12px] text-ink-soft">
                    {t} · {n}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-ink-faint">
                Aparecen con frecuencia en tus registros. Es una observación, no un “Tikún”.
              </p>
            </Card>
          )}

          {/* Año: meses fuertes / difíciles */}
          {kind === 'year' && (report.strongMonths.length > 0 || report.hardMonths.length > 0) && (
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-4">
                <div className="mb-1 text-[12px] uppercase tracking-wide text-ink-faint">Períodos fuertes</div>
                {report.strongMonths.map((m) => (
                  <p key={m.label} className="text-[13px] text-ink">
                    {m.label} <span className="text-[var(--success)]">+{m.score}</span>
                  </p>
                ))}
              </Card>
              <Card className="p-4">
                <div className="mb-1 text-[12px] uppercase tracking-wide text-ink-faint">Períodos difíciles</div>
                {report.hardMonths.length ? (
                  report.hardMonths.map((m) => (
                    <p key={m.label} className="text-[13px] text-ink">
                      {m.label} <span className="text-[var(--danger)]">{m.score}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-[12px] text-ink-faint">—</p>
                )}
              </Card>
            </div>
          )}

          {/* Aprendizajes */}
          {report.learnings.length > 0 && (
            <Card className="p-4">
              <SectionTitle es="Qué aprendí" he="מה למדתי" />
              <ul className="space-y-1.5">
                {report.learnings.slice(0, kind === 'year' ? 20 : 10).map((l, i) => (
                  <li key={i} className="text-[13px] text-ink">
                    <Link to={`/dia/${l.dayId}`} className="text-ink-faint">
                      {shortDay(l.dayId)}:
                    </Link>{' '}
                    {l.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {report.doDifferent.length > 0 && (
            <Card className="p-4">
              <SectionTitle es="Si pudiera repetir esos días…" he="מה הייתי משנה" />
              <ul className="space-y-1.5">
                {report.doDifferent.slice(0, kind === 'year' ? 20 : 10).map((l, i) => (
                  <li key={i} className="text-[13px] text-ink">
                    <Link to={`/dia/${l.dayId}`} className="text-ink-faint">
                      {shortDay(l.dayId)}:
                    </Link>{' '}
                    {l.text}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <p className="text-center text-[11px] text-ink-faint">
            Cada número tiene su fórmula (tócalo). No hay una única nota. Es un espejo, no un veredicto.
          </p>
        </>
      )}
    </div>
  );
}

function shortDay(dayId: string): string {
  const d = new Date(dayId + 'T12:00');
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
}

function Head({ n, prev, label, invert }: { n: number; prev: number; label: string; invert?: boolean }) {
  const delta = n - prev;
  const good = invert ? delta <= 0 : delta >= 0;
  return (
    <Card className="p-3 text-center">
      <div className="text-2xl font-semibold text-ink">{n}</div>
      <div className="text-[11px] text-ink-faint">{label}</div>
      {prev > 0 || n > 0 ? (
        <div className={`text-[11px] ${good ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
          {delta > 0 ? '+' : ''}
          {delta} vs. anterior
        </div>
      ) : null}
    </Card>
  );
}

function MetricRow({ m }: { m: Metric }) {
  const [why, setWhy] = useState(false);
  const toneCls =
    m.tone === 'good' ? 'text-[var(--success)]' : m.tone === 'bad' ? 'text-[var(--danger)]' : 'text-ink';
  return (
    <div className="border-b border-line pb-2 last:border-0 last:pb-0">
      <button onClick={() => setWhy((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-[13px] text-ink-soft">
          {m.label}
          {m.he && <span className="text-ink-faint"> · <span className="hebrew text-[11px]">{m.he}</span></span>}
        </span>
        <span className="flex items-center gap-2">
          {m.delta != null && m.delta !== 0 && (
            <span className="text-[11px] text-ink-faint">
              {m.delta > 0 ? '+' : ''}
              {m.delta}
            </span>
          )}
          <span className={`text-[14px] font-medium ${toneCls}`}>{m.value}</span>
        </span>
      </button>
      {m.ratio != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, m.ratio * 100)}%` }} />
        </div>
      )}
      {why && (
        <div className="mt-1.5 rounded-lg bg-sunken p-2 text-[11px] text-ink-faint">
          <div className="text-gold">¿Por qué?</div>
          <div className="mt-0.5">{m.formula}</div>
          <ul className="mt-1 space-y-0.5">
            {m.inputs.map((i, k) => (
              <li key={k}>
                {i.k}: <span className="text-ink-soft">{i.v}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
