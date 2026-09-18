/**
 * Configuración de la base de datos en la nube (Firebase Realtime Database).
 * Se lee de variables de entorno Vite (`.env.local`, nunca se sube a git).
 * Si falta algo, la app sigue funcionando 100% local y la sincronización queda "desactivada".
 *
 * Por qué Firebase Realtime Database:
 *  - Plan Spark: gratis, sin tarjeta de crédito, sin fecha de caducidad.
 *  - 1 GB de almacenamiento + 10 GB/mes de descarga: para un diario de texto es
 *    prácticamente ilimitado durante décadas.
 *  - SDK oficial de navegador: no hace falta servidor propio.
 *  - Guardamos un único nodo `state/<clave>` con el JSON completo de la app (ese "archivo").
 *
 * Seguridad: sin pantalla de login. El acceso se limita con una CLAVE larga aleatoria
 * (`VITE_FB_STATE_KEY`) y reglas de la base que solo permiten leer/escribir ese nodo.
 * La clave actúa como "token portador"; se puede endurecer más adelante con Firebase Auth.
 */
const env = import.meta.env as Record<string, string | undefined>;

export const firebaseConfig = {
  apiKey: env.VITE_FB_API_KEY ?? '',
  authDomain: env.VITE_FB_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FB_PROJECT_ID ?? '',
  databaseURL: env.VITE_FB_DATABASE_URL ?? '',
  appId: env.VITE_FB_APP_ID ?? '',
};

export const stateKey = env.VITE_FB_STATE_KEY ?? '';

export const isConfigured =
  !!firebaseConfig.databaseURL && !!firebaseConfig.appId && !!stateKey;

export const projectLabel = firebaseConfig.projectId || firebaseConfig.databaseURL || '—';
