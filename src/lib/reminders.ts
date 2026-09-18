/*
  Recordatorios: 3 avisos al día (mañana / tarde / noche).

  Limitación honesta: una PWA no tiene cron en segundo plano garantizado en iOS.
  Estrategia:
   - Mientras la app está abierta: se programa un setTimeout para cada franja pendiente de hoy.
   - Al volver a abrir / enfocar la app: si una franja ya pasó hoy y no se avisó, se avisa
     en ese momento (recuperación).
  Requiere iOS 16.4+, la app añadida a la pantalla de inicio y abierta DESDE ese icono
  (en una pestaña normal de Safari el API de notificaciones no existe).

  En iOS (PWA) el constructor `new Notification()` NO está soportado: hay que usar
  `ServiceWorkerRegistration.showNotification()`. Por eso todo pasa por `showNotif()`.
*/
import type { Settings } from './db/schema';
import { pickMusar, type MusarTheme } from './musar';

type Slot = 'morning' | 'afternoon' | 'evening';

const MESSAGES: Record<Slot, { title: string; body: string }> = {
  morning: {
    title: 'Empieza el día · כוונה ליום',
    body: 'Haz tu check-in: un punto de Avodá claro para hoy.',
  },
  afternoon: {
    title: '¿Cómo va el día?',
    body: 'Cuéntale al sistema lo que ha pasado. No lo dejes para la noche.',
  },
  evening: {
    title: 'Cierra el día · חשבון הנפש',
    body: 'Haz el jeshbón hanefesh y guarda el resumen antes de dormir.',
  },
};

// Últimos ajustes vistos por scheduleReminders — los usa fire() para el musar.
let lastSettings: Settings | null = null;

/** El cuerpo de la notificación: la acción + una frase de musar de la franja. */
function bodyFor(slot: Slot): string {
  const base = MESSAGES[slot].body;
  if ((lastSettings?.musar?.density ?? 'clave') === 'pie') return base;
  try {
    const m = pickMusar(
      {
        strictness: lastSettings?.strictness ?? 'demanding',
        preferred: (lastSettings?.musar?.themes ?? []) as MusarTheme[],
        slot,
      },
      `reminder-${slot}`,
    );
    return `${base}\n\n${m.es}${m.sourceEs ? ` — ${m.sourceEs}` : ''}`;
  } catch {
    return base;
  }
}

const SHOWN_KEY = 'zury.reminderShown'; // { 'YYYY-MM-DD': ['morning', ...] }
let timers: number[] = [];

function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shownToday(): Set<Slot> {
  try {
    const raw = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? '{}');
    return new Set((raw[todayKey()] ?? []) as Slot[]);
  } catch {
    return new Set();
  }
}

function markShown(slot: Slot): void {
  try {
    const raw = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? '{}');
    const k = todayKey();
    const arr: Slot[] = raw[k] ?? [];
    if (!arr.includes(slot)) arr.push(slot);
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ [k]: arr }));
  } catch {
    /* ignore */
  }
}

/** ¿Puede este dispositivo mostrar notificaciones web? (API presente) */
export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

/** ¿La app está abierta como PWA instalada (no en pestaña de Safari)? */
export function isStandalone(): boolean {
  try {
    return (
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

async function swRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

/**
 * Muestra una notificación. Usa el Service Worker (obligatorio en iOS PWA) y cae
 * al constructor `Notification` solo si el SW no está disponible (escritorio).
 * Devuelve true si se pudo mostrar.
 */
async function showNotif(title: string, options: NotificationOptions): Promise<boolean> {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false;
  const reg = await swRegistration();
  if (reg && typeof reg.showNotification === 'function') {
    try {
      await reg.showNotification(title, options);
      return true;
    } catch {
      /* cae al constructor */
    }
  }
  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

function slotTime(hhmm: string, base = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

async function fire(slot: Slot): Promise<void> {
  if (shownToday().has(slot)) return;
  const m = MESSAGES[slot];
  const ok = await showNotif(m.title, { body: bodyFor(slot), tag: `zury-${slot}`, icon: '/icon-192.png' });
  if (ok) markShown(slot);
}

export async function requestReminderPermission(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const r = await Notification.requestPermission();
    return r === 'granted';
  } catch {
    return false;
  }
}

/** (Re)programa los recordatorios. Llamar al abrir la app y cuando cambien los ajustes. */
export function scheduleReminders(settings: Settings | null): void {
  lastSettings = settings;
  timers.forEach((t) => window.clearTimeout(t));
  timers = [];
  const r = settings?.reminders;
  if (!r?.enabled) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

  const now = new Date();
  const slots: [Slot, string][] = [
    ['morning', r.morning],
    ['afternoon', r.afternoon],
    ['evening', r.evening],
  ];
  const done = shownToday();

  for (const [slot, hhmm] of slots) {
    const t = slotTime(hhmm);
    if (t.getTime() <= now.getTime()) {
      // franja ya pasada hoy → recuperación inmediata si no se avisó
      if (!done.has(slot)) void fire(slot);
      continue;
    }
    timers.push(window.setTimeout(() => void fire(slot), t.getTime() - now.getTime()));
  }
}

/** Comprueba franjas pendientes al volver a primer plano. */
export function checkMissedReminders(settings: Settings | null): void {
  scheduleReminders(settings);
}

/** Notificación de prueba. Devuelve true si se mostró. */
export async function reminderPreview(): Promise<boolean> {
  return showNotif('Zury Avodah', {
    body: 'Los recordatorios están activos. Te avisaré 3 veces al día.',
    icon: '/icon-192.png',
    tag: 'zury-test',
  });
}
