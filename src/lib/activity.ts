/*
  Avisa al servidor que esta persona registró algo, para que el panel de admin muestre
  "X registró" en la actividad. Solo viaja ESO: nada de lo que registró, ni el área, ni el texto.
*/
import { backendConfigured, supabase } from './supabase';

const MIN_GAP_MS = 60_000; // varios registros en un minuto se avisan una sola vez
let last = 0;

export function reportActivity(): void {
  if (!backendConfigured || !supabase) return;
  const now = Date.now();
  if (now - last < MIN_GAP_MS) return;
  last = now;
  // Las llamadas de supabase-js son perezosas: sin .then() nunca se envían.
  supabase.rpc('log_activity').then(
    () => undefined,
    () => undefined, // secundario: si falla, no molesta a nadie
  );
}
