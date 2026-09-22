import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useZury } from '../state/zury';
import { KIND_COPY } from '../lib/kabala';
import { RetoError, listMisRetos, responderInvitacion, type MiReto } from '../lib/retos';
import { Btn } from './ui';

const POLL_MS = 45_000;
const KIND_ICON: Record<'cuidar' | 'hacer', string> = { cuidar: '🛡️', hacer: '✅' };

/**
 * Cuando alguien te reta, sale este aviso arriba en cualquier pantalla (como con los aportes
 * para admin) con «Aceptar» o «Eliminar» ahí mismo — no hace falta entrar a Retos a buscarlo.
 * Se revisa cada 45 s mientras la app está abierta.
 */
export default function RetoInviteAlert() {
  const { pathname } = useLocation();
  const day = useZury((s) => s.day);
  const [invitaciones, setInvitaciones] = useState<MiReto[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const all = await listMisRetos().catch(() => null);
    if (!all) return; // sin servidor, o retos.sql todavía no instalado
    setInvitaciones(all.filter((r) => r.mi_estado === 'invitado'));
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), POLL_MS);
    const onVisible = () => document.visibilityState === 'visible' && void load();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  async function responder(r: MiReto, aceptar: boolean) {
    if (aceptar && !day) return;
    setBusy(r.id);
    setError('');
    try {
      await responderInvitacion(r.id, aceptar, day?.dayId ?? '');
      await load();
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo responder.');
    } finally {
      setBusy(null);
    }
  }

  // En Retos ya se ve esta misma invitación en «Mis retos» y al abrirla: no duplicar el aviso ahí.
  if (pathname.startsWith('/retos') || invitaciones.length === 0) return null;
  const r = invitaciones[0];
  const copy = KIND_COPY[r.kind];

  return (
    <div className="mx-4 mt-3 space-y-3 rounded-2xl border-2 border-gold bg-raised p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">
          🔥 Te retaron{invitaciones.length > 1 ? ` · ${invitaciones.length} en espera` : ''}
        </span>
      </div>
      <div className="text-[16px] text-ink">
        {KIND_ICON[r.kind]} {r.title}
      </div>
      {r.description && <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-soft">{r.description}</p>}
      <p className="text-[12px] text-ink-faint">
        {r.target_days} {copy.unitPlural} · siempre puedes pedir ver la identidad de quien te retó — nunca sale sola
      </p>
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Btn size="lg" disabled={busy === r.id || !day} onClick={() => void responder(r, true)}>
          Aceptar
        </Btn>
        <Btn variant="ghost" size="lg" disabled={busy === r.id} onClick={() => void responder(r, false)}>
          Eliminar
        </Btn>
      </div>
      {invitaciones.length > 1 && (
        <Link to="/retos" className="block text-[13px] text-gold underline underline-offset-2">
          Ver las demás invitaciones
        </Link>
      )}
    </div>
  );
}
