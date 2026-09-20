/*
  Avisos del admin para todos. Solo un admin los crea, edita, oculta o borra (lo decide la base
  de datos, supabase/avisos.sql). Todas las personas ven los que están activos, arriba en «Hoy»
  y en «¿Cómo estoy?».
*/
import { supabase } from './supabase';

export interface Aviso {
  id: string;
  title: string;
  body: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export class AvisoError extends Error {}

const COLS = 'id, title, body, active, created_at, updated_at';
const CACHE_KEY = 'avodah.avisos';

function client() {
  if (!supabase) throw new AvisoError('El servidor no está configurado.');
  return supabase;
}

/** Los avisos de la última vez, para mostrarlos al instante y sin conexión. */
export function cachedAvisos(): Aviso[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Aviso[]) : [];
  } catch {
    return [];
  }
}

/** Los avisos activos (para todos). `null` si no se pudo consultar: se deja lo que había. */
export async function fetchActiveAvisos(): Promise<Aviso[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('avisos')
    .select(COLS)
    .eq('active', true)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return null;
  const list = (data ?? []) as Aviso[];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  return list;
}

/** Solo admin: todos, también los ocultos. `null` = todavía no está instalado supabase/avisos.sql. */
export async function listAllAvisos(): Promise<Aviso[] | null> {
  const { data, error } = await client().from('avisos').select(COLS).order('created_at', { ascending: false }).limit(100);
  if (error) return null;
  return (data ?? []) as Aviso[];
}

export async function saveAviso(a: { id?: string; title: string; body: string; active: boolean }): Promise<void> {
  const { error } = await client().rpc('save_aviso', {
    p_id: a.id ?? null,
    p_title: a.title,
    p_body: a.body,
    p_active: a.active,
  });
  if (error) throw new AvisoError(error.message);
}

export async function deleteAviso(id: string): Promise<void> {
  const { error } = await client().rpc('delete_aviso', { p_id: id });
  if (error) throw new AvisoError(error.message);
}
