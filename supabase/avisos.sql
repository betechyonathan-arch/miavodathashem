-- ============================================================================
--  Avodah — avisos del admin para todos
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql.
--  Es seguro correrlo más de una vez.
--
--  Un admin escribe un aviso y sale arriba, en «Hoy» y en «¿Cómo estoy?», para todas las
--  personas. Solo un admin lo crea, lo edita, lo oculta o lo borra. Todos los ven mientras
--  esté activo.
-- ============================================================================

create table if not exists public.avisos (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '' check (char_length(title) <= 120),
  body       text not null check (char_length(body) between 1 and 1000),
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

alter table public.avisos enable row level security;

-- Todos leen lo activo; el admin lee además lo oculto. Nadie escribe directo: solo las funciones.
drop policy if exists "leer avisos activos o ser admin" on public.avisos;
create policy "leer avisos activos o ser admin"
  on public.avisos for select
  using (active or public.is_admin());

-- Crea un aviso (p_id nulo) o edita uno que ya existe.
create or replace function public.save_aviso(p_id uuid, p_title text, p_body text, p_active boolean)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_body  text := trim(coalesce(p_body, ''));
  new_id  uuid := p_id;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if char_length(v_body) < 1 then
    raise exception 'Escribe el texto del aviso';
  end if;
  if char_length(v_body) > 1000 then
    raise exception 'Máximo 1000 letras';
  end if;

  if p_id is null then
    insert into public.avisos (title, body, active, created_by)
    values (left(trim(coalesce(p_title, '')), 120), v_body, coalesce(p_active, true), auth.uid())
    returning id into new_id;
  else
    update public.avisos
       set title      = left(trim(coalesce(p_title, '')), 120),
           body       = v_body,
           active     = coalesce(p_active, active),
           updated_at = now()
     where id = p_id;
    if not found then
      raise exception 'Ese aviso ya no existe';
    end if;
  end if;
  return new_id;
end;
$$;

create or replace function public.delete_aviso(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  delete from public.avisos where id = p_id;
end;
$$;

revoke all on function public.save_aviso(uuid, text, text, boolean) from public, anon;
revoke all on function public.delete_aviso(uuid)                     from public, anon;
grant execute on function public.save_aviso(uuid, text, text, boolean) to authenticated;
grant execute on function public.delete_aviso(uuid)                     to authenticated;
