import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useZury } from './state/zury';
import { startCloudSync } from './lib/sync/cloud';
import { scheduleReminders } from './lib/reminders';
import { getSession } from './lib/auth/session';
import { initSwAutoUpdate } from './lib/swUpdate';
import { requestPersistentStorage } from './lib/install';
import { startPresence } from './lib/presence';
import MussarLine from './components/MussarLine';
import Splash from './components/Splash';
import Kavana from './components/Kavana';
import Welcome from './components/Welcome';
import Guia from './components/Guia';
import { guiaVista, marcarGuiaVista } from './lib/guia';
import EncuestaGate from './components/EncuestaGate';
import AppShell from './components/AppShell';
import Dashboard from './pages/Dashboard';
import CheckIn from './pages/CheckIn';
import Cheshbon from './pages/Cheshbon';
import ComoEstoy from './pages/ComoEstoy';
import Calendar from './pages/Calendar';
import History from './pages/History';
import DayView from './pages/DayView';
import Mission from './pages/Mission';
import Areas from './pages/Areas';
import Tora from './pages/Tora';
import Admin from './pages/Admin';
import Yehudi from './pages/Yehudi';
import Mujer from './pages/Mujer';
import Retos from './pages/Retos';
import RetoLink from './pages/RetoLink';
import TehilimLink from './pages/TehilimLink';
import KabalaPage from './pages/Kabala';
import Boleta from './pages/Boleta';
import Menu from './pages/Menu';
import Settings from './pages/Settings';

/** «Menú → Cómo usar la app»: la guía otra vez, cuando la persona quiera. */
function GuiaDeNuevo() {
  const navigate = useNavigate();
  return <Guia onDone={() => navigate('/')} />;
}

export default function App() {
  const ready = useZury((s) => s.ready);
  const init = useZury((s) => s.init);
  const saveSettings = useZury((s) => s.saveSettings);
  const settings = useZury((s) => s.settings);
  const [entered, setEntered] = useState(false);
  const [passedKavana, setPassedKavana] = useState(false);
  const [guideClosed, setGuideClosed] = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);

  useEffect(() => {
    initSwAutoUpdate();
    void requestPersistentStorage();
    const stopPresence = startPresence(); // cuánta gente está en línea, para el panel de admin
    init().then(() => {
      startCloudSync((json) => useZury.getState().applyRemoteImport(json));
      scheduleReminders(useZury.getState().settings);
    });
    return stopPresence;
  }, [init]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') scheduleReminders(useZury.getState().settings);
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-full place-items-center bg-bg px-8">
        <div className="text-center">
          <span className="hebrew text-2xl text-gold">טוען…</span>
          <MussarLine className="mt-6" />
        </div>
      </div>
    );
  }

  if (!entered) {
    return (
      <Splash
        onContinue={() => {
          if (settings && !settings.splashAcknowledgedAt) {
            saveSettings({ splashAcknowledgedAt: new Date().toISOString() });
          }
          setEntered(true);
        }}
      />
    );
  }

  if (!passedKavana) {
    return <Kavana onContinue={() => setPassedKavana(true)} />;
  }

  // Guía de uso: una sola vez. Cuentas nuevas (antes de la bienvenida) y cuentas que ya existían
  // (la primera vez que entran con esta versión). Después no vuelve a salir sola.
  if (settings && !settings.guideDoneAt && !guiaVista() && !guideClosed) {
    return (
      <Guia
        onDone={() => {
          marcarGuiaVista();
          setGuideClosed(true);
          void saveSettings({ guideDoneAt: new Date().toISOString() });
        }}
      />
    );
  }

  // Cuenta nueva: una bienvenida que explica la app, deja clara la privacidad y sugiere una primera kabalá.
  if (settings && !settings.welcomeDoneAt) return <Welcome />;

  // Encuestas obligatorias: si hay una activa sin responder, sale antes que todo lo demás y no
  // se puede saltar. Cada vez que se abre la app se vuelve a revisar (sin conexión, se deja pasar).
  if (!surveyDone) return <EncuestaGate onDone={() => setSurveyDone(true)} />;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="check-in" element={<CheckIn />} />
        <Route path="cheshbon" element={<Cheshbon />} />
        <Route path="como-estoy" element={<ComoEstoy />} />
        <Route path="calendario" element={<Calendar />} />
        <Route path="historia" element={<History />} />
        <Route path="dia/:dayId" element={<DayView />} />
        <Route path="mision" element={<Mission />} />
        <Route path="areas" element={<Areas />} />
        <Route path="tora" element={<Tora />} />
        <Route path="musar" element={<Navigate to="/tora?t=musar" replace />} />
        <Route path="yehudi" element={<Yehudi />} />
        <Route path="mujer" element={<Mujer />} />
        <Route path="retos" element={<Retos />} />
        <Route path="retos/:code" element={<RetoLink />} />
        <Route path="retos/tehilim/:code" element={<TehilimLink />} />
        <Route path="guia" element={<GuiaDeNuevo />} />
        <Route path="kabala" element={<KabalaPage />} />
        <Route path="boleta" element={<Boleta />} />
        <Route path="menu" element={<Menu />} />
        <Route path="ajustes" element={<Settings />} />
        {(getSession()?.isAdmin || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === '1')) && (
          <Route path="admin" element={<Admin />} />
        )}
      </Route>
    </Routes>
  );
}
