/*
  Presencia: mientras la app está abierta y visible, avisa al servidor cada 2 minutos que la
  persona sigue ahí. Con eso el panel de administración muestra cuánta gente está en línea.

  Solo se envía "sigo aquí" — la hora se guarda en el servidor. Nada de lo que la persona
  registra sale de su dispositivo.
*/
import { backendConfigured, supabase } from './supabase';

const EVERY_MS = 2 * 60_000;
let timer: number | null = null;

function ping() {
  if (!supabase || document.visibilityState !== 'visible') return;
  // Las llamadas de supabase-js son perezosas: sin .then() nunca se envían.
  supabase.rpc('touch_last_seen').then(
    () => undefined,
    () => undefined, // la presencia es secundaria: si falla, no molesta a nadie
  );
}

export function startPresence(): () => void {
  if (!backendConfigured || timer !== null) return () => undefined;
  ping();
  timer = window.setInterval(ping, EVERY_MS);
  document.addEventListener('visibilitychange', ping); // al volver a la pestaña, se avisa de inmediato
  return () => {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    document.removeEventListener('visibilitychange', ping);
  };
}
