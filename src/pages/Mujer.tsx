import { Link } from 'react-router-dom';
import { useZury } from '../state/zury';
import { Btn, Card, SectionTitle } from '../components/ui';
import { WOMEN_MITZVOT, defaultTrackedMitzvot } from '../lib/mitzvot';
import { getGender } from '../lib/gender';
import { useT } from '../lib/i18n';

/**
 * Mitzvot de la mujer: las que la Torá y los Sabios le confían de manera especial, y las de su
 * vida diaria (casa, cocina, familia, oración desde el corazón). Cada una dice de qué trata, y con
 * un toque se suma a «Mitzvot de hoy». Es una guía general: cada cual consulta a su rav.
 */
export default function Mujer() {
  const t = useT();
  const settings = useZury((s) => s.settings);
  const saveSettings = useZury((s) => s.saveSettings);

  if (getGender() !== 'mujer') {
    return (
      <Card className="p-5 text-[15px] text-ink-soft">
        {t('Esta sección es para las mujeres. Si tu cuenta tiene el género mal puesto, cámbialo en')}{' '}
        <Link to="/ajustes" className="text-gold underline underline-offset-2">
          {t('Ajustes')}
        </Link>
        .
      </Card>
    );
  }

  const tracked = settings?.trackedMitzvot?.length ? settings.trackedMitzvot : defaultTrackedMitzvot('mujer');
  const on = new Set(tracked);

  async function toggle(id: string) {
    const next = new Set(tracked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    await saveSettings({ trackedMitzvot: [...next] });
  }

  return (
    <div className="space-y-5">
      <SectionTitle es={t('Mitzvot de la mujer')} he="מצוות הנשים" />

      <p className="-mt-2 text-[14px] leading-relaxed text-ink-soft">
        {t(
          'La Torá y los Sabios le confían a la mujer mitzvot muy especiales, y su vida diaria (la casa, la cocina, la familia, la espera, la oración desde el corazón) está llena de avodat Hashem. Aquí están; suma a tu lista de hoy las que sientas tuyas.',
        )}
      </p>

      <div className="space-y-3">
        {WOMEN_MITZVOT.map((m) => {
          const isOn = on.has(m.id);
          return (
            <Card key={m.id} className="space-y-2 p-5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[16px] font-medium text-ink">{m.es}</span>
                <span className="hebrew shrink-0 text-lg text-gold">{m.he}</span>
              </div>
              {m.hint && <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{m.hint}</div>}
              {m.about && <p className="text-[14px] leading-relaxed text-ink-soft">{m.about}</p>}
              <div className="pt-1">
                <Btn variant={isOn ? 'ghost' : 'solid'} onClick={() => void toggle(m.id)}>
                  {isOn ? t('✓ En mi lista de hoy') : t('Sumar a mi lista de hoy')}
                </Btn>
              </div>
            </Card>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        {t(
          'Es una guía general basada en el Shulján Aruj. En lo que aplica a tu vida y a las costumbres de tu comunidad (kisui rosh, taharat hamishpajá, tzniut), consulta siempre a tu rav.',
        )}
      </p>
    </div>
  );
}
