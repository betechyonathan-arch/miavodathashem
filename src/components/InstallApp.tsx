import { useEffect, useState, useSyncExternalStore } from 'react';
import {
  canPromptInstall,
  detectPlatform,
  dismissInstallBanner,
  installBannerDismissed,
  isInAppBrowser,
  isInstalled,
  promptInstall,
  subscribeInstall,
  type Platform,
} from '../lib/install';
import { Btn, Card, SectionTitle, Sheet } from './ui';

/** Se vuelve a dibujar cuando el navegador avisa que la app se puede instalar (o ya se instaló). */
function useCanPrompt(): boolean {
  return useSyncExternalStore(subscribeInstall, canPromptInstall, () => false);
}

/** Los pasos exactos para instalar cuando no hay un botón directo. */
function ManualSteps({ platform }: { platform: Platform }) {
  if (isInAppBrowser()) {
    return (
      <div className="space-y-2 text-[14px] leading-relaxed text-ink-soft">
        <p className="text-ink">Estás dentro de otra app (WhatsApp, Instagram…). Desde aquí no se puede instalar.</p>
        <ol className="list-decimal space-y-1 ps-5">
          <li>Toca los tres puntos o el botón de compartir de esta pantalla.</li>
          <li>
            Elige <span className="text-ink">"Abrir en Safari"</span> (iPhone) o <span className="text-ink">"Abrir en Chrome"</span>{' '}
            (Android).
          </li>
          <li>Ya en el navegador, vuelve a tocar "Instalar".</li>
        </ol>
      </div>
    );
  }
  if (platform === 'ios') {
    return (
      <div className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
        <p>
          En iPhone y iPad, Apple no permite instalar con un botón: se hace desde el menú de compartir. Son 3 toques, en{' '}
          <span className="text-ink">Safari</span>:
        </p>
        <ol className="list-decimal space-y-1.5 ps-5">
          <li>
            Toca el botón <span className="text-ink">Compartir</span> — el cuadrado con una flecha hacia arriba (⬆︎), abajo en el
            centro de la pantalla.
          </li>
          <li>
            Baja en el menú y toca <span className="text-ink">"Añadir a pantalla de inicio"</span>.
          </li>
          <li>
            Toca <span className="text-ink">"Añadir"</span>, arriba a la derecha.
          </li>
        </ol>
        <p className="text-[12px] text-ink-faint">
          Después ábrela desde el icono nuevo de tu pantalla de inicio, no desde Safari. Si no ves la opción, abre esta dirección en
          Safari.
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-3 text-[14px] leading-relaxed text-ink-soft">
      <p>Tu navegador no ofreció el botón automático. Se instala desde su menú:</p>
      <ol className="list-decimal space-y-1.5 ps-5">
        <li>
          Toca el menú del navegador (<span className="text-ink">⋮</span> tres puntos, arriba a la derecha).
        </li>
        <li>
          Elige <span className="text-ink">"Instalar app"</span> o <span className="text-ink">"Añadir a pantalla de inicio"</span>.
        </li>
        <li>Confirma.</li>
      </ol>
    </div>
  );
}

const WHY = 'Se abre como una app más, a pantalla completa, y tus datos quedan mejor protegidos: el navegador deja de borrarlos por inactividad.';

/** Aviso en el Tablero: recomienda instalar, con botón directo cuando el navegador lo permite. */
export function InstallBanner() {
  const [hidden, setHidden] = useState(() => isInstalled() || installBannerDismissed());
  const [steps, setSteps] = useState(false);
  const canPrompt = useCanPrompt();
  const platform = detectPlatform();

  useEffect(() => {
    // si se instala mientras está abierto, el aviso se va solo
    const off = () => isInstalled() && setHidden(true);
    window.addEventListener('appinstalled', off);
    return () => window.removeEventListener('appinstalled', off);
  }, []);

  if (hidden) return null;

  async function install() {
    if (canPrompt) {
      const r = await promptInstall();
      if (r === 'accepted') setHidden(true);
    } else {
      setSteps(true);
    }
  }

  return (
    <>
      <Card className="border-gold/60 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold">Instala la app</div>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{WHY}</p>
          </div>
          <button
            aria-label="Ocultar por ahora"
            onClick={() => {
              dismissInstallBanner();
              setHidden(true);
            }}
            className="shrink-0 px-1 text-[18px] leading-none text-ink-faint"
          >
            ×
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn onClick={install}>{platform === 'ios' ? 'Cómo instalarla' : 'Instalar'}</Btn>
          {canPrompt && (
            <button onClick={() => setSteps(true)} className="text-[12px] text-gold underline underline-offset-2">
              Ver pasos
            </button>
          )}
        </div>
      </Card>

      <Sheet open={steps} onClose={() => setSteps(false)} title={<div className="text-lg text-ink">Instalar Avodah</div>}>
        <ManualSteps platform={platform} />
        <Btn variant="ghost" onClick={() => setSteps(false)} className="mt-4 w-full">
          Entendido
        </Btn>
      </Sheet>
    </>
  );
}

/** Sección fija de Ajustes: siempre disponible, aunque se haya ocultado el aviso del Tablero. */
export function InstallSection() {
  const canPrompt = useCanPrompt();
  const platform = detectPlatform();
  const installed = isInstalled();
  const [done, setDone] = useState(false);

  return (
    <Card as="section" id="instalar" className="scroll-mt-24 space-y-3 p-4">
      <SectionTitle es="Instalar la app" he="התקנה" />
      {installed || done ? (
        <p className="text-[14px] text-[var(--success)]">Ya la tienes instalada. Buen trabajo.</p>
      ) : (
        <>
          <p className="text-[13px] leading-relaxed text-ink-soft">{WHY}</p>
          {canPrompt ? (
            <Btn
              onClick={async () => {
                if ((await promptInstall()) === 'accepted') setDone(true);
              }}
            >
              Instalar ahora
            </Btn>
          ) : (
            <ManualSteps platform={platform} />
          )}
        </>
      )}
    </Card>
  );
}
