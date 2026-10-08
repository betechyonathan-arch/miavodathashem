-- ============================================================================
--  Avodah — diplomas
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql.
--  Es seguro correrlo más de una vez.
--
--  El admin elige a una persona y le otorga un diploma personalizado: nombre como se verá,
--  título (español y hebreo), motivo, mensaje, pasuk, firma y color. La persona lo ve al entrar
--  a la app, le llega una notificación (función push-diploma), y lo guarda en «Mis diplomas».
--  Cada quien ve solo los suyos; el admin ve todos.
-- ============================================================================

create table if not exists public.diplomas (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  nombre      text not null check (char_length(nombre) between 1 and 120),
  titulo      text not null check (char_length(titulo) between 3 and 120),
  titulo_he   text not null default '' check (char_length(titulo_he) <= 120),
  motivo      text not null check (char_length(motivo) between 3 and 600),
  mensaje     text not null default '' check (char_length(mensaje) <= 1500),
  pasuk_he    text not null default '' check (char_length(pasuk_he) <= 300),
  pasuk_es    text not null default '' check (char_length(pasuk_es) <= 300),
  pasuk_ref   text not null default '' check (char_length(pasuk_ref) <= 100),
  firma       text not null default '' check (char_length(firma) <= 120),
  tema        text not null default 'oro' check (tema in ('oro', 'azul', 'esmeralda', 'rubi')),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  visto_at    timestamptz
);

create index if not exists diplomas_user_idx on public.diplomas (user_id, created_at desc);

alter table public.diplomas enable row level security;

-- Nadie escribe directo: todo pasa por las funciones de abajo.
drop policy if exists "leer mis diplomas o ser admin" on public.diplomas;
create policy "leer mis diplomas o ser admin"
  on public.diplomas for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ───────────────────────── Lo que ve la persona ─────────────────────────

create or replace function public.mis_diplomas()
returns setof public.diplomas
language sql
security definer
stable
set search_path = public
as $$
  select * from public.diplomas where user_id = auth.uid() order by created_at desc;
$$;

create or replace function public.marcar_diploma_visto(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.diplomas set visto_at = coalesce(visto_at, now()) where id = p_id and user_id = auth.uid();
$$;

-- ───────────────────────── Acciones de admin ─────────────────────────

-- Crea (p_id null) o edita un diploma. `p_datos` trae los textos y el color.
create or replace function public.guardar_diploma(p_id uuid, p_user uuid, p_datos jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := p_id;
  v_nombre text := left(trim(coalesce(p_datos ->> 'nombre', '')), 120);
  v_titulo text := left(trim(coalesce(p_datos ->> 'titulo', '')), 120);
  v_motivo text := left(trim(coalesce(p_datos ->> 'motivo', '')), 600);
  v_tema   text := coalesce(p_datos ->> 'tema', 'oro');
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if p_user is null or not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'Elige a la persona que recibe el diploma';
  end if;
  if v_nombre = '' then
    select left(coalesce(nullif(full_name, ''), email), 120) into v_nombre from public.profiles where id = p_user;
  end if;
  if char_length(v_titulo) < 3 then
    raise exception 'Escribe el título del diploma';
  end if;
  if char_length(v_motivo) < 3 then
    raise exception 'Escribe por qué recibe el diploma';
  end if;
  if v_tema not in ('oro', 'azul', 'esmeralda', 'rubi') then
    v_tema := 'oro';
  end if;

  if p_id is null then
    insert into public.diplomas (user_id, nombre, titulo, titulo_he, motivo, mensaje, pasuk_he, pasuk_es, pasuk_ref, firma, tema, created_by)
    values (
      p_user, v_nombre, v_titulo,
      left(trim(coalesce(p_datos ->> 'titulo_he', '')), 120),
      v_motivo,
      left(trim(coalesce(p_datos ->> 'mensaje', '')), 1500),
      left(trim(coalesce(p_datos ->> 'pasuk_he', '')), 300),
      left(trim(coalesce(p_datos ->> 'pasuk_es', '')), 300),
      left(trim(coalesce(p_datos ->> 'pasuk_ref', '')), 100),
      left(trim(coalesce(p_datos ->> 'firma', '')), 120),
      v_tema, auth.uid()
    )
    returning id into new_id;
  else
    update public.diplomas
       set user_id = p_user, nombre = v_nombre, titulo = v_titulo,
           titulo_he = left(trim(coalesce(p_datos ->> 'titulo_he', '')), 120),
           motivo = v_motivo,
           mensaje = left(trim(coalesce(p_datos ->> 'mensaje', '')), 1500),
           pasuk_he = left(trim(coalesce(p_datos ->> 'pasuk_he', '')), 300),
           pasuk_es = left(trim(coalesce(p_datos ->> 'pasuk_es', '')), 300),
           pasuk_ref = left(trim(coalesce(p_datos ->> 'pasuk_ref', '')), 100),
           firma = left(trim(coalesce(p_datos ->> 'firma', '')), 120),
           tema = v_tema
     where id = p_id;
    if not found then
      raise exception 'Ese diploma ya no existe';
    end if;
  end if;
  return new_id;
end;
$$;

create or replace function public.borrar_diploma(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  delete from public.diplomas where id = p_id;
end;
$$;

-- Solo admin: todos los diplomas, con a quién se le dio y si ya lo vio.
create or replace function public.admin_list_diplomas()
returns table (
  id uuid, user_id uuid, nombre text, titulo text, titulo_he text, motivo text, mensaje text,
  pasuk_he text, pasuk_es text, pasuk_ref text, firma text, tema text, created_at timestamptz,
  visto_at timestamptz, full_name text, email text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede ver esto';
  end if;
  return query
    select d.id, d.user_id, d.nombre, d.titulo, d.titulo_he, d.motivo, d.mensaje, d.pasuk_he, d.pasuk_es,
           d.pasuk_ref, d.firma, d.tema, d.created_at, d.visto_at, p.full_name, p.email
      from public.diplomas d
      join public.profiles p on p.id = d.user_id
     order by d.created_at desc;
end;
$$;

revoke all on function public.mis_diplomas()                       from public, anon;
revoke all on function public.marcar_diploma_visto(uuid)           from public, anon;
revoke all on function public.guardar_diploma(uuid, uuid, jsonb)   from public, anon;
revoke all on function public.borrar_diploma(uuid)                 from public, anon;
revoke all on function public.admin_list_diplomas()                from public, anon;
grant execute on function public.mis_diplomas()                     to authenticated;
grant execute on function public.marcar_diploma_visto(uuid)         to authenticated;
grant execute on function public.guardar_diploma(uuid, uuid, jsonb) to authenticated;
grant execute on function public.borrar_diploma(uuid)               to authenticated;
grant execute on function public.admin_list_diplomas()              to authenticated;
