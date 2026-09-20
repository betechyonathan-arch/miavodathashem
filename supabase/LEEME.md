# Poner en marcha las cuentas y el panel de admin

1. Entra a https://supabase.com → **New project** (uno NUEVO, no el de Otzar Divrei Torá).
   Elige un nombre, una contraseña de base de datos (guárdala) y la región más cercana.
2. **Project Settings → API**: copia la *Project URL* y la clave *anon public*.
3. En esta carpeta del proyecto, copia `.env.example` como `.env.local` y pega los dos valores.
4. **SQL Editor → New query**: pega todo `supabase/schema.sql` y pulsa **Run**.
4b. **SQL Editor → New query**: pega también `supabase/referidos.sql` y pulsa **Run** (activa los enlaces personales de invitación).
5. **Authentication → Providers → Email**: decide si pedir confirmación de correo.
   Para probar rápido puedes desactivar "Confirm email"; para el público, déjala activada.
6. Corre `npm run dev`, abre la app y **crea tu cuenta** con TU correo (el que quieras que sea el primer admin)
   (contraseña larga y tuya; Supabase exige mínimo 6, la app pide 8 o más).
7. **SQL Editor**: pega `supabase/primer-admin.sql` y pulsa **Run**. Debe mostrar tu correo con rol `admin`.
8. Cierra sesión y vuelve a entrar: en el Menú aparece **Administración**. Desde ahí haces más admins.

Nota: los registros personales de cada usuario NO viven en Supabase (siguen en su dispositivo);
el panel solo maneja cuentas.
