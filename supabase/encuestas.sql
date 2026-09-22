-- ============================================================================
--  Avodah — encuestas del admin
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql y
--  admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Un admin crea una encuesta (de escala 1-10, o de texto libre). Sale en «Hoy» para todos.
--  Para cualquier otra persona es ANÓNIMA: no ve quién respondió qué, solo cuántas personas
--  respondieron y el promedio. Solo el admin ve, uno por uno, quién puso cada respuesta.
--
--  Trae ya sembrada la primera: «Del 1 al 10, ¿qué tanto me conecté con Hashem en Yom Kipur?».
-- ============================================================================

create table if not exists public.encuestas (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 3 and 200),
  description text not null default '' check (char_length(description) <= 500),
  kind        text not null default 'escala' check (kind in ('escala', 'texto')),
  scale_min   int not null default 1,
  scale_max   int not null default 10,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references public.profiles(id) on delete set null,
  constraint encuestas_escala_valida check (scale_min < scale_max and scale_min >= 0 and scale_max <= 1000)
);

create table if not exists public.encuestas_respuestas (
  encuesta_id  uuid not null references public.encuestas(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  valor_num    int,
  valor_texto  text check (char_length(valor_texto) <= 1000),
  answered_at  timestamptz not null default now(),
  primary key (encuesta_id, user_id)
);

alter table public.encuestas enable row level security;
alter table public.encuestas_respuestas enable row level security;

-- Nadie lee ni escribe directo: todo pasa por las funciones de abajo (que saben quién llama).
drop policy if exists "leer encuestas activas o ser admin" on public.encuestas;
create policy "leer encuestas activas o ser admin"
  on public.encuestas for select
  to authenticated
  using (active or public.is_admin());

drop policy if exists "leer mi respuesta o ser admin" on public.encuestas_respuestas;
create policy "leer mi respuesta o ser admin"
  on public.encuestas_respuestas for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ───────────────────────── Lo que ve la gente ─────────────────────────

-- Las encuestas abiertas (el admin ve también las cerradas), con cuántas personas respondieron,
-- el promedio (solo de escala) y mi propia respuesta si ya la di. Nunca quién más respondió qué.
create or replace function public.list_encuestas()
returns table (
  id uuid, title text, description text, kind text, scale_min int, scale_max int, active boolean,
  respuestas int, promedio numeric, respondi boolean, mi_valor_num int, mi_valor_texto text
)
language sql
security definer
stable
set search_path = public
as $$
  select e.id, e.title, e.description, e.kind, e.scale_min, e.scale_max, e.active,
         (select count(*)::int from public.encuestas_respuestas r where r.encuesta_id = e.id),
         (select round(avg(r.valor_num)::numeric, 1) from public.encuestas_respuestas r where r.encuesta_id = e.id and r.valor_num is not null),
         exists (select 1 from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid()),
         (select r.valor_num from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid()),
         (select r.valor_texto from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid())
    from public.encuestas e
   where auth.uid() is not null
     and (e.active or public.is_admin())
   order by e.created_at desc;
$$;

-- Responder (o cambiar mi respuesta). Cada persona responde una sola fila por encuesta.
create or replace function public.submit_respuesta_encuesta(p_id uuid, p_valor_num int, p_valor_texto text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  e  record;
  v_texto text := nullif(trim(coalesce(p_valor_texto, '')), '');
  ya_habia boolean;
begin
  select id, full_name, email, disabled into me from public.profiles where id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa';
  end if;
  select id, title, kind, scale_min, scale_max, active into e from public.encuestas where id = p_id;
  if not found or not e.active then
    raise exception 'Esa encuesta ya no está disponible';
  end if;

  if e.kind = 'escala' then
    if p_valor_num is null or p_valor_num < e.scale_min or p_valor_num > e.scale_max then
      raise exception 'Elige un número entre % y %', e.scale_min, e.scale_max;
    end if;
    v_texto := null;
  else
    if v_texto is null then
      raise exception 'Escribe tu respuesta';
    end if;
    p_valor_num := null;
  end if;

  select exists (select 1 from public.encuestas_respuestas where encuesta_id = p_id and user_id = me.id) into ya_habia;

  insert into public.encuestas_respuestas (encuesta_id, user_id, valor_num, valor_texto, answered_at)
  values (p_id, me.id, p_valor_num, v_texto, now())
  on conflict (encuesta_id, user_id) do update
    set valor_num = excluded.valor_num, valor_texto = excluded.valor_texto, answered_at = now();

  if not ya_habia then
    insert into public.audit_events (kind, user_id, detail)
    values ('encuesta_respondida', me.id, jsonb_build_object('nombre', me.full_name, 'correo', me.email, 'encuesta', e.title));
  end if;
end;
$$;

-- ───────────────────────── Acciones de admin ─────────────────────────

create or replace function public.save_encuesta(
  p_id uuid, p_title text, p_description text, p_kind text, p_scale_min int, p_scale_max int, p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := p_id;
  v_title text := left(trim(coalesce(p_title, '')), 200);
  v_min int := coalesce(p_scale_min, 1);
  v_max int := coalesce(p_scale_max, 10);
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if char_length(v_title) < 3 then
    raise exception 'Escribe el título de la encuesta';
  end if;
  if p_kind not in ('escala', 'texto') then
    raise exception 'Tipo no válido';
  end if;
  if p_kind = 'escala' and v_min >= v_max then
    raise exception 'El número de abajo debe ser menor que el de arriba';
  end if;

  if p_id is null then
    insert into public.encuestas (title, description, kind, scale_min, scale_max, active, created_by)
    values (v_title, left(trim(coalesce(p_description, '')), 500), p_kind, v_min, v_max, coalesce(p_active, true), auth.uid())
    returning id into new_id;
  else
    update public.encuestas
       set title = v_title,
           description = left(trim(coalesce(p_description, '')), 500),
           kind = p_kind,
           scale_min = v_min,
           scale_max = v_max,
           active = coalesce(p_active, active),
           updated_at = now()
     where id = p_id;
    if not found then
      raise exception 'Esa encuesta ya no existe';
    end if;
  end if;
  return new_id;
end;
$$;

create or replace function public.delete_encuesta(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  delete from public.encuestas where id = p_id;   -- las respuestas se borran en cascada
end;
$$;

-- Solo admin: quién respondió qué, más reciente primero.
create or replace function public.list_respuestas_encuesta(p_id uuid)
returns table (user_id uuid, full_name text, email text, valor_num int, valor_texto text, answered_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select r.user_id, p.full_name, p.email, r.valor_num, r.valor_texto, r.answered_at
    from public.encuestas_respuestas r
    join public.profiles p on p.id = r.user_id
   where public.is_admin() and r.encuesta_id = p_id
   order by r.answered_at desc;
$$;

revoke all on function public.list_encuestas()                                         from public, anon;
revoke all on function public.submit_respuesta_encuesta(uuid, int, text)               from public, anon;
revoke all on function public.save_encuesta(uuid, text, text, text, int, int, boolean)  from public, anon;
revoke all on function public.delete_encuesta(uuid)                                    from public, anon;
revoke all on function public.list_respuestas_encuesta(uuid)                           from public, anon;
grant execute on function public.list_encuestas()                                        to authenticated;
grant execute on function public.submit_respuesta_encuesta(uuid, int, text)              to authenticated;
grant execute on function public.save_encuesta(uuid, text, text, text, int, int, boolean) to authenticated;
grant execute on function public.delete_encuesta(uuid)                                   to authenticated;
grant execute on function public.list_respuestas_encuesta(uuid)                          to authenticated;

-- ───────────────────── La primera encuesta (solo si todavía no hay ninguna) ─────────────────────

insert into public.encuestas (title, description, kind, scale_min, scale_max)
select
  'Del 1 al 10, ¿qué tanto me conecté con Hashem en Yom Kipur?',
  'Rápido y honesto: sin pensarlo mucho, el número que sientas.',
  'escala', 1, 10
where not exists (select 1 from public.encuestas);
