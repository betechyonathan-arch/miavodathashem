/*
  Encuestas del admin. Las crea y las edita un admin (con varias preguntas de distintos tipos) y
  decide para quién son: todos, solo hombres, solo mujeres, o una sola persona — que la ve igual
  que cualquier otra, sin saber que es solo para ella. También decide si es anónima: entonces ni
  el admin ve quién respondió qué. La autorización la decide la base de datos
  (supabase/encuestas.sql + supabase/encuestas-detalladas.sql), no estas pantallas.
*/
import { supabase } from './supabase';

export type TipoPregunta = 'escala' | 'texto' | 'opcion' | 'multiple' | 'sino';
export type Audiencia = 'todos' | 'hombres' | 'mujeres' | 'persona';

export interface Pregunta {
  id: string;
  tipo: TipoPregunta;
  /** Puede ir vacío solo si la encuesta tiene una sola pregunta (entonces la pregunta es el título). */
  texto: string;
  obligatoria: boolean;
  min?: number;
  max?: number;
  opciones?: string[];
}

/** Respuesta a una pregunta: número (escala), texto (texto, opción, 'si'/'no') o lista (varias opciones). */
export type Valor = number | string | string[];
export type Valores = Record<string, Valor>;

export interface PublicEncuesta {
  id: string;
  title: string;
  description: string;
  active: boolean;
  preguntas: Pregunta[];
  anonima: boolean;
  /** `null` en una encuesta personal (para que la persona no note que es solo para ella). */
  respuestas: number | null;
  promedio: number | null;
  respondi: boolean;
  mis_valores: Valores | null;
  /** ¿Le toca a quien la está viendo? (el admin recibe todas para su panel, pero solo responde las suyas) */
  para_mi: boolean;
  /** Solo lo recibe el admin. */
  audiencia: Audiencia | null;
  target_user: string | null;
  created_at: string | null;
}

export interface Respuesta {
  /** `null` en una encuesta anónima. */
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  valores: Valores;
  answered_at: string | null;
}

export const TIPOS: { value: TipoPregunta; label: string }[] = [
  { value: 'escala', label: 'Escala (números)' },
  { value: 'opcion', label: 'Una opción' },
  { value: 'multiple', label: 'Varias opciones' },
  { value: 'sino', label: 'Sí / No' },
  { value: 'texto', label: 'Texto libre' },
];

export const AUDIENCIAS: { value: Audiencia; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'hombres', label: 'Solo hombres' },
  { value: 'mujeres', label: 'Solo mujeres' },
  { value: 'persona', label: 'Una persona' },
];

export class EncuestaError extends Error {}

const CACHE_KEY = 'avodah.encuestas.v2';

function client() {
  if (!supabase) throw new EncuestaError('El servidor no está configurado.');
  return supabase;
}

interface FilaServidor {
  id: string;
  title: string;
  description: string;
  kind: 'escala' | 'texto';
  scale_min: number;
  scale_max: number;
  active: boolean;
  respuestas: number | null;
  promedio: number | null;
  respondi: boolean;
  mi_valor_num: number | null;
  mi_valor_texto: string | null;
  preguntas?: Pregunta[] | null;
  anonima?: boolean | null;
  mis_valores?: Valores | null;
  para_mi?: boolean | null;
  audiencia?: Audiencia | null;
  target_user?: string | null;
  created_at?: string | null;
}

/** Acepta también lo que devuelve la base antes de correr encuestas-detalladas.sql (una sola pregunta). */
function normalizar(f: FilaServidor): PublicEncuesta {
  const preguntas: Pregunta[] =
    f.preguntas && f.preguntas.length > 0
      ? f.preguntas
      : [{ id: 'p1', tipo: f.kind, texto: '', obligatoria: true, ...(f.kind === 'escala' ? { min: f.scale_min, max: f.scale_max } : {}) }];
  const legado = f.mi_valor_num ?? f.mi_valor_texto;
  return {
    id: f.id,
    title: f.title,
    description: f.description,
    active: f.active,
    preguntas,
    anonima: !!f.anonima,
    respuestas: f.respuestas,
    promedio: f.promedio,
    respondi: f.respondi,
    mis_valores: f.mis_valores ?? (legado != null ? { [preguntas[0].id]: legado } : null),
    para_mi: f.para_mi ?? true,
    audiencia: f.audiencia ?? null,
    target_user: f.target_user ?? null,
    created_at: f.created_at ?? null,
  };
}

export function cachedEncuestas(): PublicEncuesta[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as PublicEncuesta[]) : [];
  } catch {
    return [];
  }
}

/** Las encuestas que ve esta persona (el admin recibe todas). `null` si no se pudo consultar. */
export async function fetchEncuestas(): Promise<PublicEncuesta[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('list_encuestas');
  if (error) return null;
  const list = ((data ?? []) as FilaServidor[]).map(normalizar);
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list.filter((e) => e.active && e.para_mi)));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  return list;
}

/** ¿Esta pregunta ya tiene respuesta? */
export function respondida(v: Valor | undefined): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'string') return v.trim().length > 0;
  return true;
}

export async function responderEncuesta(id: string, valores: Valores): Promise<void> {
  const { error } = await client().rpc('responder_encuesta', { p_id: id, p_valores: valores });
  if (error) throw new EncuestaError(error.message);
}

export interface EncuestaInput {
  id?: string;
  title: string;
  description: string;
  audiencia: Audiencia;
  target_user: string | null;
  anonima: boolean;
  preguntas: Pregunta[];
  active: boolean;
}

/** Guarda (crea o edita) y devuelve el id de la encuesta. */
export async function guardarEncuesta(e: EncuestaInput): Promise<string> {
  const { data, error } = await client().rpc('guardar_encuesta', {
    p_id: e.id ?? null,
    p_title: e.title,
    p_description: e.description,
    p_audiencia: e.audiencia,
    p_target_user: e.audiencia === 'persona' ? e.target_user : null,
    p_anonima: e.audiencia === 'persona' ? false : e.anonima,
    p_preguntas: e.preguntas.map((p) => ({
      ...p,
      opciones: p.opciones?.map((o) => o.trim()).filter(Boolean),
    })),
    p_active: e.active,
  });
  if (error) throw new EncuestaError(error.message);
  return data as string;
}

/** La encuesta tal como está, lista para volver a guardarla (editar, abrir o cerrar). */
export function aInput(e: PublicEncuesta): EncuestaInput {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    audiencia: e.audiencia ?? 'todos',
    target_user: e.target_user,
    anonima: e.anonima,
    preguntas: e.preguntas,
    active: e.active,
  };
}

export async function deleteEncuesta(id: string): Promise<void> {
  const { error } = await client().rpc('delete_encuesta', { p_id: id });
  if (error) throw new EncuestaError(error.message);
}

/** Solo admin: las respuestas (sin nombres si la encuesta es anónima). */
export async function listRespuestas(id: string): Promise<Respuesta[]> {
  const { data, error } = await client().rpc('list_respuestas_encuesta', { p_id: id });
  if (error) throw new EncuestaError(error.message);
  return ((data ?? []) as Respuesta[]).map((r) => ({ ...r, valores: r.valores ?? {} }));
}
