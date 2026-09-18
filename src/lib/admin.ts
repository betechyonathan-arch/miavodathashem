/*
  Acciones del panel de admin. La autorización NO se decide aquí: cada llamada la
  valida la base de datos (supabase/schema.sql). Si quien llama no es admin, el
  servidor la rechaza aunque alguien fuerce la pantalla desde el navegador.
*/
import { supabase } from './supabase';

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  gender: 'hombre' | 'mujer' | null;
  role: 'user' | 'admin';
  disabled: boolean;
  created_at: string;
  last_seen_at: string | null;
}

export class AdminError extends Error {}

function client() {
  if (!supabase) throw new AdminError('El servidor no está configurado.');
  return supabase;
}

function fail(message: string): never {
  throw new AdminError(message || 'No se pudo completar la acción.');
}

export async function listUsers(): Promise<AdminUser[]> {
  const { data, error } = await client()
    .from('profiles')
    .select('id, email, full_name, gender, role, disabled, created_at, last_seen_at')
    .order('created_at', { ascending: false });
  if (error) fail(error.message);
  return (data ?? []) as AdminUser[];
}

export async function setAdmin(userId: string, admin: boolean): Promise<void> {
  const { error } = await client().rpc('set_admin', { p_user: userId, p_admin: admin });
  if (error) fail(error.message);
}

export async function addAdminByEmail(email: string): Promise<void> {
  const { error } = await client().rpc('set_admin_by_email', { p_email: email });
  if (error) fail(error.message);
}

export async function setDisabled(userId: string, disabled: boolean): Promise<void> {
  const { error } = await client().rpc('set_disabled', { p_user: userId, p_disabled: disabled });
  if (error) fail(error.message);
}

export async function deleteUser(userId: string): Promise<void> {
  const { error } = await client().rpc('admin_delete_user', { p_user: userId });
  if (error) fail(error.message);
}
