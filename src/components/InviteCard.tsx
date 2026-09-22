import { useEffect, useState } from 'react';
import { backendConfigured } from '../lib/supabase';
import { getReferralStats, inviteMessage, referralLink, type ReferralStats } from '../lib/referral';
import { Btn, Card, SectionTitle } from './ui';

/**
 * Tu enlace personal de invitación y cuántas personas entraron con él.
 * Solo se ve un número: nunca quiénes son.
 */
export default function InviteCard() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!backendConfigured) return;
    let alive = true;
    setState('loading');
    getReferralStats().then(
      (s) => {
        if (!alive) return;
        setStats(s);
        setState('ready');
      },
      () => alive && setState('error'),
    );
    return () => {
      alive = false;
    };
  }, [tick]);

  // Los enlaces necesitan el servidor: en modo de prueba local no hay nada que mostrar.
  if (!backendConfigured) return null;

  const link = stats ? referralLink(stats.code) : '';
  const count = stats?.count ?? 0;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copia tu enlace:', link);
    }
  }

  async function share() {
    const text = inviteMessage(link);
    const nav = navigator as Navigator & {
      canShare?: (data?: ShareData) => boolean;
      share?: (data: ShareData) => Promise<void>;
    };
    // Con el póster: manda la imagen y el enlace juntos (el enlace sale como pie de foto). Si el
    // navegador no soporta compartir archivos, cae al share de solo texto y, si tampoco hay eso,
    // a WhatsApp Web con el texto.
    try {
      const res = await fetch('/zikui-harabim.jpg');
      const blob = await res.blob();
      const file = new File([blob], 'zikui-harabim.jpg', { type: 'image/jpeg' });
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], title: 'Avodah — זכוי הרבים', text });
        return;
      }
    } catch {
      /* sin imagen o la persona canceló: sigue con el share de solo texto abajo */
    }
    if (nav.share) {
      try {
        await nav.share({ title: 'Avodah', text, url: link });
        return;
      } catch {
        return; // cerró el menú de compartir: no es un error
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  }

  return (
    <section>
      <SectionTitle es="Invita a otros" he="זִכּוּי הָרַבִּים" />
      <Card className="space-y-4 border-gold/50 p-4">
        {state === 'loading' && <p className="text-[13px] text-ink-faint">Cargando tu enlace…</p>}

        {state === 'error' && (
          <div className="space-y-2">
            <p className="text-[13px] text-ink-soft">Tu enlace personal todavía no está disponible. Inténtalo de nuevo en un rato.</p>
            <Btn variant="ghost" onClick={() => setTick((t) => t + 1)}>
              Reintentar
            </Btn>
          </div>
        )}

        {state === 'ready' && stats && (
          <>
            <img
              src="/zikui-harabim.jpg"
              alt="Zikui Harabim — una luz que nunca se apaga"
              className="w-full rounded-xl border border-line"
              loading="lazy"
            />

            <div className="flex items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-gold text-3xl text-gold">
                {count}
              </div>
              <p className="text-[14px] leading-relaxed text-ink">
                {count === 0 ? (
                  <>
                    Aún nadie ha entrado con tu enlace. Cuando alguien se registre con él, lo verás aquí.
                  </>
                ) : (
                  <>
                    <span className="text-gold">Gracias a ti</span>,{' '}
                    {count === 1
                      ? '1 persona ha empezado a registrar su jeshbón hanéfesh'
                      : `${count} personas han empezado a registrar su jeshbón hanéfesh`}
                    . Una mitzvá muy grande.
                  </>
                )}
              </p>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-faint">
              <span className="hebrew text-[13px] text-ink-soft" dir="rtl">
                כָּל הַמְזַכֶּה אֶת הָרַבִּים, אֵין חֵטְא בָּא עַל יָדוֹ
              </span>{' '}
              · Pirkei Avot 5:18 — Quien hace que otros se acerquen al bien, no llega el pecado por su mano.
            </p>

            <div>
              <div className="mb-1 text-[12px] text-ink-faint">Tu enlace personal</div>
              <input
                readOnly
                value={link}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Tu enlace personal de invitación"
                className="w-full rounded-xl border border-line bg-raised px-3 py-2.5 text-[13px] text-ink outline-none"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Btn onClick={share}>Compartir</Btn>
              <Btn variant="ghost" onClick={copy}>
                {copied ? 'Copiado' : 'Copiar enlace'}
              </Btn>
            </div>

            <p className="text-[11px] leading-relaxed text-ink-faint">
              Solo ves cuántas personas entraron, nunca quiénes son. Y a ellas también les llega el aviso de que su información
              es privada.
            </p>
          </>
        )}
      </Card>
    </section>
  );
}
