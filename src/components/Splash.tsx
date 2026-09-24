import { useEffect, useState, type MouseEvent } from 'react';
import { KIND_LABEL, SPLASH_MAX, cachedFeatured, fetchFeatured, truncateForSplash, type PublicAporte } from '../lib/aportes';
import { buildSplashShareImage, pickSplashBackground, shareOrDownloadImage } from '../lib/splashShareImage';
import { siteOrigin } from '../lib/site';

/**
 * Splash de entrada: fondo oscuro sobrio y toda la pantalla sirve para continuar (tocar en
 * cualquier parte, salvo el botón de compartir). Por defecto lleva el lema. Si un admin puso un
 * aporte de la comunidad en esta pantalla (Administración → Aportes), se muestra ese texto en
 * lugar del lema.
 *
 * El fondo es una de varias fotos fijas de sucot en la noche (public/splash-sukot*.jpg) — puestas
 * a mano por ahora, no por el sistema de aportes (que no maneja fotos). Se elige una al azar cada
 * vez que se abre la app (ver `pickSplashBackground`), para que se note que rotan sin esperar a
 * que cambie el día. Cuando ya no aplique el tema de Sucot, se puede volver al degradado liso
 * quitando el fondo de abajo.
 */
export default function Splash({ onContinue }: { onContinue: () => void }) {
  // La copia guardada de la vez anterior sale al instante; la consulta la refresca para la próxima.
  const cached = cachedFeatured();
  const [featured, setFeatured] = useState<PublicAporte | null>(cached ?? null);
  // Nunca se ha consultado: se espera un instante para no mostrar el lema y cambiarlo enseguida.
  const [settled, setSettled] = useState(cached !== undefined);
  const [bg] = useState(pickSplashBackground);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    const timer = window.setTimeout(() => alive && setSettled(true), 1200);
    void fetchFeatured().then((f) => {
      if (!alive) return;
      if (f !== undefined) setFeatured(f);
      setSettled(true);
    });
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);

  async function compartir(e: MouseEvent) {
    e.stopPropagation(); // no debe disparar onContinue
    setSharing(true);
    setShareMsg('');
    try {
      const blob = await buildSplashShareImage({ bgSrc: bg, featured });
      const outcome = await shareOrDownloadImage(blob, 'avodah.jpg', 'Avodah — לעבוד את ה׳ בכל דרכיך');
      setShareMsg(outcome === 'downloaded' ? 'Imagen descargada.' : '');
    } catch {
      setShareMsg('No se pudo generar la imagen.');
    } finally {
      setSharing(false);
      setTimeout(() => setShareMsg(''), 3000);
    }
  }

  function whatsappText(): string {
    const cuerpo = featured
      ? `${featured.body}${featured.source ? `\n— ${featured.source}` : ''}`
      : 'Servir a Hashem en todos tus caminos.';
    return `${cuerpo}\n\nAvodah — לעבוד את ה׳ בכל דרכיך\n${siteOrigin()}`;
  }

  function whatsapp(e: MouseEvent) {
    e.stopPropagation(); // no debe disparar onContinue
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappText())}`, '_blank', 'noopener');
  }

  return (
    <div
      onClick={onContinue}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onContinue()}
      aria-label="Avodah — לעבוד את ה׳ בכל דרכיך. Continuar"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 px-8 text-center"
      style={{
        backgroundImage:
          `linear-gradient(180deg, rgba(13,11,7,0.55) 0%, rgba(13,11,7,0.6) 45%, rgba(10,8,5,0.85) 80%, rgba(8,6,4,0.94) 100%), url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center 30%',
      }}
    >
      <div className="fixed right-4 top-[calc(1rem+env(safe-area-inset-top,0px))] z-10 flex items-center gap-2">
        <button
          onClick={whatsapp}
          aria-label="Enviar por WhatsApp"
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px]"
          style={{ borderColor: 'rgba(227,189,108,0.5)', color: '#e3bd6c', background: 'rgba(13,11,7,0.55)' }}
        >
          💬 WhatsApp
        </button>
        <button
          onClick={(e) => void compartir(e)}
          disabled={sharing}
          aria-label="Compartir esta pantalla como imagen"
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] disabled:opacity-50"
          style={{ borderColor: 'rgba(227,189,108,0.5)', color: '#e3bd6c', background: 'rgba(13,11,7,0.55)' }}
        >
          {sharing ? '…' : '📤'} Compartir
        </button>
      </div>

      <span className="hebrew text-3xl leading-snug" style={{ color: '#e3bd6c' }}>
        לעבוד את ה׳ בכל דרכיך
      </span>
      <span
        className="max-w-md transition-opacity duration-300"
        style={{ opacity: settled ? 1 : 0, color: 'rgba(247,241,226,0.7)' }}
      >
        {featured ? (
          <span className="flex flex-col items-center gap-3">
            <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: '#e3bd6c' }}>
              {KIND_LABEL[featured.kind]}
              {featured.title ? ` · ${featured.title}` : ''}
            </span>
            <span
              className={`whitespace-pre-line text-[15px] leading-relaxed ${expanded ? 'max-h-[50vh] overflow-y-auto px-1' : ''}`}
              style={{ color: 'rgba(247,241,226,0.9)' }}
              onClick={(e) => expanded && e.stopPropagation()}
            >
              {expanded || featured.body.length <= SPLASH_MAX ? featured.body : truncateForSplash(featured.body)}
            </span>
            {!expanded && featured.body.length > SPLASH_MAX && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(true);
                }}
                className="text-[12px] underline underline-offset-2"
                style={{ color: '#e3bd6c' }}
              >
                Ver completo
              </button>
            )}
            <span className="text-[12px]" style={{ color: 'rgba(247,241,226,0.6)' }}>
              — {featured.author_name ?? 'Anónimo'}
              {featured.source ? ` · ${featured.source}` : ''}
            </span>
          </span>
        ) : (
          <span className="text-sm">Servir a Hashem en todos tus caminos</span>
        )}
      </span>
      {shareMsg && (
        <span className="text-[12px]" style={{ color: 'rgba(247,241,226,0.7)' }}>
          {shareMsg}
        </span>
      )}
      <span className="hebrew mt-8 text-xl" style={{ color: '#f7f1e2' }}>
        המשך
      </span>
    </div>
  );
}
