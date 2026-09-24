/*
  Aportes de la comunidad: dvar Torá, musar o pirush que cualquiera propone. Nacen "pendientes";
  solo cuando un admin los aprueba los ve todo el mundo (vista `aportes_publicos`, que nunca
  incluye al autor de un aporte anónimo). La autorización real la decide la base de datos
  (supabase/aportes.sql), no esta pantalla.
*/
import { supabase } from './supabase';

export type AporteKind = 'dvar' | 'musar' | 'pirush';
export type AporteStatus = 'pendiente' | 'aprobado' | 'rechazado';

export const KIND_LABEL: Record<AporteKind, string> = {
  dvar: 'Dvar Torá',
  musar: 'Musar',
  pirush: 'Pirush',
};

/**
 * A partir de cuántas letras la pantalla de entrada (Splash) muestra el texto resumido con un
 * botón «Ver completo» en vez de todo de una vez. Ya NO es un tope real: cualquier aporte
 * aprobado se puede poner ahí sin importar su largo (hasta 6000 letras, el máximo de un aporte).
 */
export const SPLASH_MAX = 400;

/** Corta en la última palabra completa antes de SPLASH_MAX letras, para el resumen del Splash. */
export function truncateForSplash(body: string): string {
  if (body.length <= SPLASH_MAX) return body;
  const cut = body.slice(0, SPLASH_MAX);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export interface PublicAporte {
  id: string;
  kind: AporteKind;
  title: string;
  body: string;
  source: string;
  author_name: string | null;
  featured: boolean;
  created_at: string;
}

/** Fila completa: solo la ve su autor (lo suyo) o un admin (todo). */
export interface AporteRow extends PublicAporte {
  author_id: string | null;
  author_name: string | null;
  anonymous: boolean;
  status: AporteStatus;
  reviewed_at: string | null;
}

export class AporteError extends Error {}

function client() {
  if (!supabase) throw new AporteError('El servidor no está configurado.');
  return supabase;
}

const PUBLIC_COLS = 'id, kind, title, body, source, author_name, featured, created_at';
const ROW_COLS = `${PUBLIC_COLS}, author_id, anonymous, status, reviewed_at`;

export interface NewAporte {
  kind: AporteKind;
  title: string;
  body: string;
  source: string;
  anonymous: boolean;
}

export async function submitAporte(a: NewAporte): Promise<void> {
  const { error } = await client().rpc('submit_aporte', {
    p_kind: a.kind,
    p_title: a.title,
    p_body: a.body,
    p_source: a.source,
    p_anonymous: a.anonymous,
  });
  if (error) throw new AporteError(error.message);
}

/** Lo aprobado, para todos. */
export async function listPublic(): Promise<PublicAporte[]> {
  const { data, error } = await client().from('aportes_publicos').select(PUBLIC_COLS).order('created_at', { ascending: false }).limit(100);
  if (error) throw new AporteError(error.message);
  return (data ?? []) as PublicAporte[];
}

/** Lo que mandó esta persona, con su estado (pendiente / aprobado / rechazado). */
export async function listMine(userId: string): Promise<AporteRow[]> {
  const { data, error } = await client().from('aportes').select(ROW_COLS).eq('author_id', userId).order('created_at', { ascending: false }).limit(50);
  if (error) throw new AporteError(error.message);
  return (data ?? []) as AporteRow[];
}

/** Solo admin: todo, con autor y estado. `null` = todavía no está instalado supabase/aportes.sql. */
export async function listAll(): Promise<AporteRow[] | null> {
  const { data, error } = await client().from('aportes').select(ROW_COLS).order('created_at', { ascending: false }).limit(200);
  if (error) return null;
  return (data ?? []) as AporteRow[];
}

export async function reviewAporte(id: string, approve: boolean): Promise<void> {
  const { error } = await client().rpc('review_aporte', { p_id: id, p_approve: approve });
  if (error) throw new AporteError(error.message);
}

export async function featureAporte(id: string, featured: boolean): Promise<void> {
  const { error } = await client().rpc('feature_aporte', { p_id: id, p_featured: featured });
  if (error) throw new AporteError(error.message);
}

export async function deleteAporte(id: string): Promise<void> {
  const { error } = await client().rpc('delete_aporte', { p_id: id });
  if (error) throw new AporteError(error.message);
}

/* ───────────── Pantalla de entrada: el aporte destacado ───────────── */

const FEATURED_KEY = 'avodah.featured';

/** Lo último que se supo, para mostrarlo al instante y sin conexión. `undefined` = nunca se consultó. */
export function cachedFeatured(): PublicAporte | null | undefined {
  try {
    const raw = localStorage.getItem(FEATURED_KEY);
    if (raw === null) return undefined;
    return raw === 'none' ? null : (JSON.parse(raw) as PublicAporte);
  } catch {
    return undefined;
  }
}

/** Consulta el aporte destacado y actualiza la copia guardada. Si falla, deja lo que había. */
export async function fetchFeatured(): Promise<PublicAporte | null | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.from('aportes_publicos').select(PUBLIC_COLS).eq('featured', true).limit(1);
  if (error) return undefined;
  const found = ((data ?? []) as PublicAporte[])[0] ?? null;
  try {
    localStorage.setItem(FEATURED_KEY, found ? JSON.stringify(found) : 'none');
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  return found;
}
