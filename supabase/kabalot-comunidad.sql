-- ============================================================================
--  Avodah — kabalot para todo el público
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql y
--  admin-auditoria.sql. Es seguro correrlo más de una vez.
--
--  Un admin crea y edita kabalot abiertas a todos («no hablar lashón hará de esa persona hasta
--  después de Sucot»). Cada persona toca «Acepto» y se suma; todos ven CUÁNTAS personas la
--  aceptaron (solo el número, nunca quiénes). El seguimiento diario de cada quien —si hoy
--  cumplió o no— vive solo en su dispositivo, igual que el resto de su diario.
--
--  Además: se quita «no estás solo» (community_presence), que ya no se usa.
-- ============================================================================

drop function if exists public.community_presence();

create table if not exists public.kabalot_comunidad (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 3 and 140),
  he            text not null default '' check (char_length(he) <= 140),
  blurb         text not null default '' check (char_length(blurb) <= 800),
  kavana        text not null default '' check (char_length(kavana) <= 300),
  subject_label text not null default '' check (char_length(subject_label) <= 160),  -- si no está vacío, se le pregunta a quien acepta
  pasuk_he      text not null default '' check (char_length(pasuk_he) <= 400),
  pasuk_es      text not null default '' check (char_length(pasuk_es) <= 400),
  pasuk_ref     text not null default '' check (char_length(pasuk_ref) <= 80),
  kind          text not null default 'cuidar' check (kind in ('cuidar', 'hacer')),
  area          text not null default 'ben_adam' check (char_length(area) <= 30),
  ends_on       date not null,                           -- último día de la kabalá (incluido)
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null
);

create table if not exists public.kabalot_comunidad_aceptaciones (
  kabala_id   uuid not null references public.kabalot_comunidad(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz not null default now(),
  primary key (kabala_id, user_id)
);

alter table public.kabalot_comunidad enable row level security;
alter table public.kabalot_comunidad_aceptaciones enable row level security;

-- Nadie lee ni escribe directo: todo pasa por las funciones de abajo (que saben quién llama).
drop policy if exists "leer kabalot comunidad" on public.kabalot_comunidad;
create policy "leer kabalot comunidad"
  on public.kabalot_comunidad for select
  to authenticated
  using (active or public.is_admin());

drop policy if exists "leer mis aceptaciones" on public.kabalot_comunidad_aceptaciones;
create policy "leer mis aceptaciones"
  on public.kabalot_comunidad_aceptaciones for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ───────────────────────── Lo que ve la gente ─────────────────────────

-- Las kabalot abiertas (el admin ve también las ocultas), con cuántas personas la aceptaron y si
-- quien pregunta ya la aceptó. Del conteo solo sale el número.
create or replace function public.list_kabalot_comunidad()
returns table (
  id uuid, title text, he text, blurb text, kavana text, subject_label text,
  pasuk_he text, pasuk_es text, pasuk_ref text, kind text, area text,
  ends_on date, active boolean, aceptaron int, acepte boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select k.id, k.title, k.he, k.blurb, k.kavana, k.subject_label,
         k.pasuk_he, k.pasuk_es, k.pasuk_ref, k.kind, k.area,
         k.ends_on, k.active,
         (select count(*)::int from public.kabalot_comunidad_aceptaciones a where a.kabala_id = k.id),
         exists (select 1 from public.kabalot_comunidad_aceptaciones a where a.kabala_id = k.id and a.user_id = auth.uid())
    from public.kabalot_comunidad k
   where auth.uid() is not null
     and (k.active or public.is_admin())
   order by k.created_at desc;
$$;

-- «Acepto». Se puede repetir sin problema (no cuenta dos veces).
create or replace function public.accept_kabala_comunidad(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  k  record;
  n  int;
begin
  select id, full_name, email, disabled into me from public.profiles where id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa';
  end if;
  select id, title, active, ends_on into k from public.kabalot_comunidad where id = p_id;
  if not found or not k.active then
    raise exception 'Esa kabalá ya no está disponible';
  end if;
  if k.ends_on < current_date - 1 then
    raise exception 'Esta kabalá ya terminó';
  end if;

  insert into public.kabalot_comunidad_aceptaciones (kabala_id, user_id)
  values (p_id, me.id)
  on conflict do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    insert into public.audit_events (kind, user_id, detail)
    values ('kabala_aceptada', me.id, jsonb_build_object('nombre', me.full_name, 'correo', me.email, 'kabala', k.title));
  end if;
end;
$$;

-- ───────────────────────── Acciones de admin ─────────────────────────

create or replace function public.save_kabala_comunidad(
  p_id uuid, p_title text, p_he text, p_blurb text, p_kavana text, p_subject_label text,
  p_pasuk_he text, p_pasuk_es text, p_pasuk_ref text, p_kind text, p_area text,
  p_ends_on date, p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := p_id;
  v_title text := left(trim(coalesce(p_title, '')), 140);
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if char_length(v_title) < 3 then
    raise exception 'Escribe el título de la kabalá';
  end if;
  if p_ends_on is null then
    raise exception 'Elige hasta qué día dura';
  end if;
  if p_kind not in ('cuidar', 'hacer') then
    raise exception 'Tipo no válido';
  end if;

  if p_id is null then
    insert into public.kabalot_comunidad
      (title, he, blurb, kavana, subject_label, pasuk_he, pasuk_es, pasuk_ref, kind, area, ends_on, active, created_by)
    values
      (v_title, left(trim(coalesce(p_he, '')), 140), left(trim(coalesce(p_blurb, '')), 800),
       left(trim(coalesce(p_kavana, '')), 300), left(trim(coalesce(p_subject_label, '')), 160),
       left(trim(coalesce(p_pasuk_he, '')), 400), left(trim(coalesce(p_pasuk_es, '')), 400),
       left(trim(coalesce(p_pasuk_ref, '')), 80), p_kind, left(coalesce(nullif(trim(p_area), ''), 'ben_adam'), 30),
       p_ends_on, coalesce(p_active, true), auth.uid())
    returning id into new_id;
  else
    update public.kabalot_comunidad
       set title = v_title,
           he = left(trim(coalesce(p_he, '')), 140),
           blurb = left(trim(coalesce(p_blurb, '')), 800),
           kavana = left(trim(coalesce(p_kavana, '')), 300),
           subject_label = left(trim(coalesce(p_subject_label, '')), 160),
           pasuk_he = left(trim(coalesce(p_pasuk_he, '')), 400),
           pasuk_es = left(trim(coalesce(p_pasuk_es, '')), 400),
           pasuk_ref = left(trim(coalesce(p_pasuk_ref, '')), 80),
           kind = p_kind,
           area = left(coalesce(nullif(trim(p_area), ''), 'ben_adam'), 30),
           ends_on = p_ends_on,
           active = coalesce(p_active, active),
           updated_at = now()
     where id = p_id;
    if not found then
      raise exception 'Esa kabalá ya no existe';
    end if;
  end if;
  return new_id;
end;
$$;

create or replace function public.delete_kabala_comunidad(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  delete from public.kabalot_comunidad where id = p_id;   -- las aceptaciones se borran en cascada
end;
$$;

revoke all on function public.list_kabalot_comunidad()          from public, anon;
revoke all on function public.accept_kabala_comunidad(uuid)     from public, anon;
revoke all on function public.save_kabala_comunidad(uuid, text, text, text, text, text, text, text, text, text, text, date, boolean) from public, anon;
revoke all on function public.delete_kabala_comunidad(uuid)     from public, anon;
grant execute on function public.list_kabalot_comunidad()       to authenticated;
grant execute on function public.accept_kabala_comunidad(uuid)  to authenticated;
grant execute on function public.save_kabala_comunidad(uuid, text, text, text, text, text, text, text, text, text, text, date, boolean) to authenticated;
grant execute on function public.delete_kabala_comunidad(uuid) to authenticated;

-- ───────────────────── La primera kabalá (solo si todavía no hay ninguna) ─────────────────────

insert into public.kabalot_comunidad
  (title, he, blurb, kavana, subject_label, pasuk_he, pasuk_es, pasuk_ref, kind, area, ends_on)
select
  'No hablar lashón hará de la persona que más me cae mal',
  'שְׁמִירַת הַלָּשׁוֹן',
  'Piensa en la persona que más te cae mal de todo el mundo. Desde hoy y hasta después de Sucot, no hablarás lashón hará de ella: ni contarlo, ni criticarla, ni dejar que otros lo hagan delante de ti. Cada día que lo cumples, suma. Si un día caes, lo que sigue es el regreso: mañana empiezas de nuevo.',
  'Que mi boca sea para bendecir, incluso a quien más me cuesta.',
  '¿Quién es? (opcional: solo tú lo ves y se queda en tu dispositivo)',
  'נְצֹר לְשׁוֹנְךָ מֵרָע וּשְׂפָתֶיךָ מִדַּבֵּר מִרְמָה. סוּר מֵרָע וַעֲשֵׂה טוֹב בַּקֵּשׁ שָׁלוֹם וְרָדְפֵהוּ.',
  'Guarda tu lengua del mal y tus labios de hablar engaño. Apártate del mal y haz el bien; busca la paz y persíguela.',
  'Tehilim 34:14-15',
  'cuidar',
  'speech',
  date '2026-10-04'   -- Simjat Torá (diáspora): el cierre de la temporada de Sucot. El admin puede cambiarla.
where not exists (select 1 from public.kabalot_comunidad);
