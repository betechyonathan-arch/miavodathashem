import { useZury } from '../state/zury';
import { hebrewDateEs, timeHM } from '../lib/format';
import { pickMusar } from '../lib/musar';
import { baseMusarContext } from '../lib/musar/context';

const GOLD = '#e3bd6c';
const CREAM = '#f7f1e2';
const FAINT = 'rgba(247,241,226,0.72)';
const FAINTER = 'rgba(247,241,226,0.55)';

/**
 * Kaváná de entrada. Después del splash y antes del día: un momento breve para
 * entrar a servir con intención, sobre un fondo oscuro sobrio. Tocar
 * en cualquier parte continúa (no guarda nada, no es un paso obligatorio de
 * datos — es un umbral). Los colores van fijos (no siguen el tema día/noche
 * de la app) porque la foto de fondo es siempre oscura.
 */
export default function Kavana({ onContinue }: { onContinue: () => void }) {
  const day = useZury((s) => s.day);
  const settings = useZury((s) => s.settings);
  const theme = useZury((s) => s.theme);

  const tz = settings?.location.tzid;
  const showMusar = (settings?.musar?.density ?? 'clave') !== 'pie';
  const musar = pickMusar(
    { ...baseMusarContext(settings, day), preferred: ['prioridad'] },
    'kavana',
  );
  const dayType = day?.isShabbat
    ? 'שבת'
    : day?.isErevShabbat
      ? 'ערב שבת'
      : day?.isYomTov
        ? 'יום טוב'
        : 'חול';

  return (
    <button
      onClick={onContinue}
      aria-label="Kaváná de entrada. Tocar para continuar."
      className="fixed inset-0 z-[95] mx-auto flex max-w-md flex-col items-center justify-between overflow-hidden px-8 py-14 text-center"
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 30%, #2a2318 0%, #12141f 70%)' }} />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(8,6,3,0.55) 0%, rgba(8,6,3,0.35) 30%, rgba(8,6,3,0.55) 68%, rgba(6,4,2,0.8) 100%)',
        }}
      />

      {/* Umbral */}
      <div
        className="faderise relative max-w-xs text-[13px] leading-relaxed"
        style={{ color: FAINT, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
      >
        <span className="hebrew block">לְשֵׁם יִחוּד קֻדְשָׁא בְּרִיךְ הוּא וּשְׁכִינְתֵּיהּ</span>
        <span dir="ltr" className="mt-1 block" style={{ color: FAINTER }}>
          Entro a servir a Hashem, ahora, tal como soy.
        </span>
      </div>

      {/* Pasuk central */}
      <div
        className="faderise relative flex flex-col items-center gap-4"
        style={{ animationDelay: '120ms', textShadow: '0 1px 8px rgba(0,0,0,0.65)' }}
      >
        <div className="h-px w-10" style={{ background: `color-mix(in srgb, ${GOLD} 50%, transparent)` }} />
        <p className="hebrew text-3xl leading-snug" style={{ color: GOLD }}>
          שִׁוִּיתִי ה׳ לְנֶגְדִּי תָמִיד
        </p>
        <p className="max-w-xs text-[13px] leading-relaxed" style={{ color: FAINT }}>
          «Tengo presente a Hashem delante de mí, siempre.»
        </p>
        <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: FAINTER }}>
          Tehilim 16:8
        </p>
        <div className="h-px w-10" style={{ background: `color-mix(in srgb, ${GOLD} 50%, transparent)` }} />
        <p className="hebrew mt-2 text-lg" style={{ color: CREAM }}>
          לַעֲבֹד אֶת ה׳ בְּכָל דְּרָכֶיךָ
        </p>
        {showMusar && (
          <div className="mt-3 max-w-xs">
            {musar.he && (
              <p className="hebrew text-[14px] leading-relaxed" dir="rtl" style={{ color: FAINT }}>
                {musar.he}
              </p>
            )}
            <p className="text-[11px] italic leading-relaxed" style={{ color: FAINTER, marginTop: musar.he ? 4 : 0 }}>
              {musar.es}
            </p>
            {musar.sourceEs && (
              <p className="mt-1 text-[10px] uppercase tracking-[0.14em]" style={{ color: 'rgba(247,241,226,0.4)' }}>
                {musar.sourceEs}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Contexto del día + continuar */}
      <div
        className="faderise relative flex flex-col items-center gap-1.5"
        style={{ animationDelay: '240ms', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
      >
        {day && (
          <>
            <p className="hebrew text-[15px]" style={{ color: FAINT }}>
              {day.eveningPhase ? <span style={{ color: FAINTER }}>ליל </span> : null}
              {day.displayHebrewDateHe}
            </p>
            <p className="text-[12px]" style={{ color: FAINTER }}>
              {day.eveningPhase ? `${day.nightLabelEs} · ` : ''}
              {hebrewDateEs(day.displayHebrewDate)} · <span className="hebrew">{dayType}</span>
              {day.holidays?.length ? ` · ${day.holidays[0]}` : ''}
            </p>
            {day.omerDay ? (
              <p className="text-[11px]" style={{ color: FAINTER }}>
                היום {day.omerDay} לעומר
              </p>
            ) : null}
            {tz && (
              <p className="text-[11px]" style={{ color: FAINTER }}>
                {theme === 'night' ? '🌙' : '☀️'} el día termina ~{timeHM(day.endsAt, tz)}
                {settings?.location.label ? ` · ${settings.location.label}` : ''}
              </p>
            )}
            {tz && (
              <p className="text-[10px]" style={{ color: 'rgba(247,241,226,0.45)' }}>
                hora de {tz.split('/').pop()?.replace(/_/g, ' ')}
              </p>
            )}
          </>
        )}
        <span className="hebrew mt-5 text-base" style={{ color: GOLD }}>
          המשך
        </span>
        <span className="text-[11px]" style={{ color: FAINTER }}>
          toca para entrar
        </span>
      </div>
    </button>
  );
}
