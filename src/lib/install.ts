/*
  Instalar la app en el teléfono o la computadora (PWA).

  Qué se puede hacer de verdad:
   · Android (Chrome, Edge, Samsung Internet) y computadora (Chrome, Edge): el navegador avisa
     con el evento `beforeinstallprompt` y la app puede mostrar UN botón que instala directo.
   · iPhone / iPad: Apple NO permite instalar desde un botón. Solo se puede desde el menú
     "Compartir" del navegador. Aquí se muestran los pasos exactos.
   · Dentro de otras apps (WhatsApp, Instagram…) no se puede instalar: hay que abrir la
     dirección en Safari o Chrome.

  Instalada, la app protege mejor los datos (el navegador no los borra por inactividad) y se
  abre como una app más.
*/

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

/** Se llama al arrancar (main.tsx): el evento se dispara una sola vez y pronto, hay que escucharlo desde el principio. */
export function initInstallCapture(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // en vez del aviso automático del navegador, la app muestra su propio botón
    deferred = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** ¿Ya está abierta como app instalada? */
export function isInstalled(): boolean {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

export type Platform = 'ios' | 'android' | 'desktop';

export function detectPlatform(ua: string = navigator.userAgent, touchPoints: number = navigator.maxTouchPoints): Platform {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  // iPadOS se presenta como Mac, pero con pantalla táctil.
  if (/Macintosh/i.test(ua) && touchPoints > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Navegador incrustado dentro de otra app (WhatsApp, Instagram, Facebook…): ahí no se puede instalar. */
export function isInAppBrowser(ua: string = navigator.userAgent): boolean {
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter|TikTok|Snapchat|; wv\)/i.test(ua);
}

/** ¿El navegador ofrece instalar con un botón (Android / computadora)? */
export function canPromptInstall(): boolean {
  return deferred !== null;
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const ev = deferred;
  deferred = null; // el evento solo se puede usar una vez
  notify();
  try {
    await ev.prompt();
    const { outcome } = await ev.userChoice;
    return outcome;
  } catch {
    return 'dismissed';
  }
}

/** Pide al navegador que no borre los datos de la app por falta de espacio o de uso. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* algunos navegadores lo niegan: no pasa nada */
  }
  return false;
}

// ── El aviso del Tablero se puede ocultar por un tiempo ──
const DISMISS_KEY = 'avodah.installDismissedAt';
const DISMISS_DAYS = 14;

export function installBannerDismissed(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return at > 0 && Date.now() - at < DISMISS_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function dismissInstallBanner(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* nada */
  }
}
