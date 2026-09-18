# Avodah · עבודה

Sistema de **Avodat Hashem** para acompañar la vida entera: vives → registras rápido →
el sistema organiza, encuentra patrones → reflexionas y mejoras.

> לעבוד את ה׳ בכל דרכיך — *Servir a Hashem en todos tus caminos*

Aplicación web instalable (PWA), pensada primero para el teléfono. En español, con el
hebreo como lengua principal de los textos.

## Qué incluye

- **Registro rápido** en 27 áreas de avodá (Torá, tefilá, midot, kedushá, habla, ben adam
  lajaveró…), con clasificación por reglas y siempre con su "¿por qué?".
- **Día judío real:** la fecha cambia al anochecer, con zmanim, Shabat y festivos
  (`@hebcal/core`).
- **Contenido según género:** mitzvot, caídas que se vigilan y preguntas distintas para
  hombres y mujeres, según la halajá general (`src/lib/gender.ts`).
- **Check-in y jeshbón hanéfesh** que solo preguntan lo que falta, boletas semanales,
  mensuales y anuales, metas por niveles y el círculo "ser Yehudí".
- **Torá:** estudio con la biblioteca abierta de [Sefaria](https://www.sefaria.org)
  — Pirkei Avot, Tanaj, Mishná, Guemará, Halajá y miles de pirushim enlazados — más una
  pestaña de **Musar**.
- **Cuentas y panel de administración** con Supabase: registro, login, recuperar
  contraseña, roles y gestión de cuentas. El admin **nunca** ve los registros personales.

## Privacidad

Los registros de cada persona (su diario) se guardan **en su propio dispositivo**
(IndexedDB). El servidor solo guarda la cuenta: nombre, correo, género y rol.

## Puesta en marcha

Requiere Node 20 o superior.

```bash
npm install
npm run dev
```

Sin más configuración funciona en **modo de prueba local** (cuentas guardadas solo en el
navegador). Para cuentas reales y panel de admin, conecta un proyecto de Supabase:

1. Copia `.env.example` como `.env.local` y rellena `VITE_SUPABASE_URL` y
   `VITE_SUPABASE_ANON_KEY`.
2. Ejecuta `supabase/schema.sql` en el SQL Editor de tu proyecto.

Pasos completos, incluido cómo crear el primer admin: [`supabase/LEEME.md`](supabase/LEEME.md).

> La clave `anon` / *publishable* es pública por diseño; lo que protege los datos son las
> reglas RLS de `schema.sql`. **Nunca** pongas la clave `service_role` en el proyecto.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprueba tipos y genera `dist/` |
| `npm run preview` | Sirve el build local |
| `npm run lint` | Linter (oxlint) |

## Stack

Vite · React 19 · TypeScript · Tailwind v4 · Dexie (IndexedDB) · Zustand ·
React Router · Supabase (cuentas y roles) · Sefaria API · vite-plugin-pwa.

## Estructura

```
src/pages/        Pantallas (Hoy, Torá, Menú, Admin…)
src/components/   Componentes de interfaz
src/lib/auth/     Cuentas, sesión y recuperar contraseña
src/lib/sefaria/  Conexión con la API de Sefaria
src/lib/db/       Datos locales (Dexie) — todo pasa por repo.ts
supabase/         Esquema SQL y guía de puesta en marcha
```

## Créditos y atribución

- Textos y comentarios: [Sefaria](https://www.sefaria.org), bajo las licencias que cada
  versión indica en pantalla.
- Este proyecto está en desarrollo; las decisiones halájicas de la app son una guía
  general basada en el Shulján Aruj. **Consulta siempre a tu rav.**
