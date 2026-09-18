/*
  Arma un MusarContext a partir de lo que ya vive en la store (ajustes + día
  judío), sin tocar la base. Las señales que dependen de los registros de hoy
  (caíste, día vacío, día fuerte) las añade quien ya tenga esos datos cargados.
*/
import type { Settings } from '../db/schema';
import type { JewishDayInfo } from '../jewishDay';
import type { MusarContext, MusarSlot, MusarTheme } from './index';

/** Franja del día por la hora local: mañana (cercanía) / tarde (zerizut) / noche (teshuvá). */
export function slotForHour(h: number): MusarSlot {
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

export function baseMusarContext(
  settings: Settings | null,
  day: JewishDayInfo | null,
): MusarContext {
  const isElul = day?.hebrewMonth === 'Elul';
  const isAseretYemeiTeshuva =
    day?.hebrewMonth === 'Tishrei' && (day?.hebrewDay ?? 99) >= 1 && (day?.hebrewDay ?? 99) <= 10;
  return {
    strictness: settings?.strictness ?? 'demanding',
    preferred: (settings?.musar?.themes ?? []) as MusarTheme[],
    isElul,
    isAseretYemeiTeshuva,
    isShabbat: !!(day?.isShabbat || day?.isYomTov),
    slot: slotForHour(new Date().getHours()),
  };
}
