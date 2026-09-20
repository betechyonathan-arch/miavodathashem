-- ============================================================================
--  Avodah — «no estás solo»: cuánta gente está sirviendo
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql
--  y admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Devuelve SOLO DOS NÚMEROS, nunca quiénes son ni qué registran:
--   · `ahora`: otras personas con la app abierta en este momento.
--   · `hoy`:   otras personas que entraron en las últimas 24 horas.
--
--  Quien llama nunca se cuenta a sí misma, para que el número sea «los demás».
--  Es la misma idea del contador de invitaciones: un número y nada más.
-- ============================================================================

create or replace function public.community_presence()
returns table (ahora int, hoy int)
language sql
security definer
stable
set search_path = public
as $$
  select
    count(*) filter (where last_seen_at > now() - interval '5 minutes')::int  as ahora,
    count(*) filter (where last_seen_at > now() - interval '24 hours')::int   as hoy
  from public.profiles
  where not disabled
    and id <> auth.uid();
$$;

revoke all on function public.community_presence() from public, anon;
grant execute on function public.community_presence() to authenticated;
