/*
  Enlaces personales de invitación. Cada persona tiene un enlace `https://…/?ref=CODIGO`.
  Quien lo abre y se registra queda asociado a quien invitó; quien invitó solo ve UN
  NÚMERO (cuántas personas entraron con su enlace), nunca quiénes son.

  El conteo vive en el servidor (supabase/referidos.sql). Sin servidor no hay enlaces.
*/
import { backendConfigured, supabase } from './supabase';

const KEY = 'avodah.ref';
const CODE_RE = /^[a-z0-9]{6,12}$/i;

/**
 * Al abrir la app con `?ref=CODIGO` se guarda el código y se limpia la dirección. Se guarda
 * (no solo se lee) porque la persona puede navegar por la pantalla de entrar antes de crear
 * la cuenta y el parámetro se perdería.
 */
export function captureReferral(): void {
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (ref === null) return;
    if (CODE_RE.test(ref)) localStorage.setItem(KEY, ref.toLowerCase());
    url.searchParams.delete('ref');
    window.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  } catch {
    /* sin localStorage o URL rara: la app funciona igual, solo sin atribución */
  }
}

export function getStoredReferral(): string | null {
  try {
    const v = localStorage.getItem(KEY);
    return v && CODE_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function clearReferral(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}

export interface ReferralStats {
  code: string;
  count: number;
}

/** Mi código y cuántas personas se registraron con mi enlace. */
export async function getReferralStats(): Promise<ReferralStats> {
  if (!backendConfigured || !supabase) throw new Error('sin servidor');
  const { data, error } = await supabase.rpc('my_referral_stats');
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.code) throw new Error('sin código');
  return { code: String(row.code), count: Number(row.referred_count ?? 0) };
}

/** El enlace usa la dirección desde la que se abrió la app (sirve con cualquier dominio). */
export function referralLink(code: string): string {
  return `${window.location.origin}/?ref=${code}`;
}

export function inviteMessage(link: string): string {
  return `Te invito a Avodah: un lugar para hacer tu jeshbón hanéfesh cada día, en privado. Entra con mi enlace: ${link}`;
}
