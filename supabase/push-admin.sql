-- ============================================================================
--  Avodah — panel de admin: qué cuentas tienen las notificaciones activadas
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de push.sql.
--  Es seguro correrlo más de una vez.
--
--  Un admin ve SOLO quién activó las notificaciones y desde cuándo — nunca la dirección
--  técnica de envío (endpoint/claves) de nadie, ni lo que registra cada persona. Esa
--  dirección solo la usa la función de servidor `send-push`, con la clave de servicio.
-- ============================================================================

create or replace function public.admin_list_push_subscribers()
returns table (user_id uuid, subscribed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede ver esto';
  end if;
  return query
    select ps.user_id, min(ps.created_at) as subscribed_at
    from public.push_subscriptions ps
    group by ps.user_id;
end;
$$;

revoke all on function public.admin_list_push_subscribers() from public, anon;
grant execute on function public.admin_list_push_subscribers() to authenticated;
