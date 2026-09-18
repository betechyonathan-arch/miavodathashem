/*
  Hace que una PWA instalada recoja los despliegues nuevos sin depender de que el
  sistema operativo mate el proceso:
   - al abrir, cada hora, y cada vez que la app vuelve a primer plano, le pide al
     Service Worker que busque una versión nueva;
   - cuando el SW nuevo se activa (habiendo ya uno controlando), recarga UNA vez.
  El SW de vite-plugin-pwa usa `registerType: 'autoUpdate'` (skipWaiting +
  clientsClaim), así que el nuevo se activa solo. Aun así escuchamos los dos
  eventos posibles (`updatefound → activated` y `controllerchange`) porque en iOS
  a veces solo dispara uno.

  El HTML (`/`, `/kabala`, …) se sirve con `Cache-Control: no-cache` desde
  Firebase Hosting (ver firebase.json), así que una recarga normal ya trae el
  index nuevo y con él el bundle nuevo; esto solo cubre la app ya abierta.
*/
let reloaded = false;

function reloadOnce() {
  if (reloaded) return;
  reloaded = true;
  window.location.reload();
}

/**
 * Red de seguridad contra un Service Worker "clavado" (típico en iOS): pide
 * `/version.json` sin caché y, si el build del servidor no coincide con el que
 * está corriendo, DESREGISTRA todos los SW, borra las cachés y recarga. Así un
 * despliegue nuevo entra aunque el SW viejo se niegue a actualizarse solo.
 */
async function hardVersionCheck(): Promise<void> {
  try {
    const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return;
    const data = (await res.json()) as { build?: string };
    const running = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : '';
    if (!data.build || !running || data.build === running) return;

    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister().catch(() => false)));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
    }
    reloadOnce();
  } catch {
    /* sin conexión: se reintenta al volver a primer plano */
  }
}

export function initSwAutoUpdate(): void {
  if (!('serviceWorker' in navigator)) return;

  const hadController = !!navigator.serviceWorker.controller;

  // Corre siempre, haya o no registro accesible: es la vía que rescata un SW clavado.
  void hardVersionCheck();

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // La primera vez que un SW toma el control (instalación inicial) no se recarga:
    // la página ya muestra el contenido actual.
    if (!hadController) return;
    reloadOnce();
  });

  navigator.serviceWorker
    .getRegistration()
    .then((reg) => {
      if (!reg) return;

      // Un SW nuevo encontrado en un `update()`: cuando termine de activarse y ya
      // había uno controlando, es un despliegue nuevo → recargar.
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'activated' && navigator.serviceWorker.controller) reloadOnce();
        });
      });

      const check = () => {
        reg.update().catch(() => {
          /* sin conexión o sin SW: se reintenta al volver a primer plano */
        });
        void hardVersionCheck();
      };

      check();
      window.setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('focus', check);
    })
    .catch(() => {
      /* getRegistration puede fallar en modos privados: no es crítico */
    });
}
