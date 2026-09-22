-- ============================================================================
--  Avodah — notificaciones push (avisos que suenan en el teléfono)
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql y
--  admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Cada persona que activa las notificaciones (con su permiso, desde la app) queda registrada
--  aquí: solo la dirección técnica de envío de SU navegador, nunca nada de lo que registra.
--  El envío real lo hace la función de servidor `send-push` (supabase/functions/send-push),
--  con la clave privada VAPID guardada como secreto, nunca en esta base ni en el código del
--  navegador.
-- ============================================================================

create table if not exists public.push_subscriptions (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

-- Solo se lee la propia (la lista completa la usa la función de servidor, con la clave de servicio).
drop policy if exists "leer mi suscripcion" on public.push_subscriptions;
create policy "leer mi suscripcion"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Necesitas una cuenta activa';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth_key)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth)
  on conflict (user_id, endpoint) do update set p256dh = excluded.p256dh, auth_key = excluded.auth_key;
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.push_subscriptions where user_id = auth.uid() and endpoint = p_endpoint;
end;
$$;

revoke all on function public.save_push_subscription(text, text, text)   from public, anon;
revoke all on function public.delete_push_subscription(text)             from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text)           to authenticated;
