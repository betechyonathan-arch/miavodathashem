import type { AreaId } from './db/schema';
import { getGender } from './gender';

export interface CategoryDef {
  id: AreaId;
  emoji: string;
  he: string;
  es: string;
  hint?: string;
  group: 'avodah' | 'evento' | 'contexto' | 'diario';
}

/** Catálogo de REGISTRO RÁPIDO. El orden es el de aparición en el panel + REGISTRAR. */
const BASE_CATEGORIES: CategoryDef[] = [
  { id: 'journal', emoji: '📝', he: 'טקסט חופשי', es: 'Texto libre', hint: 'Cuéntale al sistema lo que pasó', group: 'diario' },
  { id: 'torah', emoji: '📖', he: 'תורה', es: 'Torá', group: 'avodah' },
  { id: 'tefillah', emoji: '🙏', he: 'תפילה', es: 'Tefilá', group: 'avodah' },
  { id: 'hashem', emoji: '🕯️', he: 'קשר עם ה׳', es: 'Hashem', group: 'avodah' },
  { id: 'emunah', emoji: '🧠', he: 'אמונה', es: 'Emuná', group: 'avodah' },
  { id: 'bitachon', emoji: '🛡️', he: 'ביטחון', es: 'Bitajón', group: 'avodah' },
  { id: 'middot', emoji: '❤️', he: 'מידות', es: 'Midá', group: 'avodah' },
  { id: 'kedushah', emoji: '👁️', he: 'קדושה', es: 'Kedushá', group: 'avodah' },
  { id: 'speech', emoji: '👄', he: 'שמירת הלשון', es: 'Habla', group: 'avodah' },
  { id: 'ben_adam', emoji: '🤝', he: 'בין אדם לחברו', es: 'Ben Adam LeChavero', group: 'avodah' },
  { id: 'yerushalayim', emoji: '🏛️', he: 'ירושלים והגאולה', es: 'Yerushalayim / Geulá', group: 'avodah' },
  { id: 'mitzvot', emoji: '✅', he: 'מצוות', es: 'Mitzvot', group: 'avodah' },
  { id: 'musar', emoji: '📚', he: 'מוסר', es: 'Musar', group: 'avodah' },
  { id: 'victory', emoji: '🟢', he: 'ניצחון', es: 'Victoria', group: 'evento' },
  { id: 'fall', emoji: '🔴', he: 'נפילה', es: 'Caída', hint: 'Sin juicio. Solo la verdad.', group: 'evento' },
  { id: 'recovery', emoji: '🔄', he: 'התאוששות', es: 'Recuperación', group: 'evento' },
  { id: 'test', emoji: '⚡', he: 'ניסיון', es: 'Prueba', group: 'evento' },
  { id: 'decision', emoji: '🎯', he: 'החלטה', es: 'Decisión', group: 'evento' },
  { id: 'gratitude', emoji: '😊', he: 'הכרת הטוב', es: 'Gratitud', group: 'evento' },
  { id: 'thought', emoji: '💭', he: 'מחשבה', es: 'Pensamiento', group: 'diario' },
  { id: 'emotion', emoji: '🌊', he: 'רגש', es: 'Emoción', group: 'diario' },
  { id: 'music', emoji: '🎵', he: 'מוזיקה', es: 'Música', group: 'contexto' },
  { id: 'clothing', emoji: '👕', he: 'לבוש', es: 'Vestimenta', group: 'contexto' },
  { id: 'sleep', emoji: '😴', he: 'שינה', es: 'Sueño', group: 'contexto' },
  { id: 'phone', emoji: '📱', he: 'טלפון', es: 'Teléfono', group: 'contexto' },
  { id: 'exercise', emoji: '🏃', he: 'פעילות גופנית', es: 'Ejercicio', group: 'contexto' },
  { id: 'nature', emoji: '🌳', he: 'טבע', es: 'Naturaleza', group: 'contexto' },
  { id: 'work', emoji: '💼', he: 'עבודה', es: 'Trabajo', group: 'contexto' },
];

/** Para la mujer, "Kedushá" (que en el hombre gira en torno a shmirat einaim) pasa a ser tzniut. */
export const CATEGORIES: CategoryDef[] = BASE_CATEGORIES.map((c) =>
  c.id === 'kedushah' && getGender() === 'mujer'
    ? { ...c, emoji: '🌸', he: 'צניעות וקדושה', es: 'Tzniut y kedushá' }
    : c,
);

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export function catLabel(id: AreaId): string {
  return CATEGORY_BY_ID[id]?.es ?? id;
}
export function catEmoji(id: AreaId): string {
  return CATEGORY_BY_ID[id]?.emoji ?? '•';
}
export function catHe(id: AreaId): string {
  return CATEGORY_BY_ID[id]?.he ?? id;
}

/** Áreas que se muestran como círculos en el dashboard principal. */
export const DASHBOARD_AREAS: AreaId[] = [
  'torah',
  'tefillah',
  'hashem',
  'emunah',
  'bitachon',
  'middot',
  'kedushah',
  'speech',
  'ben_adam',
  'gratitude',
];
