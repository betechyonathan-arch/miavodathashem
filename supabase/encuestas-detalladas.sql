-- ============================================================================
--  Avodah — encuestas detalladas
--
--  Se pega UNA vez en Supabase → SQL Editor → New query → Run, DESPUÉS de encuestas.sql.
--  Es seguro correrlo más de una vez. No borra ninguna encuesta ni respuesta: las que ya
--  existen se convierten solas al formato nuevo (una encuesta de una sola pregunta).
--  Después de este, ya no se vuelve a correr encuestas.sql (este lo reemplaza).
--
--  Lo nuevo:
--   · Varias preguntas por encuesta, de 5 tipos: escala, texto libre, opción única, varias
--     opciones y sí/no. Cada pregunta puede ser obligatoria u opcional.
--   · Para quién es: todos, solo hombres, solo mujeres, o UNA persona. La encuesta personal la
--     ve esa persona igual que cualquier otra: no sabe que es solo para ella (no ve cuántos
--     respondieron ni nada que lo delate).
--   · Anónima (la decide el admin): si está marcada, ni el admin ve quién respondió qué; solo
--     los resultados juntos. Una vez que una encuesta anónima tiene respuestas, ya no se puede
--     volver con nombre. Una encuesta personal nunca es anónima.
-- ============================================================================

alter table public.encuestas add column if not exists audiencia   text    not null default 'todos';
alter table public.encuestas add column if not exists target_user uuid    references public.profiles(id) on delete cascade;
alter table public.encuestas add column if not exists anonima     boolean not null default false;
alter table public.encuestas add column if not exists preguntas   jsonb   not null default '[]'::jsonb;

alter table public.encuestas drop constraint if exists encuestas_audiencia_valida;
alter table public.encuestas add constraint encuestas_audiencia_valida
  check (audiencia in ('todos', 'hombres', 'mujeres', 'persona'));

-- La explicación puede ser más larga (antes 500).
alter table public.encuestas drop constraint if exists encuestas_description_check;
alter table public.encuestas drop constraint if exists encuestas_description_largo;
alter table public.encuestas add constraint encuestas_description_largo check (char_length(description) <= 2000);

alter table public.encuestas_respuestas add column if not exists valores jsonb;

-- Las encuestas que ya existían: una sola pregunta (la del título), con el mismo tipo y escala.
update public.encuestas
   set preguntas = jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
         'id', 'p1', 'tipo', kind, 'texto', '', 'obligatoria', true,
         'min', case when kind = 'escala' then scale_min end,
         'max', case when kind = 'escala' then scale_max end)))
 where preguntas = '[]'::jsonb;

update public.encuestas_respuestas
   set valores = jsonb_strip_nulls(jsonb_build_object('p1', coalesce(to_jsonb(valor_num), to_jsonb(valor_texto))))
 where valores is null;

-- Nadie lee la tabla directo (ni siquiera las activas): todo pasa por las funciones de abajo,
-- que saben para quién es cada encuesta. Así una encuesta personal no se asoma a nadie más.
drop policy if exists "leer encuestas activas o ser admin" on public.encuestas;
drop policy if exists "solo admin lee encuestas" on public.encuestas;
create policy "solo admin lee encuestas"
  on public.encuestas for select
  to authenticated
  using (public.is_admin());

-- ¿Esta encuesta es para quien llama? (por audiencia y género, o por ser la persona elegida)
create or replace function public.encuesta_es_para_mi(p_audiencia text, p_target uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select case p_audiencia
           when 'todos'   then auth.uid() is not null
           when 'hombres' then exists (select 1 from public.profiles where id = auth.uid() and gender = 'hombre')
           when 'mujeres' then exists (select 1 from public.profiles where id = auth.uid() and gender = 'mujer')
           when 'persona' then p_target = auth.uid()
           else false
         end;
$$;

-- ───────────────────────── Lo que ve la gente ─────────────────────────

-- Cada persona recibe solo las encuestas abiertas que son para ella. El admin recibe todas (para su
-- panel), con `para_mi` diciendo cuáles le tocan a él mismo. Para quién es y si es personal solo lo
-- ve el admin; en una encuesta personal nadie más ve cuántos respondieron.
drop function if exists public.list_encuestas();
create function public.list_encuestas()
returns table (
  id uuid, title text, description text, kind text, scale_min int, scale_max int, active boolean,
  respuestas int, promedio numeric, respondi boolean, mi_valor_num int, mi_valor_texto text,
  preguntas jsonb, anonima boolean, mis_valores jsonb, para_mi boolean,
  audiencia text, target_user uuid, created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select e.id, e.title, e.description, e.kind, e.scale_min, e.scale_max, e.active,
         case when e.audiencia = 'persona' and not public.is_admin() then null
              else (select count(*)::int from public.encuestas_respuestas r where r.encuesta_id = e.id) end,
         case when e.audiencia = 'persona' and not public.is_admin() then null
              when jsonb_array_length(e.preguntas) = 1 and e.preguntas -> 0 ->> 'tipo' = 'escala' then
                (select round(avg((r.valores ->> (e.preguntas -> 0 ->> 'id'))::numeric), 1)
                   from public.encuestas_respuestas r
                  where r.encuesta_id = e.id and jsonb_typeof(r.valores -> (e.preguntas -> 0 ->> 'id')) = 'number')
         end,
         exists (select 1 from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid()),
         (select r.valor_num from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid()),
         (select r.valor_texto from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid()),
         e.preguntas,
         e.anonima,
         (select r.valores from public.encuestas_respuestas r where r.encuesta_id = e.id and r.user_id = auth.uid()),
         public.encuesta_es_para_mi(e.audiencia, e.target_user),
         case when public.is_admin() then e.audiencia end,
         case when public.is_admin() then e.target_user end,
         e.created_at
    from public.encuestas e
   where auth.uid() is not null
     and (public.is_admin() or (e.active and public.encuesta_es_para_mi(e.audiencia, e.target_user)))
   order by e.created_at desc;
$$;

-- Responder (o cambiar mis respuestas). `p_valores` = { id_de_pregunta: respuesta }.
create or replace function public.responder_encuesta(p_id uuid, p_valores jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me record;
  e  record;
  q  jsonb;
  qid text;
  tipo text;
  v  jsonb;
  vacio boolean;
  limpio jsonb := '{}'::jsonb;
  etiqueta text;
  n  numeric;
  ya_habia boolean;
  unica jsonb;
begin
  select id, full_name, email, disabled into me from public.profiles where id = auth.uid();
  if me.id is null or me.disabled then
    raise exception 'Necesitas una cuenta activa';
  end if;
  select * into e from public.encuestas where id = p_id;
  if not found or not e.active or not public.encuesta_es_para_mi(e.audiencia, e.target_user) then
    raise exception 'Esa encuesta ya no está disponible';
  end if;
  if p_valores is null or jsonb_typeof(p_valores) <> 'object' then
    p_valores := '{}'::jsonb;
  end if;

  for q in select * from jsonb_array_elements(e.preguntas) loop
    qid  := q ->> 'id';
    tipo := q ->> 'tipo';
    v    := p_valores -> qid;
    etiqueta := coalesce(nullif(q ->> 'texto', ''), e.title);
    vacio := v is null
          or jsonb_typeof(v) = 'null'
          or (jsonb_typeof(v) = 'string' and trim(v #>> '{}') = '')
          or (jsonb_typeof(v) = 'array' and jsonb_array_length(v) = 0);
    if vacio then
      if coalesce((q ->> 'obligatoria')::boolean, true) then
        raise exception 'Falta responder: %', etiqueta;
      end if;
      continue;
    end if;

    if tipo = 'escala' then
      if jsonb_typeof(v) <> 'number' then
        raise exception 'Elige un número en: %', etiqueta;
      end if;
      n := (v #>> '{}')::numeric;
      if n <> trunc(n) or n < (q ->> 'min')::int or n > (q ->> 'max')::int then
        raise exception 'Elige un número entre % y % en: %', q ->> 'min', q ->> 'max', etiqueta;
      end if;
    elsif tipo = 'texto' then
      if jsonb_typeof(v) <> 'string' or char_length(v #>> '{}') > 2000 then
        raise exception 'La respuesta es demasiado larga en: %', etiqueta;
      end if;
      v := to_jsonb(trim(v #>> '{}'));
    elsif tipo = 'opcion' then
      if jsonb_typeof(v) <> 'string' or not ((q -> 'opciones') ? (v #>> '{}')) then
        raise exception 'Elige una de las opciones en: %', etiqueta;
      end if;
    elsif tipo = 'multiple' then
      if jsonb_typeof(v) <> 'array' then
        raise exception 'Elige las opciones en: %', etiqueta;
      end if;
      for unica in select * from jsonb_array_elements(v) loop
        if jsonb_typeof(unica) <> 'string' or not ((q -> 'opciones') ? (unica #>> '{}')) then
          raise exception 'Elige solo de las opciones en: %', etiqueta;
        end if;
      end loop;
      select coalesce(jsonb_agg(distinct x), '[]'::jsonb) into v from jsonb_array_elements(v) x;
    elsif tipo = 'sino' then
      if jsonb_typeof(v) <> 'string' or (v #>> '{}') not in ('si', 'no') then
        raise exception 'Responde sí o no en: %', etiqueta;
      end if;
    else
      continue;
    end if;
    limpio := limpio || jsonb_build_object(qid, v);
  end loop;

  select exists (select 1 from public.encuestas_respuestas where encuesta_id = p_id and user_id = me.id) into ya_habia;

  -- valor_num / valor_texto: copia de compatibilidad cuando la encuesta es de una sola pregunta.
  insert into public.encuestas_respuestas (encuesta_id, user_id, valores, valor_num, valor_texto, answered_at)
  values (
    p_id, me.id, limpio,
    case when jsonb_array_length(e.preguntas) = 1 and jsonb_typeof(limpio -> (e.preguntas -> 0 ->> 'id')) = 'number'
         then (limpio ->> (e.preguntas -> 0 ->> 'id'))::int end,
    case when jsonb_array_length(e.preguntas) = 1 and jsonb_typeof(limpio -> (e.preguntas -> 0 ->> 'id')) = 'string'
         then left(limpio ->> (e.preguntas -> 0 ->> 'id'), 1000) end,
    now()
  )
  on conflict (encuesta_id, user_id) do update
    set valores = excluded.valores, valor_num = excluded.valor_num, valor_texto = excluded.valor_texto,
        answered_at = now();

  -- En una anónima no queda ni el registro de quién respondió (si no, el historial lo delataría).
  if not ya_habia and not e.anonima then
    insert into public.audit_events (kind, user_id, detail)
    values ('encuesta_respondida', me.id, jsonb_build_object('nombre', me.full_name, 'correo', me.email, 'encuesta', e.title));
  end if;
end;
$$;

-- ───────────────────────── Acciones de admin ─────────────────────────

create or replace function public.guardar_encuesta(
  p_id uuid, p_title text, p_description text, p_audiencia text, p_target_user uuid,
  p_anonima boolean, p_preguntas jsonb, p_active boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid := p_id;
  v_title text := left(trim(coalesce(p_title, '')), 200);
  v_desc  text := left(trim(coalesce(p_description, '')), 2000);
  v_anon  boolean := coalesce(p_anonima, false);
  v_target uuid := p_target_user;
  q jsonb;
  qid text;
  tipo text;
  ids text[] := '{}';
  opciones jsonb;
  op jsonb;
  v_min int;
  v_max int;
  limpias jsonb := '[]'::jsonb;
  antes record;
  v_kind text := 'texto';
  s_min int := 1;
  s_max int := 10;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede hacer esto';
  end if;
  if char_length(v_title) < 3 then
    raise exception 'Escribe el título de la encuesta';
  end if;
  if p_audiencia not in ('todos', 'hombres', 'mujeres', 'persona') then
    raise exception 'Elige para quién es la encuesta';
  end if;
  if p_audiencia = 'persona' then
    if v_target is null or not exists (select 1 from public.profiles where id = v_target) then
      raise exception 'Elige a la persona que va a recibir la encuesta';
    end if;
    v_anon := false;   -- con una sola persona no hay anonimato posible
  else
    v_target := null;
  end if;

  if p_preguntas is null or jsonb_typeof(p_preguntas) <> 'array' or jsonb_array_length(p_preguntas) = 0 then
    raise exception 'Agrega al menos una pregunta';
  end if;
  if jsonb_array_length(p_preguntas) > 50 then
    raise exception 'Una encuesta puede tener hasta 50 preguntas';
  end if;

  for q in select * from jsonb_array_elements(p_preguntas) loop
    qid  := left(trim(coalesce(q ->> 'id', '')), 40);
    tipo := q ->> 'tipo';
    if qid = '' or qid = any(ids) then
      raise exception 'Hay una pregunta sin identificador o repetida';
    end if;
    ids := ids || qid;
    if tipo not in ('escala', 'texto', 'opcion', 'multiple', 'sino') then
      raise exception 'Tipo de pregunta no válido';
    end if;
    if jsonb_array_length(p_preguntas) > 1 and char_length(trim(coalesce(q ->> 'texto', ''))) < 2 then
      raise exception 'Escribe el texto de cada pregunta';
    end if;

    if tipo = 'escala' then
      v_min := coalesce((q ->> 'min')::int, 1);
      v_max := coalesce((q ->> 'max')::int, 10);
      if v_min >= v_max then
        raise exception 'En la escala, el número de abajo debe ser menor que el de arriba';
      end if;
      if v_max - v_min > 20 then
        raise exception 'Una escala puede tener hasta 21 números';
      end if;
      limpias := limpias || jsonb_build_array(jsonb_build_object(
        'id', qid, 'tipo', tipo, 'texto', left(trim(coalesce(q ->> 'texto', '')), 500),
        'obligatoria', coalesce((q ->> 'obligatoria')::boolean, true), 'min', v_min, 'max', v_max));
    elsif tipo in ('opcion', 'multiple') then
      -- sin repetidas ni vacías, y en el orden en que el admin las escribió

      select coalesce(jsonb_agg(o order by ord), '[]'::jsonb) into opciones
        from (
          select distinct on (left(trim(x #>> '{}'), 200)) to_jsonb(left(trim(x #>> '{}'), 200)) as o, ord
            from jsonb_array_elements(coalesce(q -> 'opciones', '[]'::jsonb)) with ordinality as t(x, ord)
           where jsonb_typeof(x) = 'string' and trim(x #>> '{}') <> ''
           order by left(trim(x #>> '{}'), 200), ord
        ) s;
      if jsonb_array_length(opciones) < 2 then
        raise exception 'Cada pregunta de opciones necesita al menos 2 opciones';
      end if;
      if jsonb_array_length(opciones) > 20 then
        raise exception 'Una pregunta puede tener hasta 20 opciones';
      end if;
      limpias := limpias || jsonb_build_array(jsonb_build_object(
        'id', qid, 'tipo', tipo, 'texto', left(trim(coalesce(q ->> 'texto', '')), 500),
        'obligatoria', coalesce((q ->> 'obligatoria')::boolean, true), 'opciones', opciones));
    else
      limpias := limpias || jsonb_build_array(jsonb_build_object(
        'id', qid, 'tipo', tipo, 'texto', left(trim(coalesce(q ->> 'texto', '')), 500),
        'obligatoria', coalesce((q ->> 'obligatoria')::boolean, true)));
    end if;
  end loop;

  -- Columnas de antes (kind / escala): copia de compatibilidad para encuestas de una sola pregunta.
  if jsonb_array_length(limpias) = 1 and limpias -> 0 ->> 'tipo' in ('escala', 'texto') then
    v_kind := limpias -> 0 ->> 'tipo';
    if v_kind = 'escala' then
      s_min := (limpias -> 0 ->> 'min')::int;
      s_max := (limpias -> 0 ->> 'max')::int;
    end if;
  end if;

  if p_id is null then
    insert into public.encuestas (title, description, kind, scale_min, scale_max, active, created_by,
                                  audiencia, target_user, anonima, preguntas)
    values (v_title, v_desc, v_kind, s_min, s_max, coalesce(p_active, true), auth.uid(),
            p_audiencia, v_target, v_anon, limpias)
    returning id into new_id;
  else
    select anonima into antes from public.encuestas where id = p_id;
    if not found then
      raise exception 'Esa encuesta ya no existe';
    end if;
    if antes.anonima and not v_anon
       and exists (select 1 from public.encuestas_respuestas where encuesta_id = p_id) then
      raise exception 'Esta encuesta se publicó como anónima y ya tiene respuestas: no se puede volver con nombre';
    end if;
    update public.encuestas
       set title = v_title, description = v_desc, kind = v_kind, scale_min = s_min, scale_max = s_max,
           active = coalesce(p_active, active), audiencia = p_audiencia, target_user = v_target,
           anonima = v_anon, preguntas = limpias, updated_at = now()
     where id = p_id;
  end if;
  return new_id;
end;
$$;

-- Solo admin: las respuestas. En una anónima no sale ni el nombre ni la hora, y el orden es al azar.
drop function if exists public.list_respuestas_encuesta(uuid);
create function public.list_respuestas_encuesta(p_id uuid)
returns table (user_id uuid, full_name text, email text, valores jsonb, answered_at timestamptz)
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  anon boolean;
begin
  if not public.is_admin() then
    raise exception 'Solo un admin puede ver esto';
  end if;
  select e.anonima into anon from public.encuestas e where e.id = p_id;
  if anon then
    return query
      select null::uuid, null::text, null::text, r.valores, null::timestamptz
        from public.encuestas_respuestas r
       where r.encuesta_id = p_id
       order by random();
  else
    return query
      select r.user_id, p.full_name, p.email, r.valores, r.answered_at
        from public.encuestas_respuestas r
        join public.profiles p on p.id = r.user_id
       where r.encuesta_id = p_id
       order by r.answered_at desc;
  end if;
end;
$$;

-- La forma de responder de antes no sabe para quién es cada encuesta: se apaga.
revoke all on function public.submit_respuesta_encuesta(uuid, int, text) from public, anon, authenticated;

revoke all on function public.encuesta_es_para_mi(text, uuid)                                      from public, anon;
revoke all on function public.list_encuestas()                                                     from public, anon;
revoke all on function public.responder_encuesta(uuid, jsonb)                                      from public, anon;
revoke all on function public.guardar_encuesta(uuid, text, text, text, uuid, boolean, jsonb, boolean) from public, anon;
revoke all on function public.list_respuestas_encuesta(uuid)                                       from public, anon;
grant execute on function public.encuesta_es_para_mi(text, uuid)                                      to authenticated;
grant execute on function public.list_encuestas()                                                     to authenticated;
grant execute on function public.responder_encuesta(uuid, jsonb)                                      to authenticated;
grant execute on function public.guardar_encuesta(uuid, text, text, text, uuid, boolean, jsonb, boolean) to authenticated;
grant execute on function public.list_respuestas_encuesta(uuid)                                       to authenticated;
