import { useEffect, useState } from 'react';
import { isSubscribed, pushSupported, subscribePush, unsubscribePush } from '../lib/push';
import { backendConfigured } from '../lib/supabase';
import { Btn, Card, SectionTitle } from './ui';

/** Ajustes → Recordatorios: prender o apagar las notificaciones push de este dispositivo. */
export default function PushSettingsCard() {
  const [state, setState] = useState<'cargando' | 'on' | 'off' | 'no-soportado'>('cargando');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!backendConfigured || !pushSupported()) {
      setState('no-soportado');
      return;
    }
    void isSubscribed().then((yes) => setState(yes ? 'on' : 'off'));
  }, []);

  async function toggle() {
    setBusy(true);
    setMsg('');
    if (state === 'on') {
      await unsubscribePush();
      setState('off');
    } else {
      const r = await subscribePush();
      if (r === 'ok') setState('on');
      else if (r === 'denegado') setMsg('El navegador no dio permiso. Actívalo en los ajustes del navegador o del teléfono.');
      else setMsg('No se pudo activar. Intenta de nuevo.');
    }
    setBusy(false);
  }

  if (state === 'no-soportado') return null;

  return (
    <Card className="space-y-3 p-4">
      <SectionTitle es="Notificaciones" he="הודעות" />
      <p className="text-[13px] leading-relaxed text-ink-soft">
        Avisos importantes del administrador, aunque tengas la app cerrada. Necesita el permiso del navegador: nunca se activan solas.
      </p>
      <Btn variant={state === 'on' ? 'ghost' : 'solid'} disabled={busy || state === 'cargando'} onClick={() => void toggle()}>
        {state === 'cargando' ? 'Revisando…' : state === 'on' ? '🔔 Activadas · desactivar' : 'Activar notificaciones'}
      </Btn>
      {msg && <p className="text-[12px] text-ink-faint">{msg}</p>}
    </Card>
  );
}
