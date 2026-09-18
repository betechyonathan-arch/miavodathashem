/*
  מוסר הפרשה — trae en vivo, de la API pública y gratuita de Sefaria
  (sefaria.org/api), un comentario corto y profundo sobre un pasuk de la
  parashá de esta semana, con su mekor real (Kli Yakar, Or HaChaim, Sforno o
  Rashi, en ese orden de preferencia). No hay traducción al español — se
  muestra hebreo + inglés (el de Sefaria) con su fuente.

  Se cachea un día en localStorage (una sola llamada de red al día). Si falla
  (sin internet, Sefaria caído) no rompe nada — devuelve null y quien lo llama
  simplemente no muestra la tarjeta; el musar local de siempre sigue igual.
*/

const SEFARIA_BASE = 'https://www.sefaria.org/api';
const CACHE_KEY = 'zury.parashaMusar';

// Comentaristas con vuelo de musar primero; Rashi al final como red de
// seguridad (casi siempre tiene comentario en cada pasuk).
const COMMENTATORS = ['Kli Yakar', 'Or HaChaim', 'Sforno', 'Rashi'];

export interface ParashaMusar {
  date: string; // YYYY-MM-DD local, clave de caché
  parashaHe: string;
  parashaEn: string; // Sefaria no da nombre en español
  aliyahRef: string;
  commentator: string;
  commentatorHe: string;
  ref: string;
  heRef: string;
  he: string;
  en: string;
  fetchedAt: string;
}

interface SefariaCalendarItem {
  displayValue: { en: string; he: string };
  category: string;
  extraDetails?: { aliyot?: string[] };
}

interface SefariaLink {
  collectiveTitle?: { en?: string; he?: string };
  ref?: string;
  sourceHeRef?: string;
  he?: string | string[];
  text?: string | string[];
}

function localDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function flattenText(t: string | string[] | undefined): string {
  if (!t) return '';
  const joined = Array.isArray(t) ? t.filter(Boolean).join(' ') : t;
  return stripHtml(joined);
}

function readCache(): ParashaMusar | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ParashaMusar;
    return data.date === localDateKey() ? data : null;
  } catch {
    return null;
  }
}

function writeCache(data: ParashaMusar) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    /* localStorage lleno o bloqueado: no es crítico, se vuelve a pedir mañana */
  }
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${SEFARIA_BASE}${path}`);
  if (!res.ok) throw new Error(`Sefaria ${res.status}`);
  return res.json() as Promise<T>;
}

/** Elige una de las 7 aliyot de esta semana según el día — así rota sola sin guardar estado. */
function pickAliyah(aliyot: string[]): string {
  const dow = new Date().getDay(); // 0 domingo … 6 sábado
  const seven = aliyot.slice(0, 7);
  return seven[dow % seven.length] ?? aliyot[0];
}

/** Trae (o reusa del caché de hoy) el musar de la parashá. null si no se pudo. */
export async function getParashaMusar(force = false): Promise<ParashaMusar | null> {
  if (!force) {
    const cached = readCache();
    if (cached) return cached;
  }
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const cal = await fetchJson<{ calendar_items: SefariaCalendarItem[] }>(
      `/calendars?timezone=${encodeURIComponent(tz)}`,
    );
    const parasha = cal.calendar_items.find(
      (c) => c.category === 'Tanakh' && (c.extraDetails?.aliyot?.length ?? 0) > 0,
    );
    if (!parasha?.extraDetails?.aliyot) return null;

    const aliyahRef = pickAliyah(parasha.extraDetails.aliyot);
    const links = await fetchJson<SefariaLink[]>(`/links/${encodeURIComponent(aliyahRef)}?with_text=1`);

    let picked: { commentator: string; link: SefariaLink } | null = null;
    for (const name of COMMENTATORS) {
      const matches = links.filter(
        (l) => l.collectiveTitle?.en === name && (flattenText(l.text) || flattenText(l.he)),
      );
      if (matches.length > 0) {
        const idx = new Date().getDate() % matches.length;
        picked = { commentator: name, link: matches[idx] };
        break;
      }
    }
    if (!picked) return null;

    const data: ParashaMusar = {
      date: localDateKey(),
      parashaHe: parasha.displayValue.he,
      parashaEn: parasha.displayValue.en,
      aliyahRef,
      commentator: picked.commentator,
      commentatorHe: picked.link.collectiveTitle?.he ?? picked.commentator,
      ref: picked.link.ref ?? aliyahRef,
      heRef: picked.link.sourceHeRef ?? '',
      he: flattenText(picked.link.he),
      en: flattenText(picked.link.text),
      fetchedAt: new Date().toISOString(),
    };
    writeCache(data);
    return data;
  } catch {
    return null; // sin internet o Sefaria caído: no rompe nada, se reintenta mañana
  }
}
