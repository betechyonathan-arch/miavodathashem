import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { useSync } from '../state/sync';
import { hebrewDateEs } from '../lib/format';
import QuickRegister from './QuickRegister';
import QuickTap from './QuickTap';
import ErrorBoundary from './ErrorBoundary';
import NewDayBanner from './NewDayBanner';
import MussarLine from './MussarLine';
import AporteAlert from './AporteAlert';
import { getSession } from '../lib/auth/session';
import { backendConfigured } from '../lib/supabase';

const SYNC_UI: Record<string, { icon: string; label: string; cls: string }> = {
  disabled: { icon: '', label: '', cls: '' },
  connecting: { icon: '⟳', label: 'conectando', cls: 'text-ink-faint' },
  online: { icon: '☁︎', label: 'sincronizado', cls: 'text-[var(--success)]' },
  syncing: { icon: '↑', label: 'guardando', cls: 'text-gold' },
  offline: { icon: '⚡', label: 'sin conexión', cls: 'text-ink-faint' },
  error: { icon: '⚠', label: 'error de sync', cls: 'text-[var(--danger)]' },
};

const NAV_LEFT = [
  { to: '/', he: 'בית', es: 'Hoy', end: true },
  { to: '/como-estoy', he: 'איך אני', es: '¿Cómo estoy?' },
];
const NAV_RIGHT = [
  { to: '/tora', he: 'תורה', es: 'Torá' },
  { to: '/historia', he: 'המסע', es: 'Historia' },
  { to: '/menu', he: 'מפתח', es: 'Menú' },
];

export default function AppShell() {
  const wide = useLocation().pathname.startsWith('/admin'); // el panel de admin usa más ancho
  const day = useZury((s) => s.day);
  const theme = useZury((s) => s.theme);
  const syncStatus = useSync((s) => s.status);
  const [qrOpen, setQrOpen] = useState(false);
  const [qtOpen, setQtOpen] = useState(false);
  const navigate = useNavigate();
  const sync = SYNC_UI[syncStatus] ?? SYNC_UI.disabled;

  // El Menú (y otras pantallas) pueden abrir el registro rápido sin acoplarse al shell.
  useEffect(() => {
    const open = () => setQrOpen(true);
    const openTap = () => setQtOpen(true);
    window.addEventListener('zury:quick-register', open);
    window.addEventListener('zury:quick-tap', openTap);
    return () => {
      window.removeEventListener('zury:quick-register', open);
      window.removeEventListener('zury:quick-tap', openTap);
    };
  }, []);

  const navItem = ({ isActive }: { isActive: boolean }) =>
    `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-center transition-colors duration-300 ${
      isActive ? 'text-gold' : 'text-ink-faint'
    }`;

  return (
    <div className={`themed-transition mx-auto flex min-h-full flex-col ${wide ? 'max-w-5xl' : 'max-w-lg'}`}>
      {/* Header */}
      <header className="safe-top sticky top-0 z-30 border-b border-line bg-bg/85 px-4 py-3 backdrop-blur">
        <div className="mb-1 flex items-center justify-end">
          <button
            onClick={() => setQtOpen(true)}
            className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-[11px] text-gold"
            aria-label="Toque rápido"
            title="Toque rápido"
          >
            <span>⚡</span>
            <span className="hebrew">מהיר</span>
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => navigate('/mision')} className="text-left">
            <div className="hebrew text-xl font-semibold leading-none text-gold">היום</div>
            <div className="mt-0.5 text-[12px] text-ink-soft">
              {day ? `${day.eveningPhase ? 'noche · ' : ''}${hebrewDateEs(day.displayHebrewDate)}` : '—'}
            </div>
            <div className="mt-0.5 text-[10px] text-ink-faint">
              <span className="hebrew">שליחות</span> · Misión
            </div>
          </button>
          <div className="flex flex-col items-end">
            <button onClick={() => navigate('/calendario')} className="text-right">
              <div className="hebrew text-base leading-tight text-ink">
                {day?.eveningPhase ? <span className="text-ink-faint">ליל </span> : null}
                {day?.displayHebrewDateHe}
              </div>
              <div className="text-[11px] text-ink-faint">
                {theme === 'night' ? '🌙 ' : '☀️ '}
                {day?.isShabbat ? 'שבת' : day?.isErevShabbat ? 'ערב שבת' : day?.isYomTov ? 'יום טוב' : 'חול'}
                {day?.holidays?.length ? ` · ${day.holidays[0]}` : ''}
              </div>
              <div className="mt-0.5 text-[10px] text-gold">
                <span className="hebrew">לוח</span> · Calendario
              </div>
            </button>
            {sync.icon && (
              <button
                onClick={() => navigate('/ajustes')}
                className={`mt-0.5 text-[10px] ${sync.cls}`}
                title="Estado de la copia en la nube"
              >
                {sync.icon} {sync.label}
              </button>
            )}
          </div>
        </div>
        <div className="rule-diamond mt-2">
          <span />
        </div>
      </header>

      <NewDayBanner />
      {backendConfigured && getSession()?.isAdmin && <AporteAlert />}

      <main className="flex-1 px-4 pb-28 pt-4">
        <ErrorBoundary label="esta pantalla">
          <Outlet />
        </ErrorBoundary>
        <MussarLine className="mt-10 border-t border-line pt-5" />
      </main>

      {/* Bottom nav con botón central + REGISTRAR */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto flex max-w-lg items-stretch justify-around gap-1 border-t border-line bg-bg/95 px-2 pb-1 pt-1.5 backdrop-blur">
        {NAV_LEFT.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={navItem}>
            <span className="hebrew text-[15px] leading-none">{n.he}</span>
            <span className="text-[9px] uppercase tracking-[0.12em] leading-none">{n.es}</span>
          </NavLink>
        ))}

        <button
          onClick={() => setQrOpen(true)}
          className="relative -top-4 flex flex-col items-center"
          aria-label="Registrar"
        >
          <span className="grid h-14 w-14 place-items-center rounded-full border border-bg bg-gold font-serif text-2xl text-[#1a140a] shadow-[0_4px_16px_rgba(0,0,0,0.28)] ring-1 ring-[color-mix(in_srgb,var(--gold)_40%,#000)] transition-[filter] duration-300 active:brightness-95">
            +
          </span>
          <span className="hebrew mt-0.5 text-[11px] leading-none text-gold">רישום</span>
        </button>

        {NAV_RIGHT.map((n) => (
          <NavLink key={n.to} to={n.to} className={navItem}>
            <span className="hebrew text-[15px] leading-none">{n.he}</span>
            <span className="text-[9px] uppercase tracking-[0.12em] leading-none">{n.es}</span>
          </NavLink>
        ))}
      </nav>

      <QuickRegister open={qrOpen} onClose={() => setQrOpen(false)} onSaved={() => navigate('/')} />
      <QuickTap open={qtOpen} onClose={() => setQtOpen(false)} onSaved={() => navigate('/')} />
    </div>
  );
}
