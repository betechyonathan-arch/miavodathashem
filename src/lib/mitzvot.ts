/*
  Catálogo de mitzvot para seguimiento (§24).
  Se registra COMPORTAMIENTO, no una puntuación. Cumplir más mitzvot no es un "número
  espiritual"; es solo un registro de lo que hiciste.

  Va por género (ver gender.ts): las mujeres no llevan tefilín, tzitzit ni el jiuv
  de Shemá y minyán, y tienen las suyas (jalá, velas, tzniut, estudio de halajot).
*/
import { forGender, type GenderTagged } from './gender';

export interface MitzvahDef extends GenderTagged {
  id: string;
  he: string;
  es: string;
  hint?: string;
}

const ALL_MITZVOT: MitzvahDef[] = [
  { id: 'birkot-hashachar', he: 'ברכות השחר', es: 'Birkot HaShajar' },
  { id: 'netilat-yadaim', he: 'נטילת ידיים', es: 'Netilat Yadaim (mañana)' },
  { id: 'tefilin', for: 'hombre', he: 'תפילין', es: 'Tefilín' },
  { id: 'tzitzit', for: 'hombre', he: 'ציצית', es: 'Tzitzit' },
  { id: 'kriat-shema-shacharit', for: 'hombre', he: 'ק״ש שחרית', es: 'Kriat Shemá (Shajarit)', hint: 'a tiempo' },
  { id: 'kriat-shema-arvit', for: 'hombre', he: 'ק״ש ערבית', es: 'Kriat Shemá (Arvit)' },
  { id: 'tefila-shacharit', he: 'שחרית', es: 'Tefilá — Shajarit' },
  { id: 'tefila-mincha', he: 'מנחה', es: 'Tefilá — Minjá' },
  { id: 'tefila-arvit', he: 'ערבית', es: 'Tefilá — Arvit' },
  { id: 'minyan', for: 'hombre', he: 'תפילה בציבור', es: 'Tefilá con minyán' },
  { id: 'birkat-hamazon', he: 'ברכת המזון', es: 'Birkat HaMazón' },
  { id: 'berajot', he: 'ברכות הנהנין', es: 'Berajot antes/después de comer' },
  { id: 'asher-yatzar', he: 'אשר יצר', es: 'Asher Yatzar' },
  { id: 'tzedaka', he: 'צדקה', es: 'Tzedaká' },
  { id: 'torah', for: 'hombre', he: 'תלמוד תורה', es: 'Estudio de Torá (fijo)' },
  { id: 'estudio-halajot', for: 'mujer', he: 'לימוד הלכות', es: 'Estudio de halajot y hashkafá', hint: 'lo que aplica a tu vida' },
  { id: 'shmirat-halashon', he: 'שמירת הלשון', es: 'Shmirat HaLashón (cuidé la boca)' },
  { id: 'lashon-hara-hoy', for: 'mujer', he: 'בלי לשון הרע', es: 'Hoy no dije ni escuché lashón hará' },
  { id: 'tzniut-hoy', for: 'mujer', he: 'צניעות', es: 'Tzniut en vestimenta y conducta' },
  { id: 'hadlakat-nerot', for: 'mujer', he: 'הדלקת נרות', es: 'Hadlakat nerot (Shabat / Yom Tov)', hint: 'antes de la puesta del sol' },
  { id: 'hafrashat-jala', for: 'mujer', he: 'הפרשת חלה', es: 'Hafrashat jalá', hint: 'al amasar' },
  { id: 'kavod-horim', he: 'כיבוד הורים', es: 'Kibud Av vaEm' },
  { id: 'hesed', he: 'גמילות חסדים', es: 'Un acto de Jésed' },
  { id: 'brachot-100', for: 'hombre', he: 'מאה ברכות', es: '100 berajot' },
];

/** Catálogo visible para este usuario, según su género. */
export const MITZVOT_CATALOG: MitzvahDef[] = forGender(ALL_MITZVOT);

/** Búsqueda sobre TODO el catálogo (un id guardado nunca queda sin nombre). */
export const CATALOG_BY_ID: Record<string, MitzvahDef> = Object.fromEntries(
  ALL_MITZVOT.map((m) => [m.id, m]),
);

export function mitzvahLabel(id: string): { he: string; es: string } {
  return CATALOG_BY_ID[id] ?? { he: id, es: id };
}
