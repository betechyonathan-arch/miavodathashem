import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import { getSession } from './lib/auth/session';
import { isRecoveryLink, validateSession } from './lib/auth/accounts';
import { captureReferral } from './lib/referral';
import { isLegacyHost } from './lib/site';
import { initInstallCapture } from './lib/install';
import LegacyDomainBanner from './components/LegacyDomainBanner';

/*
  Orden de arranque:
   1. Se confirma con el servidor que la sesión sigue vigente y se refrescan rol y género
      (por ejemplo, si te hicieron admin o desactivaron tu cuenta).
   2. RECIÉN DESPUÉS se carga la app. Varias pantallas leen el género y el rol al cargar
      su módulo, así que tienen que cargarse con la sesión ya actualizada.
*/
async function start() {
  initInstallCapture(); // el navegador avisa una sola vez que la app se puede instalar
  captureReferral(); // enlace personal de invitación: ?ref=CODIGO
  // Llegó desde el enlace "olvidé mi contraseña": solo se muestra la pantalla de contraseña nueva.
  if (isRecoveryLink()) {
    const ResetPassword = (await import('./pages/ResetPassword.tsx')).default;
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <ResetPassword />
      </StrictMode>,
    );
    return;
  }
  await validateSession().catch(() => undefined);
  const Root = getSession() ? (await import('./App.tsx')).default : (await import('./pages/Auth.tsx')).default;
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isLegacyHost() && <LegacyDomainBanner />}
      <BrowserRouter>
        <Root />
      </BrowserRouter>
    </StrictMode>,
  );
}

void start();
