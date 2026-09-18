-- ============================================================================
--  Primer admin — se corre UNA sola vez, DESPUÉS de haberte registrado en la app.
--
--  1) Abre la app y crea tu cuenta con TU correo (con una contraseña larga y tuya).
--  2) Pega esto en Supabase → SQL Editor → Run.
--
--  A partir de ahí, desde el panel de admin de la app puedes hacer más admins.
--  Nadie más puede volverse admin: el rol solo lo cambia un admin o este SQL.
-- ============================================================================

update public.profiles
   set role = 'admin'
 where lower(email) = lower('TU-CORREO@ejemplo.com');  -- <- cambia esto por el correo con el que te registraste

-- Debe decir "1 row" (o UPDATE 1). Si dice 0, aún no te has registrado con ese correo.
select email, role from public.profiles where role = 'admin';
