/*
  Kabalot para todo el público. Las crea y las edita un admin; cada persona toca «Acepto» y se
  suma. Todos ven CUÁNTAS personas la aceptaron (solo el número, nunca quiénes). La autorización
  la decide la base de datos (supabase/kabalot-comunidad.sql), no esta pantalla.

  Lo que cada persona hace día a día vive solo en su dispositivo: al aceptar se crea una kabalá
  personal (la de siempre, con su pregunta diaria «¿hoy cumpliste?») enlazada por `comunidadId`.
*/
import { supabase } from './supabase';
import type { AreaId, KabalaKind } from './db/schema';

export interface KabalaComunidad {
  id: string;
  title: string;
  he: string;
  blurb: string;
  kavana: string;
  /** Si no está vacío, al aceptar se le pregunta (opcional) y se guarda solo en su dispositivo. */
  subject_label: string;
  pasuk_he: string;
  pasuk_es: string;
  pasuk_ref: string;
  kind: KabalaKind;
  area: string;
  /** Último día de la kabalá, incluido (AAAA-MM-DD). */
  ends_on: string;
  active: boolean;
  aceptaron: number;
  acepte: boolean;
}

export class ComunidadError extends Error {}

/** Áreas entre las que el admin puede elegir para una kabalá (todas existen en la app). */
export const COMUNIDAD_AREAS: { id: AreaId; es: string }[] = [
  { id: 'speech', es: 'Habla y lashón hará' },
  { id: 'ben_adam', es: 'Entre personas' },
  { id: 'middot', es: 'Midot' },
  { id: 'tefillah', es: 'Tefilá' },
  { id: 'torah', es: 'Torá' },
  { id: 'kedushah', es: 'Kedushá' },
  { id: 'mitzvot', es: 'Mitzvot' },
  { id: 'gratitude', es: 'Gratitud' },
];

const KNOWN_AREAS = new Set<string>(COMUNIDAD_AREAS.map((a) => a.id));

/** Un área desconocida (por un dato viejo o mal escrito) nunca rompe la app: cae en «entre personas». */
export function safeArea(area: string): AreaId {
  return (KNOWN_AREAS.has(area) ? area : 'ben_adam') as AreaId;
}

const CACHE_KEY = 'avodah.kabalot.comunidad';

function client() {
  if (!supabase) throw new ComunidadError('El servidor no está configurado.');
  return supabase;
}

export function cachedComunidad(): KabalaComunidad[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as KabalaComunidad[]) : [];
  } catch {
    return [];
  }
}

/** Las kabalot abiertas (un admin ve también las ocultas). `null` si no se pudo consultar. */
export async function fetchComunidad(): Promise<KabalaComunidad[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('list_kabalot_comunidad');
  if (error) return null;
  const list = (data ?? []) as KabalaComunidad[];
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(list.filter((k) => k.active)));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  return list;
}

export async function acceptComunidad(id: string): Promise<void> {
  const { error } = await client().rpc('accept_kabala_comunidad', { p_id: id });
  if (error) throw new ComunidadError(error.message);
}

export interface KabalaComunidadInput {
  id?: string;
  title: string;
  he: string;
  blurb: string;
  kavana: string;
  subject_label: string;
  pasuk_he: string;
  pasuk_es: string;
  pasuk_ref: string;
  kind: KabalaKind;
  area: string;
  ends_on: string;
  active: boolean;
}

export async function saveComunidad(k: KabalaComunidadInput): Promise<void> {
  const { error } = await client().rpc('save_kabala_comunidad', {
    p_id: k.id ?? null,
    p_title: k.title,
    p_he: k.he,
    p_blurb: k.blurb,
    p_kavana: k.kavana,
    p_subject_label: k.subject_label,
    p_pasuk_he: k.pasuk_he,
    p_pasuk_es: k.pasuk_es,
    p_pasuk_ref: k.pasuk_ref,
    p_kind: k.kind,
    p_area: k.area,
    p_ends_on: k.ends_on,
    p_active: k.active,
  });
  if (error) throw new ComunidadError(error.message);
}

export async function deleteComunidad(id: string): Promise<void> {
  const { error } = await client().rpc('delete_kabala_comunidad', { p_id: id });
  if (error) throw new ComunidadError(error.message);
}

/** Días que faltan hasta el último día de la kabalá, hoy incluido (mínimo 0 = ya terminó). */
export function daysLeft(endsOn: string, todayKey: string): number {
  const a = new Date(`${todayKey}T12:00:00`).getTime();
  const b = new Date(`${endsOn}T12:00:00`).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000) + 1);
}

/** «4 de octubre» */
export function endsLabel(endsOn: string): string {
  return new Date(`${endsOn}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}
