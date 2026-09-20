/*
  Catálogo de mitzvot para seguimiento (§24).
  Se registra COMPORTAMIENTO, no una puntuación. Cumplir más mitzvot no es un "número
  espiritual"; es solo un registro de lo que hiciste.

  Va por género (ver gender.ts): las mujeres no llevan tefilín, tzitzit ni el jiuv
  de Shemá y minyán, y tienen las suyas: jalá, velas, taharat hamishpajá, kisui rosh, tzniut,
  la cocina y el hogar, el estudio de halajot, la tefilá desde el corazón.

  `about` explica en una o dos frases de qué trata (se muestra en «Mitzvot de la mujer»).
  Es una guía general basada en el Shulján Aruj; cada cual consulta a su rav.
*/
import { forGender, type Gender, type GenderTagged } from './gender';

export interface MitzvahDef extends GenderTagged {
  id: string;
  he: string;
  es: string;
  hint?: string;
  /** Qué es y cómo se vive, para quien no la conoce. */
  about?: string;
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
  { id: 'shmirat-halashon', he: 'שמירת הלשון', es: 'Shmirat HaLashón (cuidé la boca)' },
  { id: 'kavod-horim', he: 'כיבוד הורים', es: 'Kibud Av vaEm' },
  { id: 'hesed', he: 'גמילות חסדים', es: 'Un acto de Jésed' },
  { id: 'brachot-100', for: 'hombre', he: 'מאה ברכות', es: '100 berajot' },

  // ───────────── Las de la mujer ─────────────
  {
    id: 'hadlakat-nerot',
    for: 'mujer',
    he: 'הדלקת נרות',
    es: 'Hadlakat nerot (Shabat / Yom Tov)',
    hint: 'antes de la puesta del sol',
    about:
      'Tu momento de luz: encender las velas antes de la puesta del sol y pedir por tu familia. Con esta mitzvá la mujer recibe el Shabat en su casa. Es una de las tres mitzvot que los Sabios confían de manera especial a la mujer.',
  },
  {
    id: 'hafrashat-jala',
    for: 'mujer',
    he: 'הפרשת חלה',
    es: 'Hafrashat jalá',
    hint: 'al amasar',
    about:
      'Al amasar una cantidad suficiente de harina, se separa un pedacito de la masa y se dice la berajá. Es otra de las tres mitzvot de la mujer, y un momento muy querido para pedir por los tuyos.',
  },
  {
    id: 'taharat-hamishpaja',
    for: 'mujer',
    he: 'טהרת המשפחה',
    es: 'Taharat hamishpajá (niddá y mikvé)',
    hint: 'si estás casada',
    about:
      'Las leyes de niddá y la inmersión en el mikvé: el cimiento de la santidad del hogar judío y la tercera de las mitzvot propias de la mujer. Se aprende con calma y con quien sabe; consulta a tu rav o a una mujer instructora de taharat hamishpajá.',
  },
  {
    id: 'kisui-rosh',
    for: 'mujer',
    he: 'כיסוי ראש',
    es: 'Kisui rosh (cubrirse el cabello)',
    hint: 'mujer casada',
    about:
      'Después de casarse, la mujer cubre su cabello según la halajá y la costumbre de su comunidad. Es una señal de dignidad y de hogar. Cada comunidad tiene su forma: pregunta a tu rav cómo cumplirla.',
  },
  {
    id: 'tzniut-hoy',
    for: 'mujer',
    he: 'צניעות',
    es: 'Tzniut en vestimenta y conducta',
    about:
      'Dignidad interior: en la ropa, en la conducta y en el habla. No es esconderse, es saber cuánto vales: «Toda la gloria de la hija del Rey está adentro» (Tehilim 45:14).',
  },
  {
    id: 'lashon-hara-hoy',
    for: 'mujer',
    he: 'בלי לשון הרע',
    es: 'Hoy no dije ni escuché lashón hará',
    about:
      'Cuidar las conversaciones con amigas y con la familia: ni hablar ni escuchar lashón hará. Un día limpio de lashón hará es un regalo para todos.',
  },
  {
    id: 'estudio-halajot',
    for: 'mujer',
    he: 'לימוד הלכות',
    es: 'Estudio de halajot y hashkafá',
    hint: 'lo que aplica a tu vida',
    about:
      'Un tiempo fijo, aunque sean diez minutos, para estudiar las halajot que usas todos los días (Shabat, kashrut, berajot, taharat hamishpajá) y la hashkafá: las matriarcas, la parashá, el musar.',
  },
  {
    id: 'preparar-shabat',
    for: 'mujer',
    he: 'הכנה לשבת',
    es: 'Preparar el Shabat',
    hint: 'casa, mesa y comida',
    about:
      'Preparar con cariño y desde antes la casa, la mesa y la comida del Shabat. Es kavod y oneg Shabat: hacer que el día se sienta como un invitado querido que llega.',
  },
  {
    id: 'kashrut-cocina',
    for: 'mujer',
    he: 'כשרות המטבח',
    es: 'Kashrut en mi cocina',
    hint: 'carne y leche, verduras, utensilios',
    about:
      'Cuidar la cocina: separar carne y leche, revisar las verduras de hoja y las frutas por insectos, y la tevilat kelim (sumergir en el mikvé los utensilios nuevos de metal y vidrio). Los Sabios dicen que hoy la mesa de cada persona hace las veces del altar (Jaguigá 27a).',
  },
  {
    id: 'shalom-bayit',
    for: 'mujer',
    he: 'שלום בית',
    es: 'Shalom bayit (paz en el hogar)',
    hint: 'un gesto concreto',
    about:
      'Un gesto concreto por la paz de la casa: una palabra buena, una espera, un cariño hacia tu esposo y tu familia. «La mujer sabia edifica su casa» (Mishlé 14:1).',
  },
  {
    id: 'tefila-personal',
    for: 'mujer',
    he: 'תפילה מהלב',
    es: 'Hablar con Hashem con mis palabras',
    hint: 'cinco minutos, desde el corazón',
    about:
      'Además del sidur, hablar con Hashem con tus propias palabras: agradecer, pedir, desahogarte. Jana (Ana) es el modelo de la oración que sale del corazón (Shemuel I 1).',
  },
  {
    id: 'tehilim-por-otros',
    for: 'mujer',
    he: 'תהילים',
    es: 'Un capítulo de Tehilim por alguien',
    hint: 'un enfermo, una necesidad',
    about:
      'Decir un capítulo de Tehilim por alguien que lo necesita: un enfermo, una pareja que espera hijos, alguien que busca su zivug. La mujer judía siempre ha sostenido a su gente con Tehilim.',
  },
  {
    id: 'oracion-hijos',
    for: 'mujer',
    he: 'תפילה על הילדים',
    es: 'Orar por mis hijos',
    hint: 'o por los hijos que quiero tener',
    about:
      'Una oración diaria por tus hijos, o por los hijos que esperas. Sará, Rivká, Rajel y Jana rezaron por hijos, y su fe nos sostiene todavía. No estás sola en esa espera.',
  },
  {
    id: 'tefila-zivug',
    for: 'mujer',
    he: 'תפילה על זיווג',
    es: 'Orar por mi zivug',
    hint: 'si busco pareja',
    about:
      'Si todavía buscas a tu pareja: una tefilá cada día, con confianza en que Hashem está preparando tu zivug. Nadie sabe el tiempo, pero cada oración cuenta.',
  },
  {
    id: 'jinuj',
    for: 'mujer',
    he: 'חינוך הילדים',
    es: 'Sembrar Torá en los que quiero',
    hint: 'hijos, sobrinos, alumnos',
    about:
      'Una berajá, un pasuk, una historia: sembrar Torá en tus hijos o en los niños cercanos, con el ejemplo y con paciencia. «No abandones la Torá de tu madre» (Mishlé 1:8).',
  },
  {
    id: 'hajnasat-orjim',
    for: 'mujer',
    he: 'הכנסת אורחים',
    es: 'Hajnasat orjim (recibir invitados)',
    about:
      'Abrir la casa con alegría, como Sará Imeinu con su tienda abierta a todos. Un plato caliente y una buena sonrisa son una mitzvá grande.',
  },
  {
    id: 'tzedaka-nerot',
    for: 'mujer',
    he: 'צדקה לפני הנרות',
    es: 'Tzedaká antes de las velas',
    hint: 'viernes',
    about: 'Una costumbre muy querida: dar tzedaká antes de encender las velas del Shabat, para recibirlo con las manos abiertas.',
  },
  {
    id: 'rosh-jodesh',
    for: 'mujer',
    he: 'ראש חודש',
    es: 'Rosh Jódesh, el día de las mujeres',
    hint: 'cada comienzo de mes',
    about:
      'Rosh Jódesh es la fiesta de las mujeres: por su fidelidad, ellas no participaron en el becerro de oro. La costumbre es descansar de ciertas labores. Dedícalo a la tefilá, la tzedaká o un rato tranquilo con Hashem.',
  },
];

/** Catálogo visible para este usuario, según su género. */
export const MITZVOT_CATALOG: MitzvahDef[] = forGender(ALL_MITZVOT);

/** Las mitzvot propias de la mujer, con su explicación (para la pantalla «Mitzvot de la mujer»). */
export const WOMEN_MITZVOT: MitzvahDef[] = ALL_MITZVOT.filter((m) => m.for === 'mujer');

/** Búsqueda sobre TODO el catálogo (un id guardado nunca queda sin nombre). */
export const CATALOG_BY_ID: Record<string, MitzvahDef> = Object.fromEntries(
  ALL_MITZVOT.map((m) => [m.id, m]),
);

export function mitzvahLabel(id: string): { he: string; es: string } {
  return CATALOG_BY_ID[id] ?? { he: id, es: id };
}

/**
 * La lista de hoy mientras la persona no haya armado la suya. Para la mujer incluye lo suyo
 * (antes solo veía las primeras del catálogo, todas comunes).
 */
export function defaultTrackedMitzvot(g: Gender): string[] {
  if (g === 'mujer') {
    return ['birkot-hashachar', 'tefila-shacharit', 'birkat-hamazon', 'tzedaka', 'tzniut-hoy', 'shalom-bayit', 'tefila-personal', 'lashon-hara-hoy'];
  }
  return MITZVOT_CATALOG.slice(0, 8).map((m) => m.id);
}
