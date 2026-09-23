import { useEffect, useMemo, useState } from 'react';
import { useZury } from '../state/zury';
import { baseMusarContext } from '../lib/musar/context';
import { pickMusar } from '../lib/musar';
import { isSubscribed, pushSupported, subscribePush } from '../lib/push';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card } from './ui';

/**
 * Invitación a activar notificaciones, una sola vez por cuenta — nueva o vieja — la primera vez
 * que entra con esta versión (settings.pushPromptDoneAt). Se salta sola (sin mostrar nada) si el
 * navegador no soporta push, si el servidor no está configurado, si ya está activada, o si el
 * permiso ya quedó denegado — en ninguno de esos casos hay nada que preguntar.
 */
export default function PushWelcome({ onDone }: { onDone: () => void }) {
  const settings = useZury((s) => s.settings);
  const day = useZury((s) => s.day);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const line = useMemo(() => pickMusar(baseMusarContext(settings, day), 'push-welcome'), [settings, day]);

  useEffect(() => {
    let alive = true;
    if (!pushSupported() || !backendConfigured || Notification.permission === 'denied') {
      onDone();
      return;
    }
    isSubscribed().then((yes) => {
      if (!alive) return;
      if (yes) onDone();
      else setChecking(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activar() {
    setBusy(true);
    setMsg('');
    const r = await subscribePush();
    setMsg(
      r === 'ok'
        ? '✓ Notificaciones activadas.'
        : r === 'denegado'
          ? 'No diste el permiso. Puedes activarlas después desde Ajustes.'
          : 'No se pudo activar. Puedes intentarlo después desde Ajustes.',
    );
    setBusy(false);
    setTimeout(onDone, r === 'ok' ? 1000 : 1700);
  }

  if (checking) return null;

  return (
    <div className="min-h-full bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="text-center">
          <span className="text-3xl" aria-hidden>
            🔔
          </span>
          <h1 className="mt-2 text-2xl text-ink">No te pierdas el día</h1>
        </div>

        <Card className="space-y-2 border-gold/50 p-4 text-center">
          {line.he && (
            <p className="hebrew text-lg leading-relaxed text-gold" dir="rtl">
              {line.he}
            </p>
          )}
          <p className="text-[14px] leading-relaxed text-ink">{line.es}</p>
          {line.sourceEs && (
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{line.sourceEs}</p>
          )}
        </Card>

        <Card className="p-4">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Activa las notificaciones y te acompañamos con una <strong>halajá al día</strong> y un{' '}
            <strong>jizuk</strong> de vez en cuando — un empujón corto para que Hashem no se te pierda
            en medio del día.
          </p>
        </Card>

        {msg && <p className="text-center text-[12px] text-ink-faint">{msg}</p>}

        <div className="space-y-2">
          <Btn className="w-full" disabled={busy} onClick={() => void activar()}>
            {busy ? 'Activando…' : '🔔 Activar notificaciones'}
          </Btn>
          <button
            onClick={onDone}
            disabled={busy}
            className="block w-full text-center text-[13px] text-ink-faint"
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
