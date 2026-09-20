/*
  Caídas que vigilo. Patrones concretos de caída que el usuario quiere que el
  sistema reconozca y cuente en el tiempo. NO es un marcador de "qué tan bueno
  eres": es un espejo. La caída se responde con el regreso — ahora, no "mañana"
  (§52 / §60). Sin detalles morbosos: el sistema solo cuenta y exige la vuelta.
*/
import type { AreaId } from './db/schema';
import { forGender, getGender, type GenderTagged } from './gender';

export interface WatchedFallDef extends GenderTagged {
  id: string;
  he: string;
  es: string;
  hint?: string;
  area: AreaId;
  /** Pistas para el clasificador de reglas (se comparan normalizadas). */
  kw: string[];
}

const ALL_FALLS: WatchedFallDef[] = [
  {
    id: 'shmirat-einaim',
    for: 'hombre',
    he: 'שמירת עיניים',
    es: 'Shmirat einaim (la mirada)',
    hint: 'No cuidé los ojos.',
    area: 'kedushah',
    kw: [
      'shmirat einaim',
      'shmirat enaim',
      'shemirat einaim',
      'shmirat einayim',
      'no guardé los ojos',
      'no guarde los ojos',
      'no cuidé la mirada',
      'no cuide la mirada',
      'miré lo que no debía',
      'mire lo que no debia',
      'se me fueron los ojos',
    ],
  },
  {
    id: 'lashon-hara',
    he: 'לשון הרע',
    es: 'Lashón hará (hablar o escuchar)',
    hint: 'Hablé mal de alguien, o lo escuché sin frenarlo.',
    area: 'speech',
    kw: [
      'lashon hara',
      'lashón hará',
      'lashon hará',
      'hablé mal de',
      'hable mal de',
      'hablé de alguien',
      'chismorreé',
      'chismorree',
      'chisme',
      'rejilut',
      'rejilút',
      'critiqué a',
      'critique a',
    ],
  },
  {
    id: 'tzniut-caida',
    for: 'mujer',
    he: 'צניעות',
    es: 'Tzniut (modestia)',
    hint: 'Descuidé la tzniut en la vestimenta, el trato o la conducta.',
    area: 'kedushah',
    kw: [
      'no cuidé la tzniut',
      'no cuide la tzniut',
      'falté a la tzniut',
      'falte a la tzniut',
      'descuidé la tzniut',
      'descuide la tzniut',
      'sin tzniut',
    ],
  },
  {
    id: 'kina-comparacion',
    for: 'mujer',
    he: 'קנאה',
    es: 'Envidia y comparación',
    hint: 'Me comparé con otra mujer y me dolió o me amargué: su casa, su cuerpo, su familia, su vida.',
    area: 'middot',
    kw: [
      'me comparé con',
      'me compare con',
      'sentí envidia',
      'senti envidia',
      'tuve envidia',
      'envidié a',
      'envidie a',
      'kiná',
      'kina',
      'me amargué al ver',
      'me amargue al ver',
    ],
  },
  {
    id: 'enojo-hogar',
    for: 'mujer',
    he: 'כעס בבית',
    es: 'Perder la paciencia en casa',
    hint: 'Me enojé o grité con mi familia y se enfrió la paz del hogar.',
    area: 'ben_adam',
    kw: [
      'grité a',
      'grite a',
      'le grité',
      'le grite',
      'perdí la paciencia',
      'perdi la paciencia',
      'me enojé con mi',
      'me enoje con mi',
      'me enojé en casa',
      'me enoje en casa',
      'falté al shalom bayit',
      'falte al shalom bayit',
    ],
  },
  {
    id: 'bitajon-desconfianza',
    he: 'חוסר ביטחון',
    es: 'Desconfiar en Hashem',
    hint: 'Me faltó bitajón: actué o me angustié como si todo dependiera de mí.',
    area: 'bitachon',
    kw: [
      'desconfié de hashem',
      'desconfie de hashem',
      'no confié en hashem',
      'no confie en hashem',
      'dudé de hashem',
      'dude de hashem',
      'como si dependiera de mí',
      'como si dependiera de mi',
      'falta de bitajón',
      'falta de bitajon',
      'sin bitajón',
      'sin bitajon',
      'me angustié por el futuro',
      'me angustie por el futuro',
    ],
  },
  {
    id: 'avera-jamura',
    he: 'עבירה חמורה',
    es: 'Avera jamura',
    hint: 'Lo grave. Sin detalles: el sistema solo lo cuenta y te pide el regreso, ahora.',
    area: 'kedushah',
    kw: [
      'avera jamura',
      'averá jamurá',
      'aveira jamura',
      'aveirá jamurá',
      'la avera grave',
      'caí en lo grave',
      'cai en lo grave',
      'la caída grande',
      'la caida grande',
    ],
  },
];

/** Catálogo visible para este usuario, según su género. */
export const WATCHED_FALLS_CATALOG: WatchedFallDef[] = forGender(ALL_FALLS);

/** Búsqueda por id sobre TODO el catálogo (así un id guardado nunca queda sin nombre). */
export const WATCHED_FALLS_BY_ID: Record<string, WatchedFallDef> = Object.fromEntries(
  ALL_FALLS.map((w) => [w.id, w]),
);

/** Caídas que se vigilan por defecto al crear la cuenta. */
export function defaultWatchedFalls(): string[] {
  return getGender() === 'mujer'
    ? ['lashon-hara', 'tzniut-caida', 'bitajon-desconfianza']
    : ['shmirat-einaim', 'bitajon-desconfianza'];
}

export function watchedFallLabel(id: string): { he: string; es: string } {
  return WATCHED_FALLS_BY_ID[id] ?? { he: id, es: id };
}
