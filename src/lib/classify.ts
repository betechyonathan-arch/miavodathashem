/*
  Clasificador por REGLAS (sin IA). Convierte "lo que pasó" en datos:
  área principal, áreas secundarias, etiquetas (midot, lashón...), valencia
  (victoria / caída / recuperación) e intensidad. Es transparente: devuelve
  `why` con las palabras que dispararon cada conclusión.

  La IA, si algún día se activa, hará lo mismo mejor — pero NUNCA reemplaza
  el texto original ni afirma causalidad.
*/
import type { AreaId, Valence } from './db/schema';
import { WATCHED_FALLS_CATALOG } from './watchedFalls';

export interface Classification {
  area: AreaId;
  areasSecondary: AreaId[];
  tags: string[];
  valence: Valence;
  intensity: number | null;
  why: string[];
}

type Rule = { area: AreaId; tags?: string[]; kw: string[] };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/** cada entrada: [regexp-fragmento, área, etiquetas opcionales] */
const RULES: Rule[] = [
  { area: 'torah', tags: ['torah'], kw: ['estudi', 'torah', 'tora ', 'gemara', 'guemara', 'daf', 'seder', 'shiur', 'shiúr', 'mishna', 'mishná', 'jumash', 'jok', 'aprend', 'masejet', 'perek', 'halaja', 'halajá', 'rambam', 'rashi', 'chidush', 'jidush', 'repas'] },
  { area: 'tefillah', tags: ['tefillah'], kw: ['rec', 'davene', 'davné', 'daven', 'tefila', 'tefilá', 'shajarit', 'shajrit', 'minja', 'minjá', 'arvit', 'maariv', 'amida', 'amidá', 'kadish', 'minyan', 'minián', 'kavana', 'kavaná', 'tehilim', 'salmos'] },
  { area: 'hashem', tags: ['hashem'], kw: ['hashem', 'dios', 'ד׳', 'presencia de', 'cerca de dios', 'lejos de dios', 'hablé con hashem', 'sentí a', 'consciente de hashem', 'gracias hashem', 'baruj hashem'] },
  { area: 'emunah', tags: ['emunah'], kw: ['emuna', 'emuná', 'fe ', 'creer que todo', 'todo es de hashem', 'hashgaja', 'hashgajá', 'providencia'] },
  { area: 'bitachon', tags: ['bitachon'], kw: ['bitajon', 'bitajón', 'confie', 'confié', 'confiar', 'deje en manos', 'dejé en manos', 'solté el control', 'hishtadlut', 'no dependia de mi', 'no dependía de mí', 'preocup'] },
  { area: 'kedushah', tags: ['kedushah'], kw: ['kedusha', 'kedushá', 'mirada', 'guardé los ojos', 'shmirat einaim', 'tentacion', 'tentación', 'impuro', 'pensamiento impuro', 'pureza', 'internet', 'pantalla sucia', 'yetzer'] },
  { area: 'speech', tags: ['speech'], kw: ['lashon hara', 'lashón hará', 'lashon hará', 'chisme', 'hablé mal', 'hable mal', 'rejilut', 'mentí', 'menti', 'mentira', 'exager', 'grosería', 'groseria', 'me callé', 'me calle', 'guardé silencio', 'guarde silencio', 'shmirat halashon', 'hablé de más', 'hable de mas'] },
  { area: 'ben_adam', tags: ['ben_adam'], kw: ['ayudé', 'ayude', 'jesed', 'chesed', 'perdón', 'perdon', 'pedí perdón', 'pedi perdon', 'respeté', 'respete', 'kavod', 'traté', 'trate a', 'mi esposa', 'mi hijo', 'mi amigo', 'mi papá', 'mi mamá', 'con la gente', 'al vecino'] },
  { area: 'yerushalayim', tags: ['yerushalayim'], kw: ['yerushalayim', 'jerusalen', 'jerusalén', 'beit hamikdash', 'bet hamikdash', 'mashiaj', 'mashíaj', 'geula', 'geulá', 'redención', 'kotel', 'gueguim', 'געגוע', 'extraño el templo'] },
  { area: 'mitzvot', tags: ['mitzvot'], kw: ['mitzva', 'mitzvá', 'mitzvot', 'tzitzit', 'tefilin', 'tefilín', 'brajá', 'braja', 'bendición', 'netilat', 'mezuza', 'tzedaka', 'tzedaká', 'caridad'] },
  { area: 'musar', tags: ['musar'], kw: ['musar', 'mesilat', 'jovot halevavot', 'jovot', 'orjot', 'idea de musar', 'shaar'] },
  { area: 'music', tags: ['music'], kw: ['escuché música', 'escuche musica', 'canción', 'cancion', 'playlist', 'spotify', 'cantante', 'música de', 'musica de', 'niggun', 'nigun'] },
  { area: 'clothing', tags: ['clothing'], kw: ['me vestí', 'me vesti', 'camisa', 'ropa de shabat', 'ropa de casa', 'pants', 'playera', 'vestimenta', 'arreglado'] },
  { area: 'sleep', tags: ['sleep'], kw: ['dormí', 'dormi', 'me acosté', 'me acoste', 'desperté', 'desperte', 'sueño', 'horas de sueño', 'cansado', 'sin dormir', 'siesta'] },
  { area: 'phone', tags: ['phone'], kw: ['celular', 'teléfono', 'telefono', 'pantalla', 'redes', 'instagram', 'whatsapp', 'youtube', 'scroll', 'perdí tiempo en el', 'perdi tiempo en el'] },
  { area: 'exercise', tags: ['exercise'], kw: ['ejercicio', 'gym', 'gimnasio', 'corrí', 'corri', 'caminé', 'camine', 'pesas', 'entrené', 'entrene', 'deporte'] },
  { area: 'nature', tags: ['nature'], kw: ['naturaleza', 'aire libre', 'parque', 'campo', 'montaña', 'mar ', 'al aire', 'afuera caminando'] },
  { area: 'work', tags: ['work'], kw: ['trabajo', 'oficina', 'jefe', 'cliente', 'reunión', 'reunion', 'proyecto', 'negocio', 'chamba', 'junta de'] },
  { area: 'emotion', tags: ['emotion'], kw: ['me sentí', 'me senti', 'triste', 'alegre', 'feliz', 'ansioso', 'ansiedad', 'solo ', 'soledad', 'tranquilo', 'frustrad', 'satisfech', 'enojad', 'con miedo'] },
  { area: 'thought', tags: ['thought'], kw: ['pensé', 'pense', 'pensamiento', 'no dejo de pensar', 'me ronda', 'idea de que', 'preocupación recurrente'] },
  { area: 'gratitude', tags: ['gratitude'], kw: ['agradezco', 'agradecí', 'agradeci', 'gracias por', 'hakarat hatov', 'estoy agradecido', 'me regaló', 'me regalo hashem'] },
  { area: 'decision', tags: ['decision'], kw: ['decidí', 'decidi', 'decisión', 'decision', 'elegí', 'elegi', 'tomé la decisión', 'me decidí por'] },
  { area: 'test', tags: ['test'], kw: ['prueba', 'me pusieron a prueba', 'nisayon', 'nisión', 'se puso a prueba', 'desafío', 'desafio'] },
];

/** Midot y etiquetas finas (no cambian el área pero se guardan como tags). */
const TAG_RULES: { tag: string; kw: string[] }[] = [
  { tag: 'kaas', kw: ['enoj', 'coraje', 'kaas', 'exploté', 'explote', 'me molestó', 'me molesto', 'grité', 'grite', 'ira'] },
  { tag: 'savlanut', kw: ['paciencia', 'savlanut', 'aguanté', 'aguante', 'me controlé', 'me controle', 'no contesté', 'no conteste'] },
  { tag: 'gaava', kw: ['orgullo', 'gaava', 'gaavá', 'ego', 'presumí', 'presumi', 'soberbia'] },
  { tag: 'anava', kw: ['humildad', 'anava', 'anavá', 'me bajé', 'reconocí que', 'admití'] },
  { tag: 'kina', kw: ['envidia', 'kina', 'kiná', 'celos', 'me dio envidia'] },
  { tag: 'simja', kw: ['simja', 'simjá', 'alegría', 'contento', 'feliz', 'de buen humor'] },
  { tag: 'zerizut', kw: ['zerizut', 'rápido', 'sin flojera', 'me levanté de inmediato', 'diligencia'] },
  { tag: 'atzlut', kw: ['flojera', 'pereza', 'atzlut', 'procrastiné', 'procrastine', 'lo dejé para', 'no tuve ganas'] },
  { tag: 'emet', kw: ['verdad', 'emet', 'fui honesto', 'dije la verdad'] },
  { tag: 'lashon_hara', kw: ['lashon hara', 'lashón hará', 'hablé mal', 'hable mal', 'chisme'] },
  { tag: 'shtika', kw: ['me callé', 'me calle', 'guardé silencio', 'guarde silencio', 'pude decirlo pero'] },
  { tag: 'stress', kw: ['estres', 'estrés', 'estresad', 'presión', 'presion', 'saturado'] },
  // Caídas que el usuario vigila: la etiqueta es el id del catálogo (src/lib/watchedFalls.ts).
  ...WATCHED_FALLS_CATALOG.map((w) => ({ tag: w.id, kw: w.kw })),
];

const VICTORY_CUES = [
  'me controlé', 'me controle', 'vencí', 'venci', 'logré', 'logre', 'pude', 'me contuve',
  'no caí', 'no cai', 'resistí', 'resisti', 'a pesar de que no quería', 'aunque no quería',
  'aunque no queria', 'me callé', 'me calle', 'gané', 'gane', 'lo hice igual', 'victoria',
  'pude decirlo pero me callé', 'no le contesté mal', 'no le conteste mal',
  'guardé los ojos', 'guarde los ojos', 'cuidé la mirada', 'cuide la mirada',
  'cuidé shmirat', 'cuide shmirat', 'confié en hashem', 'confie en hashem', 'solté el control',
];
const FALL_CUES = [
  'caí', 'cai', 'me valió', 'me valio', 'no pude', 'otra vez', 'volví a', 'volvi a',
  'fracasé', 'fracase', 'perdí el control', 'perdi el control', 'me rendí', 'me rendi',
  'nada me importó', 'nada me importo', 'me dio igual todo', 'exploté', 'explote', 'fallé', 'falle',
];
const RECOVERY_CUES = [
  'me levanté', 'me levante', 'regresé', 'regrese', 'volví a empezar', 'volvi a empezar',
  'me recuperé', 'me recupere', 'teshuva', 'teshuvá', 'pedí perdón a hashem', 'retomé', 'retome',
  'me perdoné', 'después me repuse', 'despues me repuse',
];

export function classify(raw: string, forcedArea?: AreaId): Classification {
  const text = norm(raw);
  const why: string[] = [];
  const areaHits: { area: AreaId; score: number; tags: string[] }[] = [];

  for (const rule of RULES) {
    const matched = rule.kw.filter((k) => text.includes(norm(k)));
    if (matched.length) {
      areaHits.push({ area: rule.area, score: matched.length, tags: rule.tags ?? [] });
      why.push(`${rule.area}: "${matched.join('", "')}"`);
    }
  }

  const tags = new Set<string>();
  for (const tr of TAG_RULES) {
    const matched = tr.kw.filter((k) => text.includes(norm(k)));
    if (matched.length) {
      tags.add(tr.tag);
      why.push(`#${tr.tag}: "${matched.join('", "')}"`);
    }
  }

  areaHits.sort((a, b) => b.score - a.score);

  let area: AreaId;
  let areasSecondary: AreaId[] = [];
  if (forcedArea) {
    area = forcedArea;
    areasSecondary = areaHits.map((h) => h.area).filter((a) => a !== forcedArea).slice(0, 4);
  } else if (areaHits.length) {
    area = areaHits[0].area;
    areasSecondary = areaHits.slice(1).map((h) => h.area).slice(0, 4);
  } else {
    area = 'journal';
    why.push('sin palabras clave reconocidas → texto libre');
  }

  for (const h of areaHits) for (const t of h.tags) tags.add(t);

  // valencia
  let valence: Valence = 'neutral';
  const vHit = VICTORY_CUES.find((c) => text.includes(norm(c)));
  const fHit = FALL_CUES.find((c) => text.includes(norm(c)));
  const rHit = RECOVERY_CUES.find((c) => text.includes(norm(c)));
  if (forcedArea === 'victory') valence = 'victory';
  else if (forcedArea === 'fall') valence = 'fall';
  else if (forcedArea === 'recovery') valence = 'recovery';
  else if (rHit) { valence = 'recovery'; why.push(`recuperación: "${rHit}"`); }
  else if (vHit && !fHit) { valence = 'victory'; why.push(`victoria: "${vHit}"`); }
  else if (fHit && !vHit) { valence = 'fall'; why.push(`caída: "${fHit}"`); }
  else if (vHit && fHit) {
    // "casi caí pero me controlé" → victoria
    valence = text.indexOf(norm(vHit)) > text.indexOf(norm(fHit)) ? 'victory' : 'fall';
    why.push(`victoria+caída en el texto → ${valence}`);
  }

  // intensidad aproximada (0..10) por adverbios
  let intensity: number | null = null;
  if (/\bmuy\b|demasiad|much[íi]sim|al m[áa]ximo|no aguant/.test(text)) intensity = 8;
  else if (/\bun poco\b|algo de|lig(er|)ament|no tanto/.test(text)) intensity = 3;
  else if (/\bnormal\b|m[áa]s o menos|regular/.test(text)) intensity = 5;

  return { area, areasSecondary, tags: [...tags], valence, intensity, why };
}
