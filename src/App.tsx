import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useZury } from './state/zury';
import { startCloudSync } from './lib/sync/cloud';
import { scheduleReminders } from './lib/reminders';
import { getGender } from './lib/gender';
import { getSession } from './lib/auth/session';
import { initSwAutoUpdate } from './lib/swUpdate';
import MussarLine from './components/MussarLine';
import Splash from './components/Splash';
import Kavana from './components/Kavana';
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
import KabalaPage from './pages/Kabala';
import Boleta from './pages/Boleta';
import Menu from './pages/Menu';
import Settings from './pages/Settings';

export default function App() {
  const ready = useZury((s) => s.ready);
  const init = useZury((s) => s.init);
  const saveSettings = useZury((s) => s.saveSettings);
  const settings = useZury((s) => s.settings);
  const [entered, setEntered] = useState(false);
  const [passedKavana, setPassedKavana] = useState(false);

  useEffect(() => {
    initSwAutoUpdate();
    init().then(() => {
      startCloudSync((json) => useZury.getState().applyRemoteImport(json));
      scheduleReminders(useZury.getState().settings);
    });
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
        {getGender() === 'hombre' && <Route path="kabala" element={<KabalaPage />} />}
        <Route path="boleta" element={<Boleta />} />
        <Route path="menu" element={<Menu />} />
        <Route path="ajustes" element={<Settings />} />
        {getSession()?.isAdmin && <Route path="admin" element={<Admin />} />}
      </Route>
    </Routes>
  );
}
