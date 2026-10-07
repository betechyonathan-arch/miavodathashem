import { useEffect, useMemo, useState } from 'react';
import { useZury } from '../state/zury';
import { baseMusarContext } from '../lib/musar/context';
import { pickMusar } from '../lib/musar';
import { isSubscribed, posponerPush, pushSupported, subscribePush } from '../lib/push';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card } from './ui';

type Stage = 'checking' | 'ask' | 'denied' | 'sin-soporte-ios';

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

/**
 * Invitación a activar notificaciones. Nunca bloquea la entrada: siempre hay «Ahora no», que deja
 * pasar y la pospone hasta el día siguiente.
 *
 * En iPhone (Safari sin agregar a la pantalla de inicio) se explica cómo activarlas. Donde no hay
 * forma de activarlas (navegador dentro de WhatsApp o Instagram, navegador viejo, servidor no
 * configurado) ni siquiera se muestra: se entra directo.
 */
export default function PushWelcome({ onDone }: { onDone: () => void }) {
  const settings = useZury((s) => s.settings);
  const day = useZury((s) => s.day);
  const [stage, setStage] = useState<Stage>('checking');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const line = useMemo(() => pickMusar(baseMusarContext(settings, day), 'push-welcome'), [settings, day]);

  function check() {
    if (!pushSupported() || !backendConfigured) {
      if (backendConfigured && isIOS() && !isStandalone()) setStage('sin-soporte-ios');
      else onDone();
      return;
    }
    void isSubscribed().then((yes) => {
      if (yes) onDone();
      else setStage(Notification.permission === 'denied' ? 'denied' : 'ask');
    });
  }

  useEffect(check, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function activar() {
    setBusy(true);
    setMsg('');
    const r = await subscribePush();
    if (r === 'ok') {
      setMsg('✓ Notificaciones activadas.');
      setTimeout(onDone, 900);
      return;
    }
    setBusy(false);
    if (r === 'denegado') setStage('denied');
    else setMsg('No se pudo activar. Revisa tu conexión e intenta de nuevo.');
  }

  function ahoraNo() {
    posponerPush();
    onDone();
  }

  if (stage === 'checking') return null;

  return (
    <div className="min-h-full bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="text-center">
          <span className="text-3xl" aria-hidden>
            🔔
          </span>
          <h1 className="mt-2 text-2xl text-ink">
            {stage === 'ask'
              ? 'No te pierdas el día'
              : stage === 'sin-soporte-ios'
                ? 'Recibe la halajá del día'
                : 'Activa las notificaciones'}
          </h1>
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

        {stage === 'ask' && (
          <>
            <Card className="p-4">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Activa las notificaciones y te acompañamos con una <strong>halajá al día</strong> y un{' '}
                <strong>jizuk</strong> de vez en cuando — un empujón corto para que Hashem no se te
                pierda en medio del día.
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">
                Cada vez que te llegue la notificación, te vas a acordar de Hashem — y eso ya es parte
                de tu avodá en este mundo.
              </p>
            </Card>
            {msg && <p className="text-center text-[12px] text-ink-faint">{msg}</p>}
            <Btn className="w-full" disabled={busy} onClick={() => void activar()}>
              {busy ? 'Activando…' : '🔔 Activar notificaciones'}
            </Btn>
          </>
        )}

        {stage === 'denied' && (
          <>
            <Card className="space-y-2 p-4">
              <p className="text-[13px] leading-relaxed text-ink-soft">
                Ya bloqueaste el permiso de notificaciones en este navegador, así que ninguna página —
                tampoco esta — puede volver a pedírtelo por código. Actívalo a mano:
              </p>
              <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-ink-soft">
                <li>Toca el candado o el ícono junto a la dirección de la página.</li>
                <li>Busca «Notificaciones» y cámbialo a «Permitir».</li>
                <li>Vuelve aquí y toca «Ya lo activé».</li>
              </ol>
            </Card>
            {msg && <p className="text-center text-[12px] text-ink-faint">{msg}</p>}
            <Btn className="w-full" disabled={busy} onClick={() => void activar()}>
              {busy ? 'Revisando…' : 'Ya lo activé — continuar'}
            </Btn>
          </>
        )}

        {stage === 'sin-soporte-ios' && (
          <Card className="space-y-2 p-4">
            <p className="text-[13px] leading-relaxed text-ink-soft">
              En iPhone, Safari solo puede mandar notificaciones si la app está agregada a tu pantalla
              de inicio. Para activarlas:
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-[13px] leading-relaxed text-ink-soft">
              <li>
                Toca el botón <strong>Compartir</strong> (el cuadro con la flecha hacia arriba, abajo en
                Safari).
              </li>
              <li>
                Elige <strong>«Agregar a inicio»</strong>.
              </li>
              <li>Abre Avodah desde el ícono en tu pantalla de inicio.</li>
            </ol>
            <p className="text-[12px] leading-relaxed text-ink-faint">
              Desde ahí sí se pueden activar las notificaciones.
            </p>
          </Card>
        )}

        <button
          type="button"
          className="w-full py-2 text-center text-[13px] text-ink-faint underline-offset-2 hover:underline"
          disabled={busy}
          onClick={ahoraNo}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
