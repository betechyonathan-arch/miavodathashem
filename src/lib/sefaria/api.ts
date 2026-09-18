/*
  Conexión con Sefaria (sefaria.org/api): API pública y gratuita con la biblioteca
  judía abierta — Tanaj, Mishná, Guemará, Halajá, Midrash, Musar, Jasidut y
  miles de pirushim (comentarios) enlazados a cada pasuk / mishná / halajá.

  Sefaria NO trae traducción al español: se muestra el hebreo original y, cuando
  existe, la traducción al inglés de Sefaria. Cada texto lleva su versión y licencia
  (se muestran en pantalla; es requisito de atribución de Sefaria).

  Todo se pide en vivo desde el navegador (la API permite CORS) y se cachea en
  memoria mientras la app está abierta. Sin internet, las pantallas muestran un aviso
  con "Reintentar"; nada más de la app depende de esto.
*/

const BASE = 'https://www.sefaria.org/api';

export class SefariaError extends Error {}

const cache = new Map<string, Promise<unknown>>();

function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let p = cache.get(key) as Promise<T> | undefined;
  if (!p) {
    p = load().catch((e) => {
      cache.delete(key); // un fallo no se queda pegado: se reintenta
      throw e;
    });
    cache.set(key, p);
  }
  return p;
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + path);
  } catch {
    throw new SefariaError('No se pudo conectar con Sefaria. Revisa tu conexión.');
  }
  if (!res.ok) throw new SefariaError(`Sefaria respondió ${res.status}.`);
  const data = await res.json();
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new SefariaError(String((data as { error: unknown }).error));
  }
  return data as T;
}

/** "Pirkei Avot 1:1" → "Pirkei_Avot.1.1"-compatible path segment. */
const refPath = (ref: string) => encodeURIComponent(ref.replace(/ /g, '_'));

// ───────────────────────── Textos ─────────────────────────

export interface TextVersion {
  title: string;
  license: string;
  source: string;
  /** Segmentos del texto (un pasuk / mishná / halajá cada uno), con HTML de Sefaria sin limpiar. */
  segments: string[];
}

export interface SefariaText {
  ref: string;
  heRef: string;
  title: string;
  categories: string[];
  next: string | null;
  prev: string | null;
  /** Número del primer segmento (para numerar pasukim), o null si no aplica. */
  firstNumber: number | null;
  he: TextVersion | null;
  en: TextVersion | null;
}

interface RawVersion {
  language: string;
  versionTitle?: string;
  license?: string;
  versionSource?: string;
  text?: unknown;
}
interface RawText {
  ref: string;
  heRef: string;
  title?: string;
  categories?: string[];
  next?: string | null;
  prev?: string | null;
  sections?: (number | string)[];
  textDepth?: number;
  versions?: RawVersion[];
}

function flatten(t: unknown): string[] {
  if (typeof t === 'string') return t.trim() ? [t] : [];
  if (Array.isArray(t)) return t.flatMap(flatten);
  return [];
}

function toVersion(v: RawVersion | undefined): TextVersion | null {
  if (!v) return null;
  const segments = flatten(v.text);
  if (!segments.length) return null;
  return {
    title: v.versionTitle ?? '',
    license: v.license ?? '',
    source: v.versionSource ?? '',
    segments,
  };
}

export function getText(ref: string): Promise<SefariaText> {
  return cached(`text:${ref}`, async () => {
    const r = await getJson<RawText>(`/v3/texts/${refPath(ref)}?version=source&version=english`);
    const versions = r.versions ?? [];
    const he = versions.find((v) => v.language === 'he');
    const en = versions.find((v) => v.language === 'en');
    // Si la ref llega hasta el segmento ("Genesis 1:3"), su número es el último nivel; si es una
    // sección entera ("Genesis 1"), los segmentos se numeran desde 1. Sefaria manda los números como texto.
    const sections = r.sections ?? [];
    const last = Number(sections[sections.length - 1]);
    const atSegment = sections.length > 0 && sections.length >= (r.textDepth ?? Infinity);
    return {
      ref: r.ref,
      heRef: r.heRef,
      title: r.title ?? r.ref,
      categories: r.categories ?? [],
      next: r.next ?? null,
      prev: r.prev ?? null,
      firstNumber: atSegment ? (Number.isFinite(last) ? last : null) : 1,
      he: toVersion(he),
      en: toVersion(en),
    };
  });
}

// ───────────────────── Pirushim y fuentes enlazadas ─────────────────────

export interface SefariaLink {
  ref: string;
  category: string;
  /** Nombre del autor / obra que enlaza ("Rashi", "Rabbeinu Yonah"…). */
  author: string;
  authorHe: string;
  hasEnglish: boolean;
}

interface RawLink {
  ref?: string;
  category?: string;
  collectiveTitle?: { en?: string; he?: string };
  index_title?: string;
  heTitle?: string;
  sourceHasEn?: boolean;
}

export function getLinks(ref: string): Promise<SefariaLink[]> {
  return cached(`links:${ref}`, async () => {
    const raw = await getJson<RawLink[]>(`/links/${refPath(ref)}?with_text=0`);
    return raw
      .filter((l) => l.ref && l.category)
      .map((l) => ({
        ref: l.ref as string,
        category: l.category as string,
        author: l.collectiveTitle?.en ?? l.index_title ?? (l.ref as string),
        authorHe: l.collectiveTitle?.he ?? l.heTitle ?? '',
        hasEnglish: !!l.sourceHasEn,
      }));
  });
}

// ───────────────────────── Calendario diario ─────────────────────────

export interface CalendarItem {
  title: string;
  titleHe: string;
  value: string;
  ref: string | null;
  category: string;
}

interface RawCalendar {
  calendar_items?: {
    title?: { en?: string; he?: string };
    displayValue?: { en?: string; he?: string };
    ref?: string | null;
    category?: string;
  }[];
}

export function getCalendar(diaspora: boolean): Promise<CalendarItem[]> {
  const day = new Date().toDateString();
  return cached(`cal:${day}:${diaspora}`, async () => {
    const r = await getJson<RawCalendar>(`/calendars?diaspora=${diaspora ? 1 : 0}`);
    return (r.calendar_items ?? []).map((i) => ({
      title: i.title?.en ?? '',
      titleHe: i.title?.he ?? '',
      value: i.displayValue?.en ?? '',
      ref: i.ref ?? null,
      category: i.category ?? '',
    }));
  });
}

// ───────────────────────── Buscador ─────────────────────────

export interface SearchHit {
  title: string;
  ref: string;
}

interface RawName {
  is_ref?: boolean;
  ref?: string;
  completion_objects?: { title?: string; type?: string; key?: string }[];
}

export type SearchResult = { kind: 'ref'; ref: string } | { kind: 'list'; hits: SearchHit[] };

/**
 * Convierte lo que escribe el usuario en una referencia directa ("Avot 2:5" →
 * "Pirkei Avot 2:5") o en una lista de obras sugeridas ("Ramban" → Ramban on Genesis…).
 */
export async function search(query: string): Promise<SearchResult> {
  const q = query.trim();
  if (!q) return { kind: 'list', hits: [] };
  const r = await getJson<RawName>(`/name/${encodeURIComponent(q)}`);
  if (r.is_ref && r.ref) return { kind: 'ref', ref: r.ref };
  const hits = (r.completion_objects ?? [])
    .filter((o) => o.type === 'ref' && o.title && o.key)
    .map((o) => ({ title: o.title as string, ref: o.key as string }));
  return { kind: 'list', hits };
}

export const sefariaUrl = (ref: string) => `https://www.sefaria.org/${ref.replace(/ /g, '_')}`;
