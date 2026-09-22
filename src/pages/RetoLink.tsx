import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useZury } from '../state/zury';
import { KIND_COPY } from '../lib/kabala';
import { RetoError, getRetoByCode, responderInvitacion, unirsePorLink, type RetoPorCodigo } from '../lib/retos';
import { Btn, Card } from '../components/ui';

/**
 * El enlace de un reto (/retos/:code). Es la invitación misma para uno privado — quien lo abre
 * ve quién lo retó (según la regla de nombre/anónimo) y acepta o rechaza ahí mismo. Para uno
 * público, es simplemente suscribirse, siempre anónimo.
 */
export default function RetoLink() {
  const { code } = useParams<{ code: string }>();
  const { day } = useZury();
  const navigate = useNavigate();
  const [reto, setReto] = useState<RetoPorCodigo | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    getRetoByCode(code)
      .then(setReto)
      .catch((e) => setError(e instanceof RetoError ? e.message : 'No se pudo abrir este reto.'));
  }, [code]);

  async function unirme() {
    if (!code || !day) return;
    setBusy(true);
    setError('');
    try {
      await unirsePorLink(code, day.dayId);
      navigate(`/retos?ver=${(await getRetoByCode(code))?.id ?? ''}`);
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo unir.');
      setBusy(false);
    }
  }

  // Ya tiene una fila de invitación con nombre (poco común llegando por enlace, pero posible si
  // primero lo invitaron por nombre y ahora abre el enlace): responde con el flujo normal.
  async function responder(aceptar: boolean) {
    if (!reto || !day) return;
    setBusy(true);
    setError('');
    try {
      await responderInvitacion(reto.id, aceptar, day.dayId);
      navigate(aceptar ? `/retos?ver=${reto.id}` : '/retos');
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo responder.');
      setBusy(false);
    }
  }

  if (reto === undefined && !error) {
    return (
      <div className="grid min-h-full place-items-center px-6">
        <p className="text-[15px] text-ink-faint">Cargando…</p>
      </div>
    );
  }

  if (!reto) {
    return (
      <div className="grid min-h-full place-items-center px-6 text-center">
        <Card className="max-w-sm space-y-3 p-6">
          <p className="text-[15px] text-ink">{error || 'Este enlace ya no funciona.'}</p>
          <Btn variant="ghost" onClick={() => navigate('/retos')}>
            Ir a Retos
          </Btn>
        </Card>
      </div>
    );
  }

  const copy = KIND_COPY[reto.kind];
  const yaEstoy = reto.mi_estado === 'activo';

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-8">
      <Card className="space-y-3 p-6 text-center">
        <div className="text-[11px] uppercase tracking-[0.16em] text-gold">
          {reto.visibility === 'publico' ? 'Reto público' : `${reto.creador_etiqueta} te retó`}
        </div>
        <h1 className="text-2xl text-ink">{reto.title}</h1>
        {reto.description && <p className="text-[14px] leading-relaxed text-ink-soft">{reto.description}</p>}
        <p className="text-[13px] text-ink-faint">
          {reto.target_days} {copy.unitPlural}
        </p>

        {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}

        {yaEstoy ? (
          <Btn onClick={() => navigate(`/retos?ver=${reto.id}`)} className="w-full">
            Ya participas — ver el reto
          </Btn>
        ) : reto.mi_estado === 'invitado' ? (
          <div className="grid grid-cols-2 gap-2">
            <Btn disabled={busy} onClick={() => void responder(true)}>
              Aceptar
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => void responder(false)}>
              Rechazar
            </Btn>
          </div>
        ) : (
          <Btn disabled={busy || !day} onClick={() => void unirme()} className="w-full">
            {busy ? 'Uniendo…' : reto.visibility === 'publico' ? 'Suscribirme (anónimo)' : 'Aceptar el reto'}
          </Btn>
        )}
        {reto.visibility === 'privado' && !yaEstoy && (
          <p className="text-[11px] text-ink-faint">Es un compromiso de buena voluntad. Si un día caes, lo que sigue es el regreso.</p>
        )}
      </Card>
    </div>
  );
}
