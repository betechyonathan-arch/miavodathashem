import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { getSession } from '../lib/auth/session';
import { getGender } from '../lib/gender';
import { presetsFor } from '../lib/kabala';
import { Btn, Card } from './ui';

/**
 * Bienvenida de una cuenta nueva. Se ve una sola vez: explica qué es la app, deja claro
 * que todo es privado y ofrece empezar con una kabalá sugerida (o ninguna).
 */
export default function Welcome() {
  const navigate = useNavigate();
  const saveSettings = useZury((s) => s.saveSettings);
  const [busy, setBusy] = useState(false);
  const name = getSession()?.name?.split(' ')[0] ?? '';
  const gender = getGender();
  const recommended = presetsFor(gender)[0];

  async function finish(goTo: string) {
    setBusy(true);
    await saveSettings({ welcomeDoneAt: new Date().toISOString() });
    navigate(goTo);
  }

  return (
    <div className="min-h-full bg-bg px-5 py-10">
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="text-center">
          <div className="hebrew text-3xl leading-snug text-gold">בָּרוּךְ הַבָּא</div>
          <h1 className="mt-1 text-2xl text-ink">
            {gender === 'mujer' ? 'Bienvenida' : 'Bienvenido'}
            {name ? `, ${name}` : ''}
          </h1>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
            Un lugar para vivir tu día con Hashem: registrar lo que vives, mirarlo con verdad y avanzar de a poco.
          </p>
        </div>

        <Card className="border-gold/50 p-4">
          <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-gold">Tu información es privada</div>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
            Todo lo que registras — tu día, tus kabalot, tus metas — se guarda <strong>solo en tu dispositivo</strong>.
            Nadie más puede verlo: ni los administradores de la app ni quien la creó. Lo único que ve un administrador es tu nombre, tu correo y cuándo entras.
          </p>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-ink-faint">Cómo funciona</div>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="text-ink">1 · Registra.</span> Toca el botón <span className="text-ink">+</span> cuando algo pase:
            un acierto, una caída, una tefilá. Sin juicio: solo la verdad.
          </p>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="text-ink">2 · Mírate.</span> Al final del día, el cheshbon te pregunta solo lo que falta, y ves
            tu progreso por semana, mes y año.
          </p>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            <span className="text-ink">3 · Comprométete.</span> Crea kabalot: compromisos con fecha, con los días que tú elijas.
          </p>
        </Card>

        {recommended && (
          <Card className="space-y-2 p-4">
            <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-ink-faint">
              Para empezar, te sugerimos
            </div>
            <div className="text-[15px] text-ink">{recommended.es}</div>
            <div className="hebrew text-[14px] text-gold">{recommended.he}</div>
            <p className="text-[12px] leading-relaxed text-ink-soft">{recommended.blurb}</p>
            <Btn onClick={() => finish(`/kabala?nueva=${recommended.id}`)} disabled={busy} className="w-full">
              Empezar esta kabalá
            </Btn>
            <button
              onClick={() => finish('/kabala')}
              disabled={busy}
              className="block w-full text-center text-[13px] text-gold"
            >
              Ver otras opciones o crear la mía
            </button>
          </Card>
        )}

        <Btn variant="ghost" onClick={() => finish('/')} disabled={busy} className="w-full">
          Entrar sin kabalá por ahora
        </Btn>
      </div>
    </div>
  );
}
