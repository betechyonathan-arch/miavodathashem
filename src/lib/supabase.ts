/*
  Cliente de Supabase. Se activa solo si en `.env.local` están la URL y la clave
  pública (anon) del proyecto. Sin ellas la app sigue funcionando con cuentas locales.

  La clave anon es pública por diseño: lo que protege los datos son las reglas
  (RLS) de supabase/schema.sql, no el secreto de esta clave. NUNCA se pone aquí la
  clave "service_role".
*/
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = import.meta.env as Record<string, string | undefined>;
const url = env.VITE_SUPABASE_URL?.trim();
const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim();

export const backendConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(url as string, anonKey as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
