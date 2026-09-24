-- ============================================================================
--  Avodah — aportes de la comunidad (dvar Torá, musar, pirush) y "actividad" del panel
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql,
--  referidos.sql y admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Qué agrega:
--   · `aportes`: lo que cualquier persona propone (nombre o anónimo). Nace "pendiente";
--     solo cuando un admin lo aprueba lo ven todos. Lo que manda un admin nace aprobado.
--   · Un aporte aprobado puede ponerse en la pantalla de entrada (`featured`), en lugar del lema.
--   · La bitácora del panel ahora también dice "X registró algo" (`actividad`), sin decir QUÉ.
--
--  Privacidad: el autor de un aporte anónimo NUNCA sale en la vista pública (`aportes_publicos`).
--  Solo el admin ve quién lo mandó, para poder revisarlo.
-- ============================================================================

create table if not exists public.aportes (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid references public.profiles(id) on delete set null,
  author_name text not null default '',            -- el nombre al momento de enviar
  anonymous   boolean not null default false,
  kind        text not null check (kind in ('dvar', 'musar', 'pirush')),
  title       text not null default '' check (char_length(title) <= 120),
  body        text not null check (char_length(body) between 10 and 6000),
  source      text not null default '' check (char_length(source) <= 160),
  status      text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  featured    boolean not null default false,      -- en la pantalla de entrada (solo uno a la vez)
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

-- Si la tabla ya existía con el tope viejo de 2000, se sube a 6000 (idempotente).
do $$
begin
  alter table public.aportes drop constraint if exists aportes_body_check;
  alter table public.aportes add constraint aportes_body_check check (char_length(body) between 10 and 6000);
end $$;

create index if not exists aportes_status_idx on public.aportes (status, created_at desc);

alter table public.aportes enable row level security;

-- Leer la tabla directa: solo lo propio o ser admin. Nadie escribe directo (solo las funciones).
drop policy if exists "leer aportes propios o ser admin" on public.aportes;
create policy "leer aportes propios o ser admin"
  on public.aportes for select
  using (author_id = auth.uid() or public.is_admin());

-- Lo que ve todo el mundo: solo lo aprobado, y sin el autor si es anónimo.
create or replace view public.aportes_publicos as
  select id, kind, title, body, source,
         case when anonymous then null else nullif(author_name, '') end as author_name,
         featured, created_at
    from public.aportes
   where status = 'aprobado';

revoke all on public.aportes_publicos from public, anon;
grant select on public.aportes_publicos to authenticated;

-- ───────────────────────── Enviar un aporte ─────────────────────────

create or replace function public.submit_aporte(
  p_kind text, p_title text, p_body text, p_source text, p_anonymous boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me       record;
  is_adm   boolean := public.is_admin();
  new_id   uuid;
  v_body   text := trim(coalesce(p_body, ''));
begin
  select id, full_name, email, disabled into me from public.profiles where id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa para publicar';
  end if;
  if p_kind not in ('dvar', 'musar', 'pirush') then
    raise exception 'Tipo no válido';
  end if;
  if char_length(v_body) < 10 then
    raise exception 'Escribe un poco más: mínimo 10 letras';
  end if;
  if char_length(v_body) > 6000 then
    raise exception 'Máximo 6000 letras';
  end if;
  if not is_adm and (select count(*) from public.aportes where author_id = me.id and status = 'pendiente') >= 5 then
    raise exception 'Ya tienes 5 aportes esperando revisión. Espera a que el admin los revise.';
  end if;

  insert into public.aportes (author_id, author_name, anonymous, kind, title, body, source, status, reviewed_at, reviewed_by)
  values (
    me.id,
    coalesce(nullif(me.full_name, ''), me.email),
    coalesce(p_anonymous, false),
    p_kind,
    left(trim(coalesce(p_title, '')), 120),
    v_body,
    left(trim(coalesce(p_source, '')), 160),
    case when is_adm then 'aprobado' else 'pendiente' end,
    case when is_adm then now() end,
    case when is_adm then me.id end
  )
  returning id into new_id;

  insert into public.audit_events (kind, user_id, detail)
  values ('aporte_enviado', me.id, jsonb_build_object('nombre', me.full_name, 'correo', me.email, 'tipo', p_kind, 'directo', is_adm));

  return new_id;
end;
$$;

-- ───────────────────────── Acciones de admin ─────────────────────────

create or replace function public.review_aporte(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  select author_id, kind into a from public.aportes where id = p_id;
  if not found then
    raise exception 'Ese aporte ya no existe';
  end if;
  update public.aportes
     set status      = case when p_approve then 'aprobado' else 'rechazado' end,
         featured    = case when p_approve then featured else false end,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   where id = p_id;
  insert into public.audit_events (kind, user_id, actor_id, detail)
  values (case when p_approve then 'aporte_aprobado' else 'aporte_rechazado' end,
          a.author_id, auth.uid(), jsonb_build_object('tipo', a.kind));
end;
$$;

-- Pone (o quita) un aporte aprobado en la pantalla de entrada. Solo hay uno a la vez.
create or replace function public.feature_aporte(p_id uuid, p_featured boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  a record;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  select status, char_length(body) as n into a from public.aportes where id = p_id;
  if not found then
    raise exception 'Ese aporte ya no existe';
  end if;
  if p_featured then
    if a.status <> 'aprobado' then
      raise exception 'Primero apruébalo';
    end if;
    -- Sin tope de largo: si es más de 400 letras, la pantalla de entrada lo muestra resumido con
    -- un botón para ver completo (ver src/components/Splash.tsx, SPLASH_MAX en lib/aportes.ts).
    update public.aportes set featured = false where featured;
  end if;
  update public.aportes set featured = p_featured where id = p_id;
end;
$$;

-- Borra un aporte: el admin cualquiera; cada persona, solo los suyos.
create or replace function public.delete_aporte(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    delete from public.aportes where id = p_id;
  else
    delete from public.aportes where id = p_id and author_id = auth.uid();
  end if;
end;
$$;

-- ───────────────────── "X registró algo" (sin decir qué) ─────────────────────
-- La app la llama cuando alguien guarda un registro. Solo llega "esta persona registró algo":
-- nada del contenido. Varios registros seguidos (10 min) se juntan en un solo renglón.

create or replace function public.log_activity()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  last_id bigint;
  who     record;
begin
  if auth.uid() is null then
    return;
  end if;
  select id into last_id
    from public.audit_events
   where kind = 'actividad' and user_id = auth.uid() and at > now() - interval '10 minutes'
   order by at desc
   limit 1;
  if last_id is not null then
    update public.audit_events
       set at = now(),
           detail = jsonb_set(detail, '{veces}', to_jsonb(coalesce((detail ->> 'veces')::int, 1) + 1))
     where id = last_id;
  else
    select full_name, email into who from public.profiles where id = auth.uid();
    insert into public.audit_events (kind, user_id, detail)
    values ('actividad', auth.uid(), jsonb_build_object('nombre', who.full_name, 'correo', who.email, 'veces', 1));
  end if;
end;
$$;

-- Solo usuarios con sesión (nunca anónimos).
revoke all on function public.submit_aporte(text, text, text, text, boolean) from public, anon;
revoke all on function public.review_aporte(uuid, boolean)                   from public, anon;
revoke all on function public.feature_aporte(uuid, boolean)                  from public, anon;
revoke all on function public.delete_aporte(uuid)                            from public, anon;
revoke all on function public.log_activity()                                 from public, anon;
grant execute on function public.submit_aporte(text, text, text, text, boolean) to authenticated;
grant execute on function public.review_aporte(uuid, boolean)                   to authenticated;
grant execute on function public.feature_aporte(uuid, boolean)                  to authenticated;
grant execute on function public.delete_aporte(uuid)                            to authenticated;
grant execute on function public.log_activity()                                 to authenticated;
