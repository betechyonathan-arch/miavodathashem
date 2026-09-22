/*
  Encuestas del admin. Las crea y las edita un admin; salen en «Hoy» para todos. Son ANÓNIMAS
  para cualquier otra persona: nadie más ve quién respondió qué, solo cuántas personas respondieron
  y el promedio. Solo el admin ve, uno por uno, quién puso cada respuesta (list_respuestas_encuesta).
  La autorización la decide la base de datos (supabase/encuestas.sql), no esta pantalla.
*/
import { supabase } from './supabase';

export type EncuestaKind = 'escala' | 'texto';

export interface PublicEncuesta {
  id: string;
  title: string;
  description: string;
  kind: EncuestaKind;
  scale_min: number;
  scale_max: number;
  active: boolean;
  respuestas: number;
  promedio: number | null;
  respondi: boolean;
  mi_valor_num: number | null;
  mi_valor_texto: string | null;
}

export interface Respuesta {
  user_id: string;
  full_name: string;
  email: string;
  valor_num: number | null;
  valor_texto: string | null;
  answered_at: string;
}

export class EncuestaError extends Error {}

const CACHE_KEY = 'avodah.encuestas';

function client() {
  if (!supabase) throw new EncuestaError('El servidor no está configurado.');
  return supabase;
}

export function cachedEncuestas(): PublicEncuesta[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PublicEncuesta[]) : [];
  } catch {
    return [];
  }
}

/** Las encuestas para esta persona (un admin ve también las cerradas). `null` si no se pudo consultar. */
export async function fetchEncuestas(): Promise<PublicEncuesta[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('list_encuestas');
  if (error) return null;
  const list = (data ?? []) as PublicEncuesta[];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list.filter((e) => e.active)));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  return list;
}

export async function submitRespuesta(id: string, valorNum: number | null, valorTexto: string | null): Promise<void> {
  const { error } = await client().rpc('submit_respuesta_encuesta', { p_id: id, p_valor_num: valorNum, p_valor_texto: valorTexto });
  if (error) throw new EncuestaError(error.message);
}

export interface EncuestaInput {
  id?: string;
  title: string;
  description: string;
  kind: EncuestaKind;
  scale_min: number;
  scale_max: number;
  active: boolean;
}

export async function saveEncuesta(e: EncuestaInput): Promise<void> {
  const { error } = await client().rpc('save_encuesta', {
    p_id: e.id ?? null,
    p_title: e.title,
    p_description: e.description,
    p_kind: e.kind,
    p_scale_min: e.scale_min,
    p_scale_max: e.scale_max,
    p_active: e.active,
  });
  if (error) throw new EncuestaError(error.message);
}

export async function deleteEncuesta(id: string): Promise<void> {
  const { error } = await client().rpc('delete_encuesta', { p_id: id });
  if (error) throw new EncuestaError(error.message);
}

/** Solo admin: quién respondió qué, más reciente primero. */
export async function listRespuestas(id: string): Promise<Respuesta[]> {
  const { data, error } = await client().rpc('list_respuestas_encuesta', { p_id: id });
  if (error) throw new EncuestaError(error.message);
  return (data ?? []) as Respuesta[];
}
