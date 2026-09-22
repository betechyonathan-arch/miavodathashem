-- ============================================================================
--  Avodah — cadenas de Tehilim
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql y
--  admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Cualquiera organiza una cadena (con un motivo: por la refuá de alguien, por una parnasá,
--  lo que sea). Genera su propio enlace. Cada persona se apunta a uno o más de los 150
--  capítulos del Tehilim, con su nombre o anónima. Cuando los 150 quedan tomados, se cierra el
--  círculo: se completó el Tehilim entero por ese motivo.
--
--  Es una hoja de inscripción abierta a todos los que tienen cuenta (a diferencia de los
--  retos, aquí no aplica la regla de género: el objetivo es sumar a cuanta gente se pueda).
--  Sin revisión de admin antes de publicarse —la urgencia importa (alguien enfermo, etc.)—,
--  pero el admin puede borrar una cadena si hace falta.
-- ============================================================================

create table if not exists public.cadenas_tehilim (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 140),   -- el motivo
  description text not null default '' check (char_length(description) <= 500),
  invite_code text not null unique,
  status      text not null default 'activa' check (status in ('activa', 'completa')),
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.cadena_tehilim_capitulos (
  cadena_id  uuid not null references public.cadenas_tehilim(id) on delete cascade,
  perek      int not null check (perek between 1 and 150),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  anonimo    boolean not null default false,
  dicho      boolean not null default false,
  claimed_at timestamptz not null default now(),
  primary key (cadena_id, perek)
);

create index if not exists cadena_tehilim_capitulos_user_idx on public.cadena_tehilim_capitulos (user_id);

alter table public.cadenas_tehilim         enable row level security;
alter table public.cadena_tehilim_capitulos enable row level security;

-- Es una hoja de inscripción pública (para todos los que tienen cuenta): cualquiera la lee.
-- Nadie escribe directo: todo pasa por las funciones de abajo.
drop policy if exists "leer cadenas" on public.cadenas_tehilim;
create policy "leer cadenas"
  on public.cadenas_tehilim for select
  to authenticated
  using (true);

drop policy if exists "leer capitulos" on public.cadena_tehilim_capitulos;
create policy "leer capitulos"
  on public.cadena_tehilim_capitulos for select
  to authenticated
  using (true);

-- ───────────────────────── Ayuda ─────────────────────────

create or replace function public.gen_tehilim_code()
returns text
language plpgsql
as $$
declare
  chars text := 'abcdefghjkmnpqrstuvwxyz23456789';
  code  text;
  i     int;
begin
  loop
    code := '';
    for i in 1..9 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.cadenas_tehilim where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ───────────────────────── Organizar y unirse ─────────────────────────

create or replace function public.organizar_cadena_tehilim(p_title text, p_description text)
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  new_id uuid;
  code text;
begin
  select p.id, p.disabled into me from public.profiles p where p.id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Escribe para qué es la cadena';
  end if;

  code := public.gen_tehilim_code();
  insert into public.cadenas_tehilim (title, description, invite_code, created_by)
  values (left(trim(p_title), 140), left(trim(coalesce(p_description, '')), 500), code, auth.uid())
  returning cadenas_tehilim.id into new_id;

  insert into public.audit_events (kind, user_id, detail)
  values ('cadena_creada', auth.uid(), jsonb_build_object('cadena', left(trim(p_title), 140)));

  return query select new_id, code;
end;
$$;

create or replace function public.get_cadena_by_code(p_code text)
returns table (id uuid, title text, description text, status text, invite_code text, organizador text, tomados int)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.title, c.description, c.status, c.invite_code,
         coalesce(nullif(pr.full_name, ''), 'Alguien'),
         (select count(*)::int from public.cadena_tehilim_capitulos k where k.cadena_id = c.id)
    from public.cadenas_tehilim c
    join public.profiles pr on pr.id = c.created_by
   where c.invite_code = trim(p_code) and auth.uid() is not null;
$$;

-- Todas las cadenas (para explorar). No hace falta el código si ya la ves en la lista.
create or replace function public.list_cadenas_tehilim()
returns table (id uuid, title text, description text, status text, invite_code text, organizador text, tomados int, mios int)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.title, c.description, c.status, c.invite_code,
         coalesce(nullif(pr.full_name, ''), 'Alguien'),
         (select count(*)::int from public.cadena_tehilim_capitulos k where k.cadena_id = c.id),
         (select count(*)::int from public.cadena_tehilim_capitulos k where k.cadena_id = c.id and k.user_id = auth.uid())
    from public.cadenas_tehilim c
    join public.profiles pr on pr.id = c.created_by
   where auth.uid() is not null
   order by (c.status = 'activa') desc, c.created_at desc
   limit 100;
$$;

-- Los 150 capítulos de una cadena: quién tiene cada uno (o libre).
create or replace function public.list_capitulos_cadena(p_cadena_id uuid)
returns table (perek int, user_id uuid, etiqueta text, soy_yo boolean, dicho boolean)
language sql
security definer
stable
set search_path = public
as $$
  select s.n, k.user_id,
         case when k.user_id is null then null
              when k.user_id = auth.uid() then 'Tú'
              when k.anonimo then 'Anónimo'
              else coalesce(nullif(pr.full_name, ''), 'Alguien') end,
         k.user_id = auth.uid(),
         k.dicho
    from generate_series(1, 150) as s(n)
    left join public.cadena_tehilim_capitulos k on k.cadena_id = p_cadena_id and k.perek = s.n
    left join public.profiles pr on pr.id = k.user_id
   where auth.uid() is not null
   order by s.n;
$$;

create or replace function public.tomar_capitulo_cadena(p_cadena_id uuid, p_perek int, p_anonimo boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  st text;
  tomados int;
begin
  select status into st from public.cadenas_tehilim where id = p_cadena_id;
  if st is null then
    raise exception 'Esa cadena ya no existe';
  end if;
  if st <> 'activa' then
    raise exception 'Esa cadena ya se completó';
  end if;
  if p_perek < 1 or p_perek > 150 then
    raise exception 'Elige un capítulo entre 1 y 150';
  end if;

  insert into public.cadena_tehilim_capitulos (cadena_id, perek, user_id, anonimo)
  values (p_cadena_id, p_perek, auth.uid(), coalesce(p_anonimo, false));

  select count(*) into tomados from public.cadena_tehilim_capitulos where cadena_id = p_cadena_id;
  if tomados >= 150 then
    update public.cadenas_tehilim set status = 'completa', completed_at = now() where id = p_cadena_id;
    insert into public.audit_events (kind, user_id, detail)
    values ('cadena_completada', (select created_by from public.cadenas_tehilim where id = p_cadena_id),
            jsonb_build_object('cadena', (select title from public.cadenas_tehilim where id = p_cadena_id)));
  end if;
exception
  when unique_violation then
    raise exception 'Ese capítulo ya lo tomó alguien más';
end;
$$;

create or replace function public.soltar_capitulo_cadena(p_cadena_id uuid, p_perek int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cadena_tehilim_capitulos
   where cadena_id = p_cadena_id and perek = p_perek and user_id = auth.uid();
end;
$$;

create or replace function public.marcar_dicho_capitulo(p_cadena_id uuid, p_perek int, p_dicho boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.cadena_tehilim_capitulos
     set dicho = coalesce(p_dicho, true)
   where cadena_id = p_cadena_id and perek = p_perek and user_id = auth.uid();
end;
$$;

-- ───────────────────────── Admin ─────────────────────────

create or replace function public.list_cadenas_admin()
returns table (id uuid, title text, description text, status text, organizador text, created_at timestamptz, tomados int)
language sql
security definer
stable
set search_path = public
as $$
  select c.id, c.title, c.description, c.status, coalesce(nullif(pr.full_name,''), pr.email), c.created_at,
         (select count(*)::int from public.cadena_tehilim_capitulos k where k.cadena_id = c.id)
    from public.cadenas_tehilim c
    join public.profiles pr on pr.id = c.created_by
   where public.is_admin()
   order by c.created_at desc
   limit 300;
$$;

create or replace function public.delete_cadena_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  delete from public.cadenas_tehilim where id = p_id;
end;
$$;

-- ───────────────────────── Permisos ─────────────────────────

revoke all on function public.organizar_cadena_tehilim(text, text)        from public, anon;
revoke all on function public.get_cadena_by_code(text)                    from public, anon;
revoke all on function public.list_cadenas_tehilim()                      from public, anon;
revoke all on function public.list_capitulos_cadena(uuid)                 from public, anon;
revoke all on function public.tomar_capitulo_cadena(uuid, int, boolean)   from public, anon;
revoke all on function public.soltar_capitulo_cadena(uuid, int)           from public, anon;
revoke all on function public.marcar_dicho_capitulo(uuid, int, boolean)   from public, anon;
revoke all on function public.list_cadenas_admin()                        from public, anon;
revoke all on function public.delete_cadena_admin(uuid)                   from public, anon;

grant execute on function public.organizar_cadena_tehilim(text, text)        to authenticated;
grant execute on function public.get_cadena_by_code(text)                    to authenticated;
grant execute on function public.list_cadenas_tehilim()                      to authenticated;
grant execute on function public.list_capitulos_cadena(uuid)                 to authenticated;
grant execute on function public.tomar_capitulo_cadena(uuid, int, boolean)   to authenticated;
grant execute on function public.soltar_capitulo_cadena(uuid, int)           to authenticated;
grant execute on function public.marcar_dicho_capitulo(uuid, int, boolean)   to authenticated;
grant execute on function public.list_cadenas_admin()                        to authenticated;
grant execute on function public.delete_cadena_admin(uuid)                   to authenticated;
