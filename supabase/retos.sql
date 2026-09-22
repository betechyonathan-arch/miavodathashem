-- ============================================================================
--  Avodah — retos entre usuarios
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql y
--  admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Un reto es un compromiso con fecha (como una kabalá) pero entre dos o más personas: "reto a
--  Moshe: 5 días sin decir groserías". Puede ser:
--   · PRIVADO — solo entre quienes invitas. Se invita buscando a alguien de tu mismo género
--     (mujeres solo ven y buscan mujeres; hombres solo hombres) o mandando el enlace del reto
--     por fuera de la app (WhatsApp, etc.) a cualquiera. Quien recibe la invitación la acepta o
--     la rechaza. NO pasa por revisión de admin: solo si alguien lo denuncia.
--   · PÚBLICO — cualquiera se suscribe desde «Retos públicos», siempre anónimo. SÍ necesita que
--     un admin lo apruebe antes de que otros lo vean, para evitar retos raros.
--
--  Nombres: si todos los participantes activos de un reto son del mismo género, se ven los
--  nombres entre ellos. Si es mixto (hombres y mujeres), se vuelve anónimo: nadie ve el nombre
--  de nadie, ni siquiera quien lo creó. El admin siempre ve las identidades, para moderar.
--
--  Lo que cada quien marca día a día (si cuidó o si cayó) SOLO lo ven los demás participantes
--  ACTIVOS de ESE reto (así funciona un reto: ves si tu rival va cumpliendo) y el admin. Nunca
--  sale de ahí — es la única excepción a que los registros personales nunca salen del
--  dispositivo, y es explícita: es la esencia de un reto.
-- ============================================================================

alter table public.profiles add column if not exists retos_bloqueado boolean not null default false;

create table if not exists public.retos (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 3 and 140),
  description  text not null default '' check (char_length(description) <= 500),
  kind         text not null default 'cuidar' check (kind in ('cuidar', 'hacer')),
  area         text not null default 'ben_adam' check (char_length(area) <= 30),
  target_days  int not null check (target_days between 1 and 365),
  visibility   text not null check (visibility in ('publico', 'privado')),
  status       text not null default 'activo' check (status in ('pendiente_admin', 'activo', 'rechazado_admin')),
  invite_code  text not null unique,
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table if not exists public.retos_participantes (
  reto_id       uuid not null references public.retos(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'invitado' check (status in ('invitado', 'activo', 'rechazado', 'abandonado')),
  invited_by    uuid references public.profiles(id) on delete set null,
  start_day_id  text,                    -- dayId (el de la app) del día en que aceptó / se unió
  joined_at     timestamptz,
  responded_at  timestamptz,
  created_at    timestamptz not null default now(),
  primary key (reto_id, user_id)
);

create table if not exists public.retos_dias (
  reto_id     uuid not null references public.retos(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  day_id      text not null,
  status      text not null check (status in ('limpio', 'caida')),
  marked_at   timestamptz not null default now(),
  primary key (reto_id, user_id, day_id)
);

create table if not exists public.retos_reportes (
  id             uuid primary key default gen_random_uuid(),
  reto_id        uuid not null references public.retos(id) on delete cascade,
  reported_user  uuid not null references public.profiles(id) on delete cascade,
  reported_by    uuid not null references public.profiles(id) on delete cascade,
  reason         text not null check (char_length(reason) between 1 and 500),
  resolved       boolean not null default false,
  resolved_at    timestamptz,
  resolved_by    uuid references public.profiles(id) on delete set null,
  blocked        boolean not null default false,   -- si al resolver se bloqueó a la persona
  created_at     timestamptz not null default now()
);

create index if not exists retos_participantes_user_idx on public.retos_participantes (user_id);
create index if not exists retos_dias_reto_user_idx     on public.retos_dias (reto_id, user_id);
create index if not exists retos_created_by_idx          on public.retos (created_by);

alter table public.retos            enable row level security;
alter table public.retos_participantes enable row level security;
alter table public.retos_dias        enable row level security;
alter table public.retos_reportes    enable row level security;

-- Solo lo propio (creador, o donde ya soy participante) o público aprobado; admin ve todo.
-- Todo lo demás (quién más participa, nombres, marcas de días) pasa por funciones, nunca por
-- lectura directa de la tabla: así la anonimidad se decide en un solo lugar.
drop policy if exists "leer mis retos o publicos" on public.retos;
create policy "leer mis retos o publicos"
  on public.retos for select
  to authenticated
  using (
    created_by = auth.uid()
    or exists (select 1 from public.retos_participantes p where p.reto_id = retos.id and p.user_id = auth.uid())
    or (visibility = 'publico' and status = 'activo')
    or public.is_admin()
  );

drop policy if exists "leer mi fila de participante" on public.retos_participantes;
create policy "leer mi fila de participante"
  on public.retos_participantes for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "leer mis marcas de dia" on public.retos_dias;
create policy "leer mis marcas de dia"
  on public.retos_dias for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "leer mis reportes" on public.retos_reportes;
create policy "leer mis reportes" on public.retos_reportes for select
  to authenticated
  using (reported_by = auth.uid() or public.is_admin());

-- ───────────────────────── Ayudas ─────────────────────────

create or replace function public.gen_reto_code()
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
    exit when not exists (select 1 from public.retos where invite_code = code);
  end loop;
  return code;
end;
$$;

-- ¿Todos los participantes ACTIVOS de este reto son del mismo género? Si hay algún género nulo,
-- se trata como mixto (más prudente): mejor anónimo de más que revelar de menos.
create or replace function public.reto_mismo_genero(p_reto_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select count(distinct coalesce(pr.gender, 'x' || pp.user_id::text)) = 1
    from public.retos_participantes pp
    join public.profiles pr on pr.id = pp.user_id
   where pp.reto_id = p_reto_id and pp.status = 'activo';
$$;

-- ───────────────────────── Buscar para retar (mismo género) ─────────────────────────

-- Solo devuelve personas de TU MISMO género, activas, sin bloqueo de retos. Nunca el correo.
create or replace function public.buscar_usuarios_mismo_genero(p_query text)
returns table (user_id uuid, full_name text)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  my_gender text;
begin
  select gender into my_gender from public.profiles where id = auth.uid();
  if my_gender is null then
    return;
  end if;
  return query
    select p.id, p.full_name
      from public.profiles p
     where p.gender = my_gender
       and p.id <> auth.uid()
       and not p.disabled
       and (nullif(trim(p_query), '') is null or p.full_name ilike '%' || trim(p_query) || '%')
     order by p.full_name
     limit 30;
end;
$$;

-- ───────────────────────── Crear, invitar, responder ─────────────────────────

create or replace function public.crear_reto(
  p_title text, p_description text, p_kind text, p_area text, p_target_days int,
  p_visibility text, p_day_id text, p_invitado_inicial uuid default null
)
returns table (id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  new_id uuid;
  code text;
  v_days int := least(365, greatest(1, coalesce(p_target_days, 30)));
begin
  select p.id, p.disabled, p.retos_bloqueado into me from public.profiles p where p.id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa';
  end if;
  if me.retos_bloqueado then
    raise exception 'Tu cuenta está bloqueada para participar en retos';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Escribe el título del reto';
  end if;
  if p_kind not in ('cuidar', 'hacer') then
    raise exception 'Tipo no válido';
  end if;
  if p_visibility not in ('publico', 'privado') then
    raise exception 'Tipo de reto no válido';
  end if;
  if p_day_id is null or p_day_id = '' then
    raise exception 'Falta el día de hoy';
  end if;

  code := public.gen_reto_code();
  insert into public.retos (title, description, kind, area, target_days, visibility, status, invite_code, created_by)
  values (
    left(trim(p_title), 140), left(trim(coalesce(p_description, '')), 500), p_kind,
    left(coalesce(nullif(trim(p_area), ''), 'ben_adam'), 30), v_days, p_visibility,
    case when p_visibility = 'publico' then 'pendiente_admin' else 'activo' end,
    code, auth.uid()
  )
  returning retos.id into new_id;

  -- El creador se apunta de una vez, activo desde hoy.
  insert into public.retos_participantes (reto_id, user_id, status, start_day_id, joined_at, responded_at)
  values (new_id, auth.uid(), 'activo', p_day_id, now(), now());

  if p_invitado_inicial is not null and p_visibility = 'privado' then
    insert into public.retos_participantes (reto_id, user_id, status, invited_by)
    values (new_id, p_invitado_inicial, 'invitado', auth.uid())
    on conflict do nothing;
  end if;

  insert into public.audit_events (kind, user_id, detail)
  values ('reto_creado', auth.uid(), jsonb_build_object('reto', left(trim(p_title), 140), 'visibilidad', p_visibility));

  return query select new_id, code;
end;
$$;

create or replace function public.invitar_a_reto(p_reto_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select id, created_by, visibility from public.retos where id = p_reto_id into r;
  if r.id is null then
    raise exception 'Ese reto ya no existe';
  end if;
  if r.created_by <> auth.uid() and not public.is_admin() then
    raise exception 'Solo quien creó el reto puede invitar';
  end if;
  if r.visibility <> 'privado' then
    raise exception 'Los retos públicos no se invitan: se comparten';
  end if;
  if (select retos_bloqueado from public.profiles where id = p_user_id) then
    raise exception 'Esa persona no puede recibir retos ahora mismo';
  end if;
  insert into public.retos_participantes (reto_id, user_id, status, invited_by)
  values (p_reto_id, p_user_id, 'invitado', auth.uid())
  on conflict (reto_id, user_id) do update
    set status = 'invitado', invited_by = auth.uid(), responded_at = null
    where public.retos_participantes.status = 'rechazado';
end;
$$;

-- Responder una invitación directa (apareció en «Mis retos» porque alguien te invitó por nombre).
create or replace function public.responder_invitacion_reto(p_reto_id uuid, p_aceptar boolean, p_day_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select retos_bloqueado from public.profiles where id = auth.uid()) then
    raise exception 'Tu cuenta está bloqueada para participar en retos';
  end if;
  update public.retos_participantes
     set status = case when p_aceptar then 'activo' else 'rechazado' end,
         start_day_id = case when p_aceptar then p_day_id else start_day_id end,
         joined_at = case when p_aceptar then now() else joined_at end,
         responded_at = now()
   where reto_id = p_reto_id and user_id = auth.uid() and status = 'invitado';
  if not found then
    raise exception 'No tienes una invitación pendiente para ese reto';
  end if;
  insert into public.audit_events (kind, user_id, detail)
  values (case when p_aceptar then 'reto_aceptado' else 'reto_rechazado' end, auth.uid(),
          jsonb_build_object('reto', (select title from public.retos where id = p_reto_id)));
end;
$$;

-- ───────────────────────── El enlace de cada reto ─────────────────────────

create or replace function public.get_reto_by_code(p_code text)
returns table (
  id uuid, title text, description text, kind text, area text, target_days int,
  visibility text, status text, mi_estado text, creador_etiqueta text
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.title, r.description, r.kind, r.area, r.target_days, r.visibility, r.status,
         coalesce((select p.status from public.retos_participantes p where p.reto_id = r.id and p.user_id = auth.uid()), 'ninguno'),
         case
           when public.is_admin() then coalesce(nullif(pc.full_name, ''), pc.email)
           when pc.gender is not null and pc.gender = (select gender from public.profiles where id = auth.uid())
             then coalesce(nullif(pc.full_name, ''), 'Alguien')
           else 'Alguien'
         end
    from public.retos r
    join public.profiles pc on pc.id = r.created_by
   where r.invite_code = trim(p_code)
     and auth.uid() is not null
     and (r.created_by = auth.uid() or r.status = 'activo' or public.is_admin());
$$;

-- Unirse desde el enlace (privado: es la invitación misma; público: suscribirse). Sirve para
-- los dos casos y para «Retos públicos».
create or replace function public.unirse_reto_por_link(p_code text, p_day_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  me record;
begin
  select id, disabled, retos_bloqueado into me from public.profiles where id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa';
  end if;
  if me.retos_bloqueado then
    raise exception 'Tu cuenta está bloqueada para participar en retos';
  end if;
  select id, status, visibility, title into r from public.retos where invite_code = trim(p_code);
  if r.id is null or r.status <> 'activo' then
    raise exception 'Ese reto ya no está disponible';
  end if;
  if p_day_id is null or p_day_id = '' then
    raise exception 'Falta el día de hoy';
  end if;

  insert into public.retos_participantes (reto_id, user_id, status, start_day_id, joined_at, responded_at)
  values (r.id, auth.uid(), 'activo', p_day_id, now(), now())
  on conflict (reto_id, user_id) do update
    set status = 'activo', start_day_id = coalesce(public.retos_participantes.start_day_id, p_day_id),
        joined_at = coalesce(public.retos_participantes.joined_at, now()), responded_at = now()
    where public.retos_participantes.status in ('invitado', 'rechazado');

  insert into public.audit_events (kind, user_id, detail)
  values ('reto_aceptado', auth.uid(), jsonb_build_object('reto', r.title, 'via', 'enlace'));

  return r.id;
end;
$$;

-- ───────────────────────── Listas ─────────────────────────

-- «Mis retos»: los que creé, en los que participo, y las invitaciones que me mandaron por nombre.
create or replace function public.list_mis_retos()
returns table (
  id uuid, title text, description text, kind text, area text, target_days int,
  visibility text, status text, invite_code text, es_creador boolean, mi_estado text,
  mi_inicio text, aceptaron int, anonimo boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.title, r.description, r.kind, r.area, r.target_days, r.visibility, r.status,
         r.invite_code, r.created_by = auth.uid(), me.status, me.start_day_id,
         (select count(*)::int from public.retos_participantes a where a.reto_id = r.id and a.status = 'activo'),
         not public.reto_mismo_genero(r.id)
    from public.retos r
    join public.retos_participantes me on me.reto_id = r.id and me.user_id = auth.uid()
   order by r.created_at desc;
$$;

-- «Retos públicos»: para explorar y suscribirse. Siempre anónimo.
create or replace function public.list_retos_publicos()
returns table (
  id uuid, title text, description text, kind text, area text, target_days int,
  invite_code text, aceptaron int, ya_participo boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.title, r.description, r.kind, r.area, r.target_days, r.invite_code,
         (select count(*)::int from public.retos_participantes a where a.reto_id = r.id and a.status = 'activo'),
         exists (select 1 from public.retos_participantes p where p.reto_id = r.id and p.user_id = auth.uid() and p.status = 'activo')
    from public.retos r
   where r.visibility = 'publico' and r.status = 'activo' and auth.uid() is not null
   order by r.created_at desc
   limit 100;
$$;

-- ───────────────────────── Dentro de un reto ─────────────────────────

create or replace function public.marcar_dia_reto(p_reto_id uuid, p_day_id text, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select retos_bloqueado from public.profiles where id = auth.uid()) then
    raise exception 'Tu cuenta está bloqueada para participar en retos';
  end if;
  if p_status not in ('limpio', 'caida') then
    raise exception 'Estado no válido';
  end if;
  if not exists (select 1 from public.retos_participantes where reto_id = p_reto_id and user_id = auth.uid() and status = 'activo') then
    raise exception 'No participas en ese reto';
  end if;
  insert into public.retos_dias (reto_id, user_id, day_id, status)
  values (p_reto_id, auth.uid(), p_day_id, p_status)
  on conflict (reto_id, user_id, day_id) do update set status = excluded.status, marked_at = now();
end;
$$;

-- Los demás participantes activos de un reto PRIVADO: con nombre (mismo género) o anónimos
-- ("Retador 1", "Retador 2"...) si es mixto. Nunca se usa para retos públicos (ahí solo cuenta
-- el número, ver list_retos_publicos).
create or replace function public.list_participantes_reto(p_reto_id uuid, p_day_id text)
returns table (
  user_id uuid, etiqueta text, soy_yo boolean, dias_limpios int, dias_caida int,
  estado_hoy text, esperando boolean
)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  con_nombre boolean;
begin
  if not exists (select 1 from public.retos_participantes rp where rp.reto_id = p_reto_id and rp.user_id = auth.uid()) and not public.is_admin() then
    raise exception 'No participas en ese reto';
  end if;
  con_nombre := public.reto_mismo_genero(p_reto_id) or public.is_admin();

  return query
    with activos as (
      select p.user_id, p.start_day_id, pr.full_name,
             row_number() over (order by p.joined_at nulls last, p.created_at) as n
        from public.retos_participantes p
        join public.profiles pr on pr.id = p.user_id
       where p.reto_id = p_reto_id and p.status = 'activo'
    )
    select a.user_id,
           case when a.user_id = auth.uid() then 'Tú'
                when con_nombre then coalesce(nullif(a.full_name, ''), 'Alguien')
                else 'Retador ' || a.n end,
           a.user_id = auth.uid(),
           (select count(*)::int from public.retos_dias d where d.reto_id = p_reto_id and d.user_id = a.user_id and d.status = 'limpio'),
           (select count(*)::int from public.retos_dias d where d.reto_id = p_reto_id and d.user_id = a.user_id and d.status = 'caida'),
           (select d.status from public.retos_dias d where d.reto_id = p_reto_id and d.user_id = a.user_id and d.day_id = p_day_id),
           false
      from activos a
    union all
    select p.user_id, coalesce(nullif(pr.full_name, ''), 'Alguien') || ' (invitación enviada)', false, 0, 0, null, true
      from public.retos_participantes p
      join public.profiles pr on pr.id = p.user_id
     where p.reto_id = p_reto_id and p.status = 'invitado'
       and (public.is_admin() or exists (select 1 from public.retos r where r.id = p_reto_id and r.created_by = auth.uid()));
end;
$$;

create or replace function public.abandonar_reto(p_reto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.retos_participantes set status = 'abandonado'
   where reto_id = p_reto_id and user_id = auth.uid() and status = 'activo';
end;
$$;

-- ───────────────────────── Denunciar ─────────────────────────

create or replace function public.reportar_reto(p_reto_id uuid, p_reported_user uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.retos_participantes where reto_id = p_reto_id and user_id = auth.uid()) then
    raise exception 'Solo puedes denunciar en un reto donde participas';
  end if;
  if not exists (select 1 from public.retos_participantes where reto_id = p_reto_id and user_id = p_reported_user) then
    raise exception 'Esa persona no participa en este reto';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) < 1 then
    raise exception 'Escribe el motivo';
  end if;
  insert into public.retos_reportes (reto_id, reported_user, reported_by, reason)
  values (p_reto_id, p_reported_user, auth.uid(), left(trim(p_reason), 500));
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values ('reto_denunciado', p_reported_user, auth.uid(), jsonb_build_object('reto', (select title from public.retos where id = p_reto_id)));
end;
$$;

-- ───────────────────────── Admin ─────────────────────────

create or replace function public.list_retos_admin()
returns table (
  id uuid, title text, description text, visibility text, status text, created_by uuid,
  creador text, created_at timestamptz, participantes int
)
language sql
security definer
stable
set search_path = public
as $$
  select r.id, r.title, r.description, r.visibility, r.status, r.created_by,
         coalesce(nullif(pr.full_name, ''), pr.email), r.created_at,
         (select count(*)::int from public.retos_participantes a where a.reto_id = r.id and a.status = 'activo')
    from public.retos r
    join public.profiles pr on pr.id = r.created_by
   where public.is_admin()
   order by r.created_at desc
   limit 300;
$$;

create or replace function public.aprobar_reto(p_id uuid, p_aprobar boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  update public.retos set status = case when p_aprobar then 'activo' else 'rechazado_admin' end where id = p_id;
end;
$$;

create or replace function public.delete_reto_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  delete from public.retos where id = p_id;
end;
$$;

create or replace function public.list_reportes_retos()
returns table (
  id uuid, reto_id uuid, reto_titulo text, reported_user uuid, reported_nombre text,
  reported_by uuid, reporter_nombre text, reason text, resolved boolean, blocked boolean, created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select rr.id, rr.reto_id, r.title, rr.reported_user, coalesce(nullif(pu.full_name,''), pu.email),
         rr.reported_by, coalesce(nullif(pb.full_name,''), pb.email), rr.reason, rr.resolved, rr.blocked, rr.created_at
    from public.retos_reportes rr
    join public.retos r on r.id = rr.reto_id
    join public.profiles pu on pu.id = rr.reported_user
    join public.profiles pb on pb.id = rr.reported_by
   where public.is_admin()
   order by rr.resolved asc, rr.created_at desc;
$$;

create or replace function public.resolver_reporte(p_id uuid, p_bloquear boolean)
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
  select reported_user into target from public.retos_reportes where id = p_id;
  update public.retos_reportes
     set resolved = true, resolved_at = now(), resolved_by = auth.uid(), blocked = coalesce(p_bloquear, false)
   where id = p_id;
  if p_bloquear then
    update public.profiles set retos_bloqueado = true where id = target;
    insert into public.audit_events (kind, user_id, actor_id, detail)
    values ('reto_usuario_bloqueado', target, auth.uid(), '{}'::jsonb);
  end if;
end;
$$;

create or replace function public.set_retos_bloqueado_by_email(p_email text, p_bloqueado boolean)
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
    raise exception 'No hay ninguna cuenta con ese correo';
  end if;
  update public.profiles set retos_bloqueado = p_bloqueado where id = target;
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values (case when p_bloqueado then 'reto_usuario_bloqueado' else 'reto_usuario_desbloqueado' end, target, auth.uid(), '{}'::jsonb);
end;
$$;

-- ───────────────────────── Permisos ─────────────────────────

revoke all on function public.buscar_usuarios_mismo_genero(text)                    from public, anon;
revoke all on function public.crear_reto(text, text, text, text, int, text, text, uuid) from public, anon;
revoke all on function public.invitar_a_reto(uuid, uuid)                            from public, anon;
revoke all on function public.responder_invitacion_reto(uuid, boolean, text)        from public, anon;
revoke all on function public.get_reto_by_code(text)                                from public, anon;
revoke all on function public.unirse_reto_por_link(text, text)                      from public, anon;
revoke all on function public.list_mis_retos()                                      from public, anon;
revoke all on function public.list_retos_publicos()                                 from public, anon;
revoke all on function public.marcar_dia_reto(uuid, text, text)                     from public, anon;
revoke all on function public.list_participantes_reto(uuid, text)                   from public, anon;
revoke all on function public.abandonar_reto(uuid)                                  from public, anon;
revoke all on function public.reportar_reto(uuid, uuid, text)                       from public, anon;
revoke all on function public.list_retos_admin()                                    from public, anon;
revoke all on function public.aprobar_reto(uuid, boolean)                           from public, anon;
revoke all on function public.delete_reto_admin(uuid)                               from public, anon;
revoke all on function public.list_reportes_retos()                                 from public, anon;
revoke all on function public.resolver_reporte(uuid, boolean)                       from public, anon;
revoke all on function public.set_retos_bloqueado_by_email(text, boolean)           from public, anon;

grant execute on function public.buscar_usuarios_mismo_genero(text)                    to authenticated;
grant execute on function public.crear_reto(text, text, text, text, int, text, text, uuid) to authenticated;
grant execute on function public.invitar_a_reto(uuid, uuid)                            to authenticated;
grant execute on function public.responder_invitacion_reto(uuid, boolean, text)        to authenticated;
grant execute on function public.get_reto_by_code(text)                                to authenticated;
grant execute on function public.unirse_reto_por_link(text, text)                      to authenticated;
grant execute on function public.list_mis_retos()                                      to authenticated;
grant execute on function public.list_retos_publicos()                                 to authenticated;
grant execute on function public.marcar_dia_reto(uuid, text, text)                     to authenticated;
grant execute on function public.list_participantes_reto(uuid, text)                   to authenticated;
grant execute on function public.abandonar_reto(uuid)                                  to authenticated;
grant execute on function public.reportar_reto(uuid, uuid, text)                       to authenticated;
grant execute on function public.list_retos_admin()                                    to authenticated;
grant execute on function public.aprobar_reto(uuid, boolean)                           to authenticated;
grant execute on function public.delete_reto_admin(uuid)                               to authenticated;
grant execute on function public.list_reportes_retos()                                 to authenticated;
grant execute on function public.resolver_reporte(uuid, boolean)                       to authenticated;
grant execute on function public.set_retos_bloqueado_by_email(text, boolean)           to authenticated;
