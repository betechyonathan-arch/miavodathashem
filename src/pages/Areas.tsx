import { useState } from 'react';
import { CATEGORIES, catEmoji } from '../lib/categories';
import { areaInfo } from '../lib/areaInfo';
import { Card, SectionTitle } from '../components/ui';
import AreaInfoSheet from '../components/AreaInfoSheet';
import type { AreaId } from '../lib/db/schema';

const GROUPS: { id: string; es: string; he: string }[] = [
  { id: 'avodah', es: 'Avodá', he: 'עבודה' },
  { id: 'evento', es: 'Eventos del alma', he: 'אירועים' },
  { id: 'diario', es: 'Mundo interior', he: 'עולם פנימי' },
  { id: 'contexto', es: 'Contexto de vida', he: 'הקשר' },
];

/**
 * Referencia: las 27 áreas de registro, cada una con su ficha completa
 * (definición, fuente, qué registrar, kavaná). "Que esté todo especificado."
 */
export default function Areas() {
  const [open, setOpen] = useState<AreaId | null>(null);
  return (
    <div className="space-y-6">
      <SectionTitle es="Las áreas de la avodá" he="תחומי העבודה" />
      <p className="-mt-2 text-[12px] leading-relaxed text-ink-faint">
        Cada registro entra en un área. Aquí está qué es cada una, de dónde viene y qué cuenta
        como registro. Toca una para ver su ficha.
      </p>

      {GROUPS.map((g) => {
        const cats = CATEGORIES.filter((c) => c.group === g.id);
        if (!cats.length) return null;
        return (
          <div key={g.id}>
            <div className="mb-2 flex items-baseline justify-between">
              <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">{g.es}</div>
              <div className="hebrew text-lg text-gold">{g.he}</div>
            </div>
            <Card className="divide-y divide-line">
              {cats.map((c) => {
                const info = areaInfo(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => setOpen(c.id)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                  >
                    <span className="mt-0.5 text-xl">{catEmoji(c.id)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="hebrew text-[17px] text-ink">{c.he}</span>
                        <span className="text-[12px] text-ink-soft">{c.es}</span>
                      </span>
                      {info && (
                        <span dir="ltr" className="mt-0.5 block truncate text-[11px] text-ink-faint">
                          {info.fuente.cita}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 text-ink-faint">›</span>
                  </button>
                );
              })}
            </Card>
          </div>
        );
      })}

      <AreaInfoSheet area={open} open={open !== null} onClose={() => setOpen(null)} />
    </div>
  );
}
