import { useEffect, useMemo, useRef, useState } from 'react';
import { useZury } from '../state/zury';
import { periodFor, prevPeriod, type PeriodKind } from '../lib/periods';
import { buildBoletaForPeriod, mergeBoleta } from '../lib/boleta';
import { boletaHtml, openPrintable } from '../lib/exportHtml';
import type { PeriodBoleta, Settings } from '../lib/db/schema';
import { Btn, Card, SectionTitle } from '../components/ui';

const KIND_TABS: { id: PeriodKind; label: string; he: string }[] = [
  { id: 'week', label: 'Semana', he: 'שבוע' },
  { id: 'month', label: 'Mes', he: 'חודש' },
  { id: 'year', label: 'Año', he: 'שנה' },
];

const KIND_TITLE: Record<
  PeriodKind,
  { closedEs: string; closedHe: string; progressEs: string; progressHe: string }
> = {
  week: { closedEs: 'La semana que cerró', closedHe: 'הַשָּׁבוּעַ שֶׁעָבַר', progressEs: 'Semana en curso (parcial)', progressHe: 'הַשָּׁבוּעַ' },
  month: { closedEs: 'El mes que cerró', closedHe: 'הַחֹדֶשׁ שֶׁעָבַר', progressEs: 'Mes en curso (parcial)', progressHe: 'הַחֹדֶשׁ' },
  year: { closedEs: 'El año que cerró (Rosh Hashaná)', closedHe: 'הַשָּׁנָה שֶׁעָבְרָה', progressEs: 'Año en curso (parcial)', progressHe: 'הַשָּׁנָה' },
};

const AUTO_KEY: Record<PeriodKind, keyof Settings['boleta']> = {
  week: 'autoOnNewWeek',
  month: 'autoOnNewMonth',
  year: 'autoOnRoshHashana',
};

function BoletaView({ b }: { b: PeriodBoleta }) {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">{b.label}</div>
          <div className="text-[10px] text-ink-faint">{b.by === 'ai' ? '✦ con IA' : 'por reglas'}</div>
        </div>
        <div className="mt-1 text-[11px] text-ink-faint">
          {b.stats.entries} registros · {b.stats.victories} 🟢 · {b.stats.falls} 🔴
          {b.stats.watchedFalls > 0 ? ` (${b.stats.watchedFalls} de vigilancia)` : ''} · Torá{' '}
          {b.stats.torahDays}/{b.stats.totalDays} · Cheshbon {b.stats.cheshbonDays}/{b.stats.totalDays}
        </div>
        <button
          onClick={() => openPrintable(boletaHtml(b))}
          className="mt-3 text-[12px] font-medium text-gold"
        >
          Exportar a PDF →
        </button>
      </Card>

      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="hebrew text-lg text-[var(--success)]">הַטּוֹב</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">Dónde estuviste bien</span>
        </div>
        <Card className="whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-ink">{b.bien}</Card>
      </div>

      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="hebrew text-lg text-[var(--danger)]">הַצָּרִיךְ תִּקּוּן</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">Dónde estuviste mal</span>
        </div>
        <Card className="whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-ink">{b.mal}</Card>
      </div>

      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="hebrew text-lg text-gold">חִזּוּק</span>
          <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">El refuerzo</span>
        </div>
        <Card className="p-4 text-[14px] leading-relaxed text-ink">{b.refuerzo}</Card>
      </div>

      {b.detalle && (
        <div>
          <div className="mb-1 flex items-baseline gap-2">
            <span className="hebrew text-lg text-gold">פֵּרוּט</span>
            <span className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">Detalle del año</span>
          </div>
          <Card className="whitespace-pre-wrap p-4 text-[13px] leading-relaxed text-ink">{b.detalle}</Card>
        </div>
      )}

      <div>
        <div className="mb-1 flex items-baseline gap-2">
          <span className="hebrew text-lg text-gold">מוּסָר</span>
        </div>
        <Card className="p-4 text-center">
          {b.musar.he && (
            <p className="hebrew text-[16px] leading-relaxed text-gold" dir="rtl">
              {b.musar.he}
            </p>
          )}
          <p className={`text-[13px] leading-relaxed text-ink-soft ${b.musar.he ? 'mt-1' : ''}`}>{b.musar.es}</p>
          {b.musar.sourceEs && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">{b.musar.sourceEs}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function BoletaKindPanel({ kind }: { kind: PeriodKind }) {
  const { settings, day, saveSettings } = useZury();
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const autoTried = useRef<PeriodKind | null>(null);

  const boletas = useMemo(
    () => (settings?.boleta?.boletas ?? []).filter((b) => b.kind === kind),
    [settings, kind],
  );
  const lastPeriod = useMemo(() => (day ? prevPeriod(periodFor(kind, day.dayId)) : null), [day, kind]);
  const thisPeriod = useMemo(() => (day ? periodFor(kind, day.dayId) : null), [day, kind]);

  const lastBoleta = lastPeriod ? boletas.find((b) => b.id === `${kind}:${lastPeriod.fromKey}`) : undefined;

  async function generate(which: 'last' | 'this') {
    if (!settings || !day || !lastPeriod || !thisPeriod) return;
    const period = which === 'last' ? lastPeriod : thisPeriod;
    setBusy(period.fromKey);
    try {
      const b = await buildBoletaForPeriod(period, settings, day);
      await saveSettings({
        boleta: {
          ...settings.boleta,
          boletas: mergeBoleta(settings.boleta?.boletas, b),
          ...(which === 'last'
            ? kind === 'week'
              ? { lastGeneratedWeekKey: b.id }
              : kind === 'month'
                ? { lastGeneratedMonthKey: b.id }
                : { lastGeneratedYearKey: b.id }
            : {}),
        },
      });
    } finally {
      setBusy(null);
    }
  }

  // Se genera sola al abrir la pantalla si cerró el periodo y no tiene boleta.
  useEffect(() => {
    if (autoTried.current === kind) return;
    if (!settings?.boleta?.[AUTO_KEY[kind]] || !lastPeriod || lastBoleta || busy) return;
    autoTried.current = kind;
    void generate('last');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, lastPeriod, lastBoleta, kind]);

  if (!settings || !day || !lastPeriod || !thisPeriod) return null;

  const title = KIND_TITLE[kind];
  const past = boletas.filter((b) => b.id !== lastBoleta?.id);

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle es={title.closedEs} he={title.closedHe} />
        {lastBoleta ? (
          <BoletaView b={lastBoleta} />
        ) : (
          <Card className="p-4 text-center">
            <p className="text-[13px] text-ink-soft">
              {busy === lastPeriod.fromKey ? `Armando la boleta de ${lastPeriod.label}…` : `Aún no hay boleta de ${lastPeriod.label}.`}
            </p>
            {busy !== lastPeriod.fromKey && (
              <Btn className="mt-3" onClick={() => generate('last')}>
                Generar boleta
              </Btn>
            )}
          </Card>
        )}
      </div>

      <div>
        <SectionTitle es={title.progressEs} he={title.progressHe} />
        {(() => {
          const b = boletas.find((x) => x.id === `${kind}:${thisPeriod.fromKey}`);
          return b ? (
            <BoletaView b={b} />
          ) : (
            <Card className="p-4 text-center">
              <p className="text-[13px] text-ink-soft">
                Puedes generar una boleta parcial de {thisPeriod.label} con lo que llevas.
              </p>
              <Btn
                variant="ghost"
                className="mt-3"
                onClick={() => generate('this')}
                disabled={busy === thisPeriod.fromKey}
              >
                {busy === thisPeriod.fromKey ? 'Generando…' : 'Generar boleta parcial'}
              </Btn>
            </Card>
          );
        })()}
      </div>

      {past.length > 0 && (
        <div>
          <SectionTitle es="Boletas anteriores" he="תְּעוּדוֹת קוֹדְמוֹת" />
          <div className="space-y-2">
            {past.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <button
                  onClick={() => setOpen(open === b.id ? null : b.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-[13px] text-ink">{b.label}</span>
                  <span className="text-[11px] text-ink-faint">
                    {b.stats.torahDays}/{b.stats.totalDays} Torá · {b.stats.falls} 🔴 · {open === b.id ? '−' : '+'}
                  </span>
                </button>
                {open === b.id && (
                  <div className="border-t border-line p-4">
                    <BoletaView b={b} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Boleta() {
  const [tab, setTab] = useState<PeriodKind>('week');

  return (
    <div className="space-y-6">
      <SectionTitle es="Boletas" he="תְּעוּדוֹת" />
      <p className="-mt-3 text-[12px] leading-relaxed text-ink-faint">
        Cada semana, cada mes y cada año hebreo que cierra —el año, justo en Rosh Hashaná— el sistema
        arma una boleta: dónde estuviste bien y dónde mal, a detalle y con los números, un refuerzo
        concreto para lo que entra y un musar. Se generan solas al abrir la app; aquí puedes releerlas,
        rehacerlas y exportarlas a PDF.
      </p>

      <div className="flex gap-1">
        {KIND_TABS.map((t) => (
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

      <BoletaKindPanel key={tab} kind={tab} />
    </div>
  );
}
