import { useEffect, useState } from 'react';
import type { Gender } from '../lib/auth/session';
import { backendConfigured } from '../lib/supabase';
import { getStoredReferral } from '../lib/referral';
import { AuthError, MIN_PASSWORD, login, recoveryLinkError, register, requestPasswordReset } from '../lib/auth/accounts';
import { Btn, Field, inputCls } from '../components/ui';
import { useZury } from '../state/zury';
import { useLang, useT } from '../lib/i18n';

/**
 * Puerta de entrada: crear cuenta o entrar. Se muestra antes de cargar la app.
 * Al tener éxito se recarga la página para abrir la base de datos de ese usuario.
 */
/** Si la persona acaba de cambiar su contraseña, entra directo a "Entrar" con su correo escrito. */
function readAfterReset(): { email: string } | null {
  try {
    const raw = sessionStorage.getItem('avodah.afterReset');
    if (!raw) return null;
    sessionStorage.removeItem('avodah.afterReset');
    const v = JSON.parse(raw) as { email?: string };
    return { email: v.email ?? '' };
  } catch {
    return null;
  }
}

const KNOWN_KEY = 'avodah.hasAccount';
function hasAccountHere(): boolean {
  try {
    return localStorage.getItem(KNOWN_KEY) === '1';
  } catch {
    return false;
  }
}
function rememberAccountHere(): void {
  try {
    localStorage.setItem(KNOWN_KEY, '1');
  } catch {
    /* sin localStorage: solo se pierde el atajo de abrir en "Entrar" */
  }
}

export default function Auth() {
  const t = useT();
  const lang = useLang();
  const saveSettings = useZury((s) => s.saveSettings);
  // La store todavía no se inicializó aquí (Auth se muestra antes que App/init()): se trae el
  // idioma guardado (si lo hay) para que el botón refleje la última preferencia, no siempre 'es'.
  useEffect(() => {
    void useZury.getState().reloadSettings();
  }, []);

  const [after] = useState(readAfterReset);
  // Quien ya tuvo cuenta en este dispositivo (y no llega por un enlace de invitación) ve "Entrar" primero.
  const [mode, setMode] = useState<'login' | 'registro' | 'recuperar'>(
    recoveryLinkError() ? 'recuperar' : after ? 'login' : hasAccountHere() && !getStoredReferral() ? 'login' : 'registro',
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState(after?.email ?? '');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [error, setError] = useState(recoveryLinkError());
  const [notice, setNotice] = useState(after ? 'Tu contraseña cambió. Entra con la nueva.' : '');
  const [cooldown, setCooldown] = useState(0);
  const [busy, setBusy] = useState(false);

  // Tras pedir el enlace, el botón se bloquea 60 s: cada solicitud nueva invalida el correo anterior.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  function switchTo(m: 'login' | 'registro' | 'recuperar') {
    setMode(m);
    setError('');
    setNotice('');
  }

  useEffect(() => {
    document.documentElement.dataset.mode = 'night';
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    try {
      if (mode === 'recuperar') {
        await requestPasswordReset(email);
        setNotice('Si existe una cuenta con ese correo, te enviamos un enlace. Usa solo el correo MÁS RECIENTE y ábrelo una sola vez: si pides otro, el anterior deja de servir. Revisa también el spam.');
        setCooldown(60);
        setBusy(false);
        return;
      }
      if (mode === 'registro') {
        const { session } = await register(name, email, password, gender);
        if (!session) {
          setNotice('Te enviamos un correo para confirmar tu cuenta. Ábrelo, toca el enlace y vuelve aquí a entrar.');
          setMode('login');
          setBusy(false);
          return;
        }
      } else {
        await login(email, password);
      }
      rememberAccountHere();
      window.location.replace('/');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No se pudo completar. Intenta de nuevo.');
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-bg px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() =>
              void saveSettings({ language: lang === 'en' ? 'es' : 'en' }).then(() => {
                // saveSettings también ajusta el tema día/noche según la hora real; esta pantalla
                // siempre se queda en modo noche, así que se vuelve a forzar después de guardar.
                document.documentElement.dataset.mode = 'night';
              })
            }
            className="flex items-center gap-1 rounded-full border border-line bg-raised px-2.5 py-1 text-[11px] text-gold"
            aria-label={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
            title={lang === 'en' ? 'Cambiar a español' : 'Switch to English'}
          >
            <span>🌐</span>
            <span>{lang === 'en' ? 'EN' : 'ES'}</span>
          </button>
        </div>
        <div className="mb-8 text-center">
          <div className="hebrew text-3xl leading-snug text-gold">לעבוד את ה׳ בכל דרכיך</div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink-faint">Avodah</div>
        </div>

        <div className="mb-4 rounded-2xl border border-gold/60 bg-raised p-4">
          <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold">{t('Tu información es privada')}</div>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">
            {t('Tus registros, caídas, metas y kabalot se guardan')} <strong>{t('solo en tu dispositivo')}</strong>
            {t('. Solo tú puedes verlos: nadie más, ni los administradores de la app ni quien la creó.')}
          </p>
          <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
            {backendConfigured
              ? t(
                  'Al servidor solo van tu nombre, tu correo, tu género, cuándo entras a la app y que registraste algo (para saber cuánta gente la usa). Nunca lo que registras.',
                )
              : t('Modo de prueba: nada sale de este dispositivo.')}{' '}
            {t('La IA es opcional y viene apagada; solo si tú la activas, el texto que elijas analizar se envía a Anthropic.')}
          </p>
        </div>

        {backendConfigured && mode === 'registro' && getStoredReferral() && (
          <p className="mb-4 rounded-xl border border-line bg-raised px-4 py-3 text-[13px] leading-relaxed text-ink-soft">
            Alguien te invitó a Avodah. Esa persona solo verá un número, que entró alguien con su enlace:{' '}
            <span className="text-ink">nunca tu nombre, tu correo ni nada de lo que registres.</span>
          </p>
        )}

        <div className="mb-4 grid grid-cols-2 rounded-xl border border-line bg-raised p-1 text-[14px]">
          {(['registro', 'login'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError('');
                setNotice('');
              }}
              className={`rounded-lg py-2 transition-colors ${mode === m || (m === 'login' && mode === 'recuperar') ? 'bg-gold font-medium text-[#1a140a]' : 'text-ink-soft'}`}
            >
              {m === 'registro' ? t('Crear cuenta') : t('Entrar')}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="sefer-frame space-y-4 rounded-2xl border border-line bg-raised p-5">
          {mode === 'registro' && (
            <Field label={t('Nombre')}>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
            </Field>
          )}
          {mode === 'registro' && (
            <div>
              <span className="mb-1 block text-[13px] font-medium text-ink-soft">{t('Eres')}</span>
              <div className="grid grid-cols-2 gap-2">
                {(['hombre', 'mujer'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    aria-pressed={gender === g}
                    className={`rounded-xl border px-3 py-2.5 text-[15px] transition-colors ${
                      gender === g
                        ? 'border-gold bg-gold font-medium text-[#1a140a]'
                        : 'border-line bg-raised text-ink-soft hover:border-gold'
                    }`}
                  >
                    {g === 'hombre' ? t('Hombre') : t('Mujer')}
                  </button>
                ))}
              </div>
              <span className="mt-1 block text-[11px] text-ink-faint">
                {t('Según la halajá, las mitzvot y las preguntas que verás son distintas para hombres y mujeres.')}
              </span>
            </div>
          )}
          <Field label={t('Correo')}>
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </Field>
          {mode !== 'recuperar' && (
          <Field label={t('Contraseña')} hint={mode === 'registro' ? `${t('Mínimo')} ${MIN_PASSWORD} ${t('caracteres.')}` : undefined}>
            <input
              className={inputCls}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
              required
            />
          </Field>
          )}
          {mode === 'login' && backendConfigured && (
            <button
              type="button"
              onClick={() => {
                setMode('recuperar');
                setError('');
                setNotice('');
              }}
              className="block text-[14px] text-gold underline underline-offset-2"
            >
              {t('¿Olvidaste tu contraseña?')}
            </button>
          )}
          {mode === 'recuperar' && (
            <p className="text-[12px] text-ink-faint">{t('Escribe tu correo y te mandamos un enlace para crear una contraseña nueva.')}</p>
          )}
          {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
          {notice && <p className="text-[13px] text-[var(--success)]">{notice}</p>}
          <Btn type="submit" disabled={busy || (mode === 'recuperar' && cooldown > 0)} className="w-full">
            {busy
              ? '…'
              : mode === 'registro'
                ? t('Crear mi cuenta')
                : mode === 'recuperar'
                  ? cooldown > 0
                    ? `${t('Espera')} ${cooldown} s`
                    : t('Enviar enlace')
                  : t('Entrar')}
          </Btn>
        </form>

        {mode === 'registro' && (
          <p className="mt-3 text-center text-[13px] text-ink-soft">
            {t('¿Ya tienes cuenta?')}{' '}
            <button type="button" onClick={() => switchTo('login')} className="text-gold underline underline-offset-2">
              {t('Entrar')}
            </button>
            {backendConfigured && (
              <>
                {' · '}
                <button type="button" onClick={() => switchTo('recuperar')} className="text-gold underline underline-offset-2">
                  {t('Olvidé mi contraseña')}
                </button>
              </>
            )}
          </p>
        )}
        {mode === 'recuperar' && (
          <p className="mt-3 text-center text-[13px] text-ink-soft">
            <button type="button" onClick={() => switchTo('login')} className="text-gold underline underline-offset-2">
              {t('‹ Volver a entrar')}
            </button>
          </p>
        )}

        <p className="mt-4 text-center text-[12px] leading-relaxed text-ink-faint">
          {backendConfigured
            ? t(
                'Puedes entrar a tu cuenta desde cualquier dispositivo, pero tus registros viven solo en el que los creó: expórtalos seguido desde Ajustes.',
              )
            : t('Modo de prueba: tu cuenta y tus registros se guardan solo en este dispositivo.')}
        </p>
      </div>
    </div>
  );
}
