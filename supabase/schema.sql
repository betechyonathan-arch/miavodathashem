-- ============================================================================
--  Avodah — cuentas, roles y panel de administración (Supabase)
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, en un proyecto NUEVO
--  (no en el de Otzar Divrei Torá: allí ya existe otra tabla `profiles`).
--
--  Principios de seguridad:
--   · El rol (user / admin) NUNCA sale de lo que manda el navegador. Solo lo cambian
--     las funciones de abajo, y solo si quien llama ya es admin.
--   · Nadie puede escribir directo en `profiles`: no hay policies de insert/update/delete.
--   · Un admin ve la lista de personas (nombre, correo, género, fechas), NO su diario:
--     los registros de cada usuario no viven en esta base.
-- ============================================================================

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  full_name    text not null default '',
  gender       text check (gender in ('hombre', 'mujer')),
  role         text not null default 'user' check (role in ('user', 'admin')),
  disabled     boolean not null default false,
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz
);

alter table public.profiles enable row level security;

-- ¿Quien llama es un admin activo?  (security definer: evita recursión con las policies)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and not disabled
  );
$$;

drop policy if exists "leer perfil propio o ser admin" on public.profiles;
create policy "leer perfil propio o ser admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

-- Al registrarse: se crea el perfil con nombre y género. El rol siempre empieza en 'user'.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, gender)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    case when new.raw_user_meta_data ->> 'gender' in ('hombre', 'mujer')
         then new.raw_user_meta_data ->> 'gender' end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── Funciones del usuario ─────────────────────────

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

create or replace function public.update_my_profile(p_name text, p_gender text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_gender is not null and p_gender not in ('hombre', 'mujer') then
    raise exception 'Género no válido';
  end if;
  update public.profiles
     set full_name = coalesce(nullif(left(trim(p_name), 120), ''), full_name),
         gender    = coalesce(p_gender, gender)
   where id = auth.uid();
end;
$$;

-- ───────────────────────── Funciones de admin ─────────────────────────

create or replace function public.admin_count()
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int from public.profiles where role = 'admin' and not disabled;
$$;

-- Hacer / quitar admin por id.  No permite dejar el sistema sin ningún admin.
create or replace function public.set_admin(p_user uuid, p_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if not p_admin
     and (select role from public.profiles where id = p_user) = 'admin'
     and public.admin_count() <= 1 then
    raise exception 'Debe quedar al menos un admin';
  end if;
  update public.profiles
     set role = case when p_admin then 'admin' else 'user' end
   where id = p_user;
end;
$$;

-- Hacer admin por correo. La persona tiene que haberse registrado antes.
create or replace function public.set_admin_by_email(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  select id into target from public.profiles where lower(email) = lower(trim(p_email));
  if target is null then
    raise exception 'Esa persona todavía no tiene cuenta. Pídele que se registre primero.';
  end if;
  update public.profiles set role = 'admin', disabled = false where id = target;
end;
$$;

create or replace function public.set_disabled(p_user uuid, p_disabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if p_user = auth.uid() then
    raise exception 'No puedes desactivar tu propia cuenta';
  end if;
  update public.profiles set disabled = p_disabled where id = p_user;
end;
$$;

-- Borra la cuenta y (por cascada) su perfil. No se puede borrar a sí mismo.
create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
  delete from auth.users where id = p_user;
end;
$$;

-- Solo usuarios con sesión pueden llamar a estas funciones (nunca anónimos).
revoke all on function public.touch_last_seen()                      from public, anon;
revoke all on function public.update_my_profile(text, text)          from public, anon;
revoke all on function public.set_admin(uuid, boolean)               from public, anon;
revoke all on function public.set_admin_by_email(text)               from public, anon;
revoke all on function public.set_disabled(uuid, boolean)            from public, anon;
revoke all on function public.admin_delete_user(uuid)                from public, anon;
revoke all on function public.admin_count()                          from public, anon, authenticated;
grant execute on function public.touch_last_seen()                   to authenticated;
grant execute on function public.update_my_profile(text, text)       to authenticated;
grant execute on function public.set_admin(uuid, boolean)            to authenticated;
grant execute on function public.set_admin_by_email(text)            to authenticated;
grant execute on function public.set_disabled(uuid, boolean)         to authenticated;
grant execute on function public.admin_delete_user(uuid)             to authenticated;
