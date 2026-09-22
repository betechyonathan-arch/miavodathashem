import { useEffect, useState } from 'react';
import { isSubscribed, pushSupported, subscribePush } from '../lib/push';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card } from './ui';

const DISMISS_KEY = 'avodah.push.banner.oculto';

/** Invitación (no obligatoria: el permiso del teléfono nunca se puede forzar) a activar las notificaciones. */
export default function PushBanner() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!backendConfigured || !pushSupported()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* sin almacenamiento: se muestra igual */
    }
    if (Notification.permission === 'denied') return;
    void isSubscribed().then((yes) => setShow(!yes));
  }, []);

  function ocultar() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* sin almacenamiento: no pasa nada, solo vuelve a salir la próxima vez */
    }
  }

  async function activar() {
    setBusy(true);
    setMsg('');
    const r = await subscribePush();
    setBusy(false);
    if (r === 'ok') setShow(false);
    else if (r === 'denegado') {
      setMsg('No diste el permiso. Puedes activarlas luego desde Ajustes.');
      ocultar();
    } else setMsg('No se pudo activar. Intenta de nuevo en un momento.');
  }

  if (!show) return null;

  return (
    <Card className="space-y-2 border-gold/50 p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl" aria-hidden>
          🔔
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-ink">Activa las notificaciones</div>
          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">
            Para recibir los avisos importantes del administrador aunque tengas la app cerrada.
          </p>
          {msg && <p className="mt-1 text-[12px] text-ink-faint">{msg}</p>}
          <div className="mt-2 flex gap-2">
            <Btn disabled={busy} onClick={() => void activar()}>
              {busy ? 'Activando…' : 'Activar'}
            </Btn>
            <Btn variant="quiet" onClick={ocultar}>
              Ahora no
            </Btn>
          </div>
        </div>
      </div>
    </Card>
  );
}
