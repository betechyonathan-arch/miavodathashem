import { useEffect, useState } from 'react';
import { AuthError, MIN_PASSWORD, hasRecoverySession, setNewPassword } from '../lib/auth/accounts';
import { Btn, Field, inputCls } from '../components/ui';

/**
 * Pantalla a la que llega quien abre el enlace de "olvidé mi contraseña" del correo.
 * Crea una contraseña nueva y devuelve al login.
 */
export default function ResetPassword() {
  const [state, setState] = useState<'checking' | 'form' | 'invalid' | 'done'>('checking');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.mode = 'night';
    hasRecoverySession().then(
      (ok) => setState(ok ? 'form' : 'invalid'),
      () => setState('invalid'),
    );
  }, []);

  function goToLogin() {
    window.location.replace('/'); // sin el #token: la app abre en la pantalla de entrar
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (pw !== pw2) return setError('Las dos contraseñas no coinciden.');
    setBusy(true);
    try {
      await setNewPassword(pw);
      setState('done');
    } catch (err) {
      setError(err instanceof AuthError ? err.message : 'No se pudo cambiar la contraseña.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-bg px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="hebrew text-3xl leading-snug text-gold">לעבוד את ה׳ בכל דרכיך</div>
          <div className="mt-2 text-[11px] uppercase tracking-[0.18em] text-ink-faint">Contraseña nueva</div>
        </div>

        <div className="sefer-frame space-y-4 rounded-2xl border border-line bg-raised p-5">
          {state === 'checking' && <p className="text-[13px] text-ink-faint">Verificando el enlace…</p>}

          {state === 'invalid' && (
            <>
              <p className="text-[14px] text-ink">Este enlace no es válido, venció o ya se usó.</p>
              <p className="text-[12px] text-ink-faint">En la pantalla de entrar, toca "¿Olvidaste tu contraseña?" para pedir uno nuevo.</p>
              <Btn onClick={goToLogin} className="w-full">
                Ir a entrar
              </Btn>
            </>
          )}

          {state === 'form' && (
            <form onSubmit={submit} className="space-y-4">
              <Field label="Contraseña nueva" hint={`Mínimo ${MIN_PASSWORD} caracteres.`}>
                <input className={inputCls} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required />
              </Field>
              <Field label="Repite la contraseña">
                <input className={inputCls} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
              </Field>
              {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
              <Btn type="submit" disabled={busy} className="w-full">
                {busy ? '…' : 'Guardar contraseña'}
              </Btn>
            </form>
          )}

          {state === 'done' && (
            <>
              <p className="text-[14px] text-[var(--success)]">Listo: tu contraseña cambió. Entra con la nueva.</p>
              <Btn onClick={goToLogin} className="w-full">
                Entrar
              </Btn>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
