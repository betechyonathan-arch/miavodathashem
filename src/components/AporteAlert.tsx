import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { KIND_LABEL, SPLASH_MAX, featureAporte, listAll, reviewAporte, type AporteRow } from '../lib/aportes';
import { Btn } from './ui';

const POLL_MS = 45_000;
const SEEN_KEY = 'avodah.aportes.avisados';

function seenIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

/** Aviso del teléfono o la computadora (con la app abierta). En Android hay que pasar por el service worker. */
async function notify(a: AporteRow) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const title = 'Nuevo aporte para revisar';
  const options = { body: `${KIND_LABEL[a.kind]}: ${a.body.slice(0, 90)}`, tag: `aporte-${a.id}` };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    /* el aviso del sistema es un extra: el cuadro de la app siempre sale */
  }
}

/**
 * Solo para admins: cuando alguien manda un aporte de Torá, este cuadro sale arriba en cualquier
 * pantalla con los botones para aceptarlo, mandarlo a la pantalla de entrada o rechazarlo.
 * Se revisa cada 45 s mientras la app está abierta.
 */
export default function AporteAlert() {
  const { pathname } = useLocation();
  const [pending, setPending] = useState<AporteRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [perm, setPerm] = useState<NotificationPermission | 'na'>(() => (typeof Notification === 'undefined' ? 'na' : Notification.permission));

  const load = useCallback(async () => {
    const all = await listAll();
    if (!all) return; // supabase/aportes.sql todavía no está instalado
    const list = all.filter((a) => a.status === 'pendiente').reverse(); // el más viejo primero
    setPending(list);
    const seen = new Set(seenIds());
    const fresh = list.filter((a) => !seen.has(a.id));
    if (fresh.length) {
      for (const a of fresh) void notify(a);
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh.map((a) => a.id)].slice(-200)));
      } catch {
        /* sin almacenamiento: puede repetir el aviso, no pasa nada */
      }
    }
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

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  }

  async function enableNotifications() {
    if (typeof Notification === 'undefined') return;
    setPerm(await Notification.requestPermission());
  }

  // En el panel de admin ya se ven todos los aportes.
  if (pathname.startsWith('/admin') || pending.length === 0) return null;
  const a = pending[0];

  return (
    <div className="mx-4 mt-3 space-y-3 rounded-2xl border-2 border-gold bg-raised p-4 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">
          Aporte por revisar{pending.length > 1 ? ` · ${pending.length} en espera` : ''}
        </span>
        <span className="text-[12px] text-ink-faint">{KIND_LABEL[a.kind]}</span>
      </div>
      {a.title && <div className="text-[16px] text-ink">{a.title}</div>}
      <p className="line-clamp-6 whitespace-pre-line text-[14px] leading-relaxed text-ink">{a.body}</p>
      <p className="text-[12px] text-ink-soft">
        Lo mandó <strong className="text-ink">{a.author_name || 'Alguien'}</strong> · saldrá {a.anonymous ? 'como anónimo' : 'con su nombre'}
      </p>
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Btn disabled={busy} onClick={() => act(() => reviewAporte(a.id, true))}>
          Aceptar
        </Btn>
        <Btn
          variant="ghost"
          disabled={busy}
          onClick={() =>
            act(async () => {
              await reviewAporte(a.id, true);
              await featureAporte(a.id, true);
            })
          }
        >
          Aceptar y poner en la pantalla de entrada
        </Btn>
        <Btn variant="danger" disabled={busy} onClick={() => act(() => reviewAporte(a.id, false))}>
          Rechazar
        </Btn>
      </div>
      {a.body.length > SPLASH_MAX && (
        <p className="text-[12px] text-ink-faint">
          Es largo para la pantalla de entrada (más de {SPLASH_MAX} letras): ahí se verá resumido, con un botón para ver completo.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[13px]">
        <Link to="/admin?t=aportes" className="text-gold underline underline-offset-2">
          Ver todos en el panel
        </Link>
        {perm === 'default' && (
          <button onClick={() => void enableNotifications()} className="text-gold underline underline-offset-2">
            Activar avisos del teléfono
          </button>
        )}
      </div>
    </div>
  );
}
