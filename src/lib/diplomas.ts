/*
  Diplomas que el admin otorga a una persona. Cada quien ve solo los suyos (al entrar a la app, la
  primera vez, y después en «Mis diplomas»); el admin ve todos. La autorización la decide la base
  de datos (supabase/diplomas.sql), no estas pantallas.
*/
import { supabase } from './supabase';

export type TemaDiploma = 'oro' | 'azul' | 'esmeralda' | 'rubi';

export const TEMAS: { value: TemaDiploma; label: string }[] = [
  { value: 'oro', label: 'Dorado' },
  { value: 'azul', label: 'Azul' },
  { value: 'esmeralda', label: 'Esmeralda' },
  { value: 'rubi', label: 'Rubí' },
];

/** Lo que se escribe en el diploma. */
export interface DiplomaDatos {
  nombre: string;
  titulo: string;
  titulo_he: string;
  motivo: string;
  mensaje: string;
  pasuk_he: string;
  pasuk_es: string;
  pasuk_ref: string;
  firma: string;
  tema: TemaDiploma;
}

export interface Diploma extends DiplomaDatos {
  id: string;
  user_id: string;
  created_at: string;
  visto_at: string | null;
}

export interface DiplomaAdmin extends Diploma {
  full_name: string;
  email: string;
}

export class DiplomaError extends Error {}

function client() {
  if (!supabase) throw new DiplomaError('El servidor no está configurado.');
  return supabase;
}

/** Mis diplomas, el más reciente primero. `null` si no se pudo consultar (sin conexión o sin activar). */
export async function misDiplomas(): Promise<Diploma[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('mis_diplomas');
  if (error) return null;
  return (data ?? []) as Diploma[];
}

export async function marcarVisto(id: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('marcar_diploma_visto', { p_id: id });
}

/** Solo admin: crea (sin id) o edita un diploma. Devuelve su id. */
export async function guardarDiploma(userId: string, datos: DiplomaDatos, id?: string): Promise<string> {
  const { data, error } = await client().rpc('guardar_diploma', { p_id: id ?? null, p_user: userId, p_datos: datos });
  if (error) throw new DiplomaError(error.message);
  return data as string;
}

export async function borrarDiploma(id: string): Promise<void> {
  const { error } = await client().rpc('borrar_diploma', { p_id: id });
  if (error) throw new DiplomaError(error.message);
}

/** Solo admin. `null` si todavía no se activó (falta correr supabase/diplomas.sql). */
export async function listDiplomasAdmin(): Promise<DiplomaAdmin[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('admin_list_diplomas');
  if (error) return null;
  return (data ?? []) as DiplomaAdmin[];
}
