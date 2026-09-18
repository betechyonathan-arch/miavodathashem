import { Sheet } from './ui';
import { areaInfo } from '../lib/areaInfo';
import { catEmoji, catHe, catLabel } from '../lib/categories';
import type { AreaId } from '../lib/db/schema';

/**
 * Ficha de un área: qué es, su fuente (pasuk / Chazal / Rambam), qué registrar
 * y una kavaná. "Que esté todo especificado."
 */
export default function AreaInfoSheet({
  area,
  open,
  onClose,
}: {
  area: AreaId | null;
  open: boolean;
  onClose: () => void;
}) {
  const info = area ? areaInfo(area) : undefined;
  return (
    <Sheet
      open={open && !!info}
      onClose={onClose}
      title={
        area && (
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
                {catLabel(area)}
                {info ? ` · ${info.translit}` : ''}
              </div>
              <div className="hebrew text-2xl text-gold">{catHe(area)}</div>
            </div>
            <span className="text-2xl">{catEmoji(area)}</span>
          </div>
        )
      }
    >
      {info && area && <AreaInfoBody area={area} />}
    </Sheet>
  );
}

/** El cuerpo de la ficha, reutilizable fuera del Sheet (p. ej. en /areas). */
export function AreaInfoBody({ area }: { area: AreaId }) {
  const info = areaInfo(area);
  if (!info) return null;
  return (
    <div className="space-y-4 text-[13px] leading-relaxed text-ink-soft">
      <p>{info.definicion}</p>

      <div className="rounded-xl border border-line bg-sunken p-3">
        <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-ink-faint">מקור · Fuente</div>
        <p className="hebrew text-[17px] leading-relaxed text-ink">{info.fuente.texto}</p>
        <p dir="ltr" className="mt-1 text-[11px] text-ink-faint">{info.fuente.cita}</p>
      </div>

      <div>
        <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-ink-faint">Qué registrar aquí</div>
        <p>{info.queRegistrar}</p>
      </div>

      <div className="border-t border-line pt-3">
        <div className="mb-1 text-[11px] uppercase tracking-[0.14em] text-ink-faint">כוונה · Kavaná</div>
        <p className="italic text-ink">{info.kavana}</p>
      </div>
    </div>
  );
}
