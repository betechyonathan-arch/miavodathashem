-- ============================================================================
--  Avodah — enlaces personales de invitación
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de schema.sql.
--  Es seguro correrlo más de una vez (no rompe nada si ya se aplicó).
--
--  Cada persona tiene un código y un enlace propio. Quien se registra con ese enlace
--  queda asociado a quien la invitó, y quien invitó solo puede ver UN NÚMERO:
--  cuántas personas entraron con su enlace. Nunca quiénes son.
-- ============================================================================

alter table public.profiles add column if not exists referral_code text;
alter table public.profiles add column if not exists referred_by   uuid references public.profiles(id) on delete set null;

create unique index if not exists profiles_referral_code_key on public.profiles (referral_code);

-- Código corto de 8 caracteres, sin letras que se confunden (i, l, o, 0, 1).
-- No es un secreto: solo identifica a quien invita.
create or replace function public.gen_referral_code()
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
    for i in 1..8 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$;

-- Las cuentas que ya existen reciben su código.
update public.profiles set referral_code = public.gen_referral_code() where referral_code is null;

-- Al registrarse: se crea el perfil con su propio código y, si vino con el enlace de alguien,
-- queda asociado a esa persona. Un código que no existe simplemente se ignora.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inviter uuid;
begin
  select id into inviter
    from public.profiles
   where referral_code = lower(nullif(trim(new.raw_user_meta_data ->> 'ref'), ''))
   limit 1;

  insert into public.profiles (id, email, full_name, gender, referral_code, referred_by)
  values (
    new.id,
    new.email,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    case when new.raw_user_meta_data ->> 'gender' in ('hombre', 'mujer')
         then new.raw_user_meta_data ->> 'gender' end,
    public.gen_referral_code(),
    inviter
  );
  return new;
end;
$$;

-- Lo único que ve cada persona: su propio código y cuántas personas entraron con él.
create or replace function public.my_referral_stats()
returns table (code text, referred_count int)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
     set referral_code = public.gen_referral_code()
   where id = auth.uid() and referral_code is null;

  return query
    select p.referral_code,
           (select count(*)::int from public.profiles r where r.referred_by = p.id)
      from public.profiles p
     where p.id = auth.uid();
end;
$$;

revoke all on function public.my_referral_stats() from public, anon;
grant execute on function public.my_referral_stats() to authenticated;
revoke all on function public.gen_referral_code()   from public, anon, authenticated;
