import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, catEmoji, catLabel } from '../lib/categories';
import type { AreaId, Valence } from '../lib/db/schema';
import { addEntry, archiveEntry, listEntries } from '../lib/db/repo';
import { useZury } from '../state/zury';
import { Sheet } from './ui';

/** Tag fijo para poder encontrar y borrar lo registrado por Toque Rápido más tarde, aunque hayas cerrado la hoja. */
const TAG = 'toque-rapido';

const VALENCE_OPTS: { id: Valence; label: string; emoji: string }[] = [
  { id: 'victory', label: 'Victoria', emoji: '🟢' },
  { id: 'fall', label: 'Caída', emoji: '🔴' },
  { id: 'recovery', label: 'Recuperación', emoji: '🔄' },
  { id: 'neutral', label: 'Neutral', emoji: '•' },
];

/** Sin "texto libre": esto es para marcar áreas, no para redactar. */
const TAP_AREAS = CATEGORIES.filter((c) => c.id !== 'journal');

interface LoggedRow {
  id: string;
  area: AreaId;
  valence: Valence;
}

export default function QuickTap({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const day = useZury((s) => s.day);
  const [valence, setValence] = useState<Valence>('victory');
  const [log, setLog] = useState<LoggedRow[]>([]);
  const [flash, setFlash] = useState<AreaId | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  const valenceOpt = VALENCE_OPTS.find((v) => v.id === valence)!;

  // Se recarga lo registrado hoy por Toque Rápido cada vez que se abre — así
  // "Deshacer" sigue disponible aunque hayas cerrado la hoja (o la app) desde
  // que tocaste algo por error.
  useEffect(() => {
    if (!open || !day) return;
    let alive = true;
    listEntries({ dayId: day.dayId, tag: TAG }).then((entries) => {
      if (!alive) return;
      setLog(
        entries
          .slice()
          .reverse()
          .map((e) => ({ id: e.id, area: e.area, valence: e.valence })),
      );
    });
    return () => {
      alive = false;
    };
  }, [open, day]);

  async function tap(area: AreaId) {
    if (!day) return;
    const entry = await addEntry({
      dayId: day.dayId,
      hebrewDate: day.hebrewDate,
      area,
      areasSecondary: [],
      tags: [TAG],
      text: `[${catLabel(area)}] ${valenceOpt.label}`,
      source: 'quick',
      valence,
      autoClassified: false,
    });
    setLog((l) => [{ id: entry.id, area, valence }, ...l]);
    setSavedCount((n) => n + 1);
    setFlash(area);
    window.setTimeout(() => setFlash((f) => (f === area ? null : f)), 550);
  }

  async function undo(id: string) {
    await archiveEntry(id);
    setLog((l) => l.filter((e) => e.id !== id));
  }

  function reset() {
    setValence('victory');
    setFlash(null);
    setSavedCount(0);
  }

  function finish() {
    const had = savedCount > 0;
    reset();
    onClose();
    if (had) onSaved?.();
  }

  return (
    <Sheet
      open={open}
      onClose={finish}
      title={
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[13px] uppercase tracking-[0.16em] text-ink-faint">⚡ Toque rápido</div>
            <div className="hebrew text-2xl text-gold">רישום מהיר</div>
          </div>
          {day && <div className="hebrew text-sm text-ink-faint">{day.hebrewDateHe}</div>}
        </div>
      }
    >
      <p className="mb-3 text-[12px] leading-relaxed text-ink-faint">
        Elige la valencia una vez, luego toca cada área — se guarda al instante, sin
        formulario. Puedes tocar varias áreas seguidas. Para escribir el detalle, usa{' '}
        <span className="text-ink-soft">+ Registrar</span> como siempre.
      </p>

      {/* Valencia: se elige una vez y aplica a cada toque siguiente */}
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {VALENCE_OPTS.map((v) => (
          <button
            key={v.id}
            onClick={() => setValence(v.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition ${
              valence === v.id
                ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]'
                : 'border-line bg-raised'
            }`}
          >
            <span className="text-lg leading-none">{v.emoji}</span>
            <span className="text-[10px] leading-tight text-ink-soft">{v.label}</span>
          </button>
        ))}
      </div>

      {/* Áreas: cada toque guarda de inmediato con la valencia elegida arriba */}
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {TAP_AREAS.map((c) => (
          <button
            key={c.id}
            onClick={() => tap(c.id)}
            disabled={!day}
            className={`relative flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition disabled:opacity-40 ${
              flash === c.id
                ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_16%,transparent)]'
                : 'border-line bg-raised active:brightness-95'
            }`}
          >
            {flash === c.id && (
              <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--success)] text-[9px] text-[#0a1a10]">
                ✓
              </span>
            )}
            <span className="text-xl">{c.emoji}</span>
            <span className="hebrew text-[11px] leading-tight text-ink-soft">{c.he}</span>
            <span className="text-[9px] leading-none text-ink-faint">{c.es}</span>
          </button>
        ))}
      </div>

      {/* Lo registrado hoy por Toque Rápido, con deshacer — se recarga cada vez que abres, no se pierde al cerrar */}
      {log.length > 0 && (
        <div className="mb-4 rounded-xl border border-line bg-sunken p-3">
          <div className="mb-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
            Registrado hoy · {log.length}
          </div>
          <ul className="space-y-1.5">
            {log.map((row) => {
              const vo = VALENCE_OPTS.find((v) => v.id === row.valence)!;
              return (
                <li key={row.id} className="flex items-center justify-between text-[12px]">
                  <span className="text-ink-soft">
                    {catEmoji(row.area)} {catLabel(row.area)} · {vo.emoji} {vo.label}
                  </span>
                  <button onClick={() => undo(row.id)} className="text-[11px] text-gold underline underline-offset-2">
                    Deshacer
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <button
        onClick={finish}
        className="w-full rounded-xl bg-gold px-4 py-2.5 text-center text-[15px] font-medium text-[#1a140a] transition-[filter] hover:brightness-105"
      >
        Listo
      </button>
      <p className="mt-3 text-center text-[11px] text-ink-faint">
        ¿Algo de antes que no aparece arriba? También puedes borrar cualquier registro desde{' '}
        <Link to={day ? `/dia/${day.dayId}` : '/historia'} onClick={finish} className="text-gold">
          Ver el día de hoy
        </Link>
        .
      </p>
      <p className="mt-3 text-center text-[11px] text-ink-faint">
        <span className="hebrew">לרשום את האמת · ללמוד ממנה · לקום שוב</span>
      </p>
    </Sheet>
  );
}
