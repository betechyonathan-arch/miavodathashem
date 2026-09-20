-- ============================================================================
--  Avodah — auditoría para el panel de administración
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql y
--  referidos.sql. Es seguro correrlo más de una vez.
--
--  Qué agrega:
--   · Cuántas veces entró cada persona y cuándo fue la última vez (`login_count`, `last_login_at`).
--   · "En línea ahora": la app avisa cada par de minutos que la persona sigue ahí (`last_seen_at`).
--   · Una bitácora (`audit_events`) con los registros, las entradas y las acciones de admin.
--
--  Qué NO guarda ni muestra: lo que cada persona registra (caídas, logros, kabalot…). Eso
--  nunca sale de su dispositivo. La bitácora solo dice QUIÉN y CUÁNDO, nunca qué hizo.
-- ============================================================================

alter table public.profiles add column if not exists last_login_at timestamptz;
alter table public.profiles add column if not exists login_count   int not null default 0;

create table if not exists public.audit_events (
  id       bigint generated always as identity primary key,
  at       timestamptz not null default now(),
  -- registro | entrada | admin_otorgado | admin_quitado | cuenta_desactivada | cuenta_activada | cuenta_borrada
  kind     text not null,
  user_id  uuid references public.profiles(id) on delete set null,   -- de quién se trata
  actor_id uuid references public.profiles(id) on delete set null,   -- quién lo hizo (acciones de admin)
  detail   jsonb not null default '{}'::jsonb                         -- nombre y correo en ese momento
);

create index if not exists audit_events_at_idx   on public.audit_events (at desc);
create index if not exists audit_events_kind_idx on public.audit_events (kind, at desc);

alter table public.audit_events enable row level security;

-- Solo un admin puede leer la bitácora. Nadie escribe directo: solo las funciones de abajo.
drop policy if exists "solo admins leen la auditoria" on public.audit_events;
create policy "solo admins leen la auditoria"
  on public.audit_events for select
  using (public.is_admin());

-- ───────────────────────── Registro de una cuenta nueva ─────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter  uuid;
  v_name   text := left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120);
  v_gender text := case when new.raw_user_meta_data ->> 'gender' in ('hombre', 'mujer')
                        then new.raw_user_meta_data ->> 'gender' end;
begin
  select id into inviter
    from public.profiles
   where referral_code = lower(nullif(trim(new.raw_user_meta_data ->> 'ref'), ''))
   limit 1;

  insert into public.profiles (id, email, full_name, gender, referral_code, referred_by)
  values (new.id, new.email, v_name, v_gender, public.gen_referral_code(), inviter);

  insert into public.audit_events (kind, user_id, detail)
  values ('registro', new.id, jsonb_build_object(
    'nombre', v_name, 'correo', new.email, 'genero', v_gender, 'invitado_por', inviter));

  return new;
end;
$$;

-- ───────────────────── "Sigo aquí": presencia y entradas ─────────────────────
-- La app la llama al abrirse y cada ~2 minutos mientras está abierta.
-- Si pasaron más de 30 minutos desde la última señal, cuenta como una entrada nueva.

create or replace function public.touch_last_seen()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  prev  timestamptz;
  found_row boolean;
begin
  select last_seen_at, true into prev, found_row from public.profiles where id = auth.uid();
  if found_row is not true then
    return;
  end if;

  if prev is null or prev < now() - interval '30 minutes' then
    update public.profiles
       set last_seen_at = now(), last_login_at = now(), login_count = login_count + 1
     where id = auth.uid();
    insert into public.audit_events (kind, user_id) values ('entrada', auth.uid());
  else
    update public.profiles set last_seen_at = now() where id = auth.uid();
  end if;
end;
$$;

-- ───────────────────── Acciones de admin, ahora con bitácora ─────────────────────

create or replace function public.set_admin(p_user uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if not p_admin
     and (select role from public.profiles where id = p_user) = 'admin'
     and public.admin_count() <= 1 then
    raise exception 'Debe quedar al menos un admin';
  end if;
  select full_name, email into who from public.profiles where id = p_user;
  update public.profiles
     set role = case when p_admin then 'admin' else 'user' end
   where id = p_user;
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values (case when p_admin then 'admin_otorgado' else 'admin_quitado' end, p_user, auth.uid(),
          jsonb_build_object('nombre', who.full_name, 'correo', who.email));
end;
$$;

create or replace function public.set_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  who    record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  select id into target from public.profiles where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception 'Esa persona todavía no tiene cuenta. Pídele que se registre primero.';
  end if;
  select full_name, email into who from public.profiles where id = target;
  update public.profiles set role = 'admin', disabled = false where id = target;
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values ('admin_otorgado', target, auth.uid(), jsonb_build_object('nombre', who.full_name, 'correo', who.email));
end;
$$;

create or replace function public.set_disabled(p_user uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if p_user = auth.uid() then
    raise exception 'No puedes desactivar tu propia cuenta';
  end if;
  select full_name, email into who from public.profiles where id = p_user;
  update public.profiles set disabled = p_disabled where id = p_user;
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values (case when p_disabled then 'cuenta_desactivada' else 'cuenta_activada' end, p_user, auth.uid(),
          jsonb_build_object('nombre', who.full_name, 'correo', who.email));
end;
$$;

create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  who record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if p_user = auth.uid() then
    raise exception 'No puedes borrar tu propia cuenta';
  end if;
  if (select role from public.profiles where id = p_user) = 'admin' and public.admin_count() <= 1 then
    raise exception 'Debe quedar al menos un admin';
  end if;
  select full_name, email into who from public.profiles where id = p_user;
  -- el evento no apunta a la cuenta (se va a borrar): guarda el nombre y el correo de ese momento
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values ('cuenta_borrada', null, auth.uid(), jsonb_build_object('nombre', who.full_name, 'correo', who.email));
  delete from auth.users where id = p_user;
end;
$$;
