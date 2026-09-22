/*
  Cadenas de Tehilim: cualquiera organiza una (con un motivo — por la refuá de alguien, etc.),
  genera su enlace, y la gente se apunta a uno o más de los 150 capítulos hasta completar el
  círculo. Es una hoja de inscripción abierta a todos: a diferencia de los retos, aquí no aplica
  la regla de género — el objetivo es sumar a cuanta gente se pueda. Cada quien elige mostrar su
  nombre o quedar anónimo en el capítulo que tomó.
*/
import { supabase } from './supabase';

export class TehilimError extends Error {}

function client() {
  if (!supabase) throw new TehilimError('El servidor no está configurado.');
  return supabase;
}

export interface Cadena {
  id: string;
  title: string;
  description: string;
  status: 'activa' | 'completa';
  invite_code: string;
  organizador: string;
  tomados: number;
  mios: number;
}

export async function listCadenas(): Promise<Cadena[]> {
  const { data, error } = await client().rpc('list_cadenas_tehilim');
  if (error) throw new TehilimError(error.message);
  return (data ?? []) as Cadena[];
}

export interface CadenaPorCodigo {
  id: string;
  title: string;
  description: string;
  status: 'activa' | 'completa';
  invite_code: string;
  organizador: string;
  tomados: number;
}

export async function getCadenaByCode(code: string): Promise<CadenaPorCodigo | null> {
  const { data, error } = await client().rpc('get_cadena_by_code', { p_code: code });
  if (error) throw new TehilimError(error.message);
  const rows = (data ?? []) as CadenaPorCodigo[];
  return rows[0] ?? null;
}

export async function organizarCadena(title: string, description: string): Promise<{ id: string; invite_code: string }> {
  const { data, error } = await client().rpc('organizar_cadena_tehilim', { p_title: title, p_description: description });
  if (error) throw new TehilimError(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { id: string; invite_code: string };
  return row;
}

export interface Capitulo {
  perek: number;
  user_id: string | null;
  etiqueta: string | null; // null = libre; "Tú" | "Anónimo" | nombre real
  soy_yo: boolean;
  dicho: boolean;
}

export async function listCapitulos(cadenaId: string): Promise<Capitulo[]> {
  const { data, error } = await client().rpc('list_capitulos_cadena', { p_cadena_id: cadenaId });
  if (error) throw new TehilimError(error.message);
  return (data ?? []) as Capitulo[];
}

export async function tomarCapitulo(cadenaId: string, perek: number, anonimo: boolean): Promise<void> {
  const { error } = await client().rpc('tomar_capitulo_cadena', { p_cadena_id: cadenaId, p_perek: perek, p_anonimo: anonimo });
  if (error) throw new TehilimError(error.message);
}

export async function soltarCapitulo(cadenaId: string, perek: number): Promise<void> {
  const { error } = await client().rpc('soltar_capitulo_cadena', { p_cadena_id: cadenaId, p_perek: perek });
  if (error) throw new TehilimError(error.message);
}

export async function marcarDicho(cadenaId: string, perek: number, dicho: boolean): Promise<void> {
  const { error } = await client().rpc('marcar_dicho_capitulo', { p_cadena_id: cadenaId, p_perek: perek, p_dicho: dicho });
  if (error) throw new TehilimError(error.message);
}

/* ───────────────────────── Solo admin ───────────────────────── */

export interface CadenaAdmin {
  id: string;
  title: string;
  description: string;
  status: 'activa' | 'completa';
  organizador: string;
  created_at: string;
  tomados: number;
}

export async function listCadenasAdmin(): Promise<CadenaAdmin[] | null> {
  const { data, error } = await client().rpc('list_cadenas_admin');
  if (error) return null;
  return (data ?? []) as CadenaAdmin[];
}

export async function deleteCadenaAdmin(id: string): Promise<void> {
  const { error } = await client().rpc('delete_cadena_admin', { p_id: id });
  if (error) throw new TehilimError(error.message);
}
