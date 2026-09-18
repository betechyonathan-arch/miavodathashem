import { useState } from 'react';
import type { Settings } from '../lib/db/schema';
import {
  isStandalone,
  notificationsSupported,
  reminderPreview,
  requestReminderPermission,
  scheduleReminders,
} from '../lib/reminders';
import { Btn, Card, Field, SectionTitle, inputCls } from './ui';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export default function RemindersCard({
  settings,
  set,
}: {
  settings: Settings;
  set: (p: Partial<Settings>) => void;
}) {
  const r = settings.reminders;
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const perm = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  const standalone = isStandalone();
  const ios = isIOS();

  /** Mensaje accionable según por qué no se puede activar. */
  const blockedReason = (): string => {
    if (!notificationsSupported() || perm === 'unsupported') {
      return ios
        ? 'En iPhone: abre Zury Avodah en Safari → botón compartir → “Añadir a pantalla de inicio”, y luego ábrela DESDE ese icono. Requiere iOS 16.4 o posterior.'
        : 'Este navegador no soporta notificaciones web. Prueba con Chrome, Edge o Safari actualizados.';
    }
    if (ios && !standalone) {
      return 'Estás en Safari. Abre la app desde el icono de la pantalla de inicio para poder activar las notificaciones.';
    }
    if (perm === 'denied') {
      return ios
        ? 'Las notificaciones están bloqueadas. Ve a Ajustes del iPhone → Zury Avodah → Notificaciones y actívalas.'
        : 'Las notificaciones están bloqueadas para este sitio. Actívalas desde el icono junto a la barra de direcciones.';
    }
    return 'El navegador no concedió el permiso.';
  };

  const setR = (patch: Partial<Settings['reminders']>) => {
    const next = { ...r, ...patch };
    set({ reminders: next });
    scheduleReminders({ ...settings, reminders: next });
  };

  return (
    <Card className="space-y-3 p-4">
      <SectionTitle es="Recordatorios (3 al día)" he="תזכורות" />

      <label className="flex items-center gap-2 text-[13px] text-ink-soft">
        <input
          type="checkbox"
          checked={r.enabled}
          onChange={async (e) => {
            setMsg('');
            if (e.target.checked) {
              const ok = await requestReminderPermission();
              if (!ok) {
                setMsgOk(false);
                setMsg(blockedReason());
                return;
              }
            }
            setR({ enabled: e.target.checked });
          }}
        />
        Avisarme en la mañana, la tarde y la noche
      </label>

      {r.enabled && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Mañana">
              <input type="time" className={inputCls} value={r.morning} onChange={(e) => setR({ morning: e.target.value })} />
            </Field>
            <Field label="Tarde">
              <input type="time" className={inputCls} value={r.afternoon} onChange={(e) => setR({ afternoon: e.target.value })} />
            </Field>
            <Field label="Noche">
              <input type="time" className={inputCls} value={r.evening} onChange={(e) => setR({ evening: e.target.value })} />
            </Field>
          </div>
          <Btn
            variant="ghost"
            onClick={async () => {
              setMsg('');
              const ok = await requestReminderPermission();
              if (!ok) {
                setMsgOk(false);
                setMsg(blockedReason());
                return;
              }
              const shown = await reminderPreview();
              setMsgOk(shown);
              setMsg(
                shown
                  ? 'Notificación enviada. Si no aparece, revisa las notificaciones del sistema para Zury Avodah.'
                  : 'El permiso está concedido pero el dispositivo no mostró la notificación. Cierra y reabre la app instalada e inténtalo de nuevo.',
              );
            }}
          >
            Probar notificación
          </Btn>
        </>
      )}

      {msg && (
        <p className={`text-[12px] ${msgOk ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>{msg}</p>
      )}

      <div className="space-y-1 text-[11px] text-ink-faint">
        <p>
          Los avisos se programan cuando abres la app; si pasa un día sin abrirla, al volver te avisa
          de la franja pendiente. Una PWA no tiene alarmas en segundo plano garantizadas en iOS.
        </p>
        <p>
          Estado del permiso: <b>{perm}</b>
          {ios ? ` · ${standalone ? 'app instalada ✓' : 'abierta en Safari (instálala en la pantalla de inicio)'}` : ''}
        </p>
      </div>
    </Card>
  );
}
