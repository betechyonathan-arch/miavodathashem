import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useZury } from '../state/zury';
import { addEntry } from '../lib/db/repo';
import {
  MUSAR_BY_ID,
  MUSAR_THEMES,
  linesForTheme,
  pickMusar,
  searchMusar,
  type MusarLine,
  type MusarTheme,
} from '../lib/musar';
import { baseMusarContext } from '../lib/musar/context';
import { getParashaMusar, type ParashaMusar } from '../lib/musar/sefariaParasha';
import { buildParashaShareImage, shareOrDownloadImage } from '../lib/musar/shareImage';
import { Btn, Card, Field, SectionTitle, inputCls } from '../components/ui';
import { useT } from '../lib/i18n';

/** מוסר הפרשה — comentario en vivo desde Sefaria sobre la parashá de esta semana. */
function ParashaMusarCard() {
  const t = useT();
  const settings = useZury((s) => s.settings);
  const day = useZury((s) => s.day);
  const [data, setData] = useState<ParashaMusar | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const enabled = settings?.musar?.sefariaParashaEnabled ?? true;

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    getParashaMusar().then((d) => {
      if (alive) setData(d);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  async function saveIt() {
    if (!day || !data) return;
    await addEntry({
      dayId: day.dayId,
      hebrewDate: day.hebrewDate,
      area: 'musar',
      text: `${data.he}\n${data.en}`,
      tags: ['musar-parasha', data.commentator],
      source: 'quick',
      fields: { _musarParasha: { ref: data.ref, parasha: data.parashaEn } },
    });
  }

  async function shareIt() {
    if (!data || sharing) return;
    setSharing(true);
    setShareMsg('');
    try {
      const blob = await buildParashaShareImage({
        parashaHe: data.parashaHe,
        he: data.he,
        heRef: data.heRef,
        commentatorHe: data.commentatorHe,
      });
      const outcome = await shareOrDownloadImage(blob, `musar-${data.parashaEn}.png`, `מוסר הפרשה · ${data.parashaHe}`);
      setShareMsg(outcome === 'downloaded' ? t('Imagen descargada — ábrela y compártela al estado de WhatsApp.') : '');
    } catch {
      setShareMsg(t('No se pudo generar la imagen. Intenta de nuevo.'));
    } finally {
      setSharing(false);
      setTimeout(() => setShareMsg(''), 5000);
    }
  }

  if (!enabled || data === null) return null; // desactivado, o falló y no rompemos nada

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">{t('Musar de la parashá')}</div>
        {data && <div className="hebrew text-lg text-gold">{data.parashaHe}</div>}
      </div>
      <Card className="space-y-3 p-5">
        {data === undefined ? (
          <p className="text-center text-[12px] text-ink-faint">{t('Buscando en Sefaria…')}</p>
        ) : (
          <>
            <p className="hebrew text-right text-[15px] leading-relaxed text-ink" dir="rtl">
              {data.he}
            </p>
            <p className="text-[13px] leading-relaxed text-ink-soft">{data.en}</p>
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
                {data.commentator} · Sefaria
              </p>
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={shareIt} disabled={sharing}>
                  {sharing ? t('Generando…') : t('📤 Compartir')}
                </Btn>
                <Btn variant="ghost" onClick={saveIt}>
                  {t('Guardar')}
                </Btn>
              </div>
            </div>
            {shareMsg && <p className="text-center text-[11px] text-ink-faint">{shareMsg}</p>}
          </>
        )}
      </Card>
    </div>
  );
}

const THEME_ORDER: MusarTheme[] = ['prioridad', 'exigencia', 'teshuva', 'zman', 'simja', 'anava'];

function LineRow({
  line,
  fav,
  onFav,
}: {
  line: MusarLine;
  fav: boolean;
  onFav: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <button
        onClick={onFav}
        aria-label={fav ? t('Quitar de favoritas') : t('Guardar como favorita')}
        className={`mt-0.5 text-[15px] leading-none ${fav ? 'text-gold' : 'text-ink-faint'}`}
      >
        {fav ? '★' : '☆'}
      </button>
      <div className="min-w-0 flex-1">
        {line.he && (
          <p className="hebrew text-[16px] leading-relaxed text-ink" dir="rtl">
            {line.he}
          </p>
        )}
        <p className={`text-[13px] leading-relaxed text-ink-soft ${line.he ? 'mt-1' : ''}`}>{line.es}</p>
        {line.sourceEs && (
          <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            {line.sourceEs}
            {line.mine ? t(' · escrito por ti') : ''}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * מוסר — la capa de frases, toda en un lugar: la frase de hoy (elegida por el
 * contexto), el seder breve para asentarla, las seis áreas del musar con su
 * fuente, tus favoritas y la búsqueda.
 */
export default function Musar() {
  const t = useT();
  const { settings, day, saveSettings } = useZury();
  const [openTheme, setOpenTheme] = useState<MusarTheme | null>(null);
  const [nonce, setNonce] = useState(0);
  const [q, setQ] = useState('');
  const [reflection, setReflection] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const favorites = settings?.musar?.favorites ?? [];
  const favSet = useMemo(() => new Set(favorites), [favorites]);

  const ctx = useMemo(() => baseMusarContext(settings, day), [settings, day]);
  const todayLine = useMemo(() => pickMusar(ctx, `musar-page-${nonce}`), [ctx, nonce]);
  const results = useMemo(() => searchMusar(q), [q]);

  function toggleFav(id: string) {
    const next = favSet.has(id) ? favorites.filter((x) => x !== id) : [...favorites, id];
    void saveSettings({ musar: { ...settings!.musar, favorites: next } });
  }

  async function saveSeder() {
    if (!day) return;
    const body = [
      todayLine.he ? todayLine.he : null,
      `«${todayLine.es}»${todayLine.sourceEs ? ` — ${todayLine.sourceEs}` : ''}`,
      reflection.trim() ? `\n${reflection.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await addEntry({
      dayId: day.dayId,
      hebrewDate: day.hebrewDate,
      area: 'musar',
      text: body,
      tags: ['musar-seder', todayLine.theme],
      source: 'quick',
      fields: { _musar: { id: todayLine.id, theme: todayLine.theme } },
    });
    setReflection('');
    setSavedMsg(t('Guardado en tus registros de hoy, en el área de Musar.'));
    setTimeout(() => setSavedMsg(''), 3500);
  }

  if (!settings) return null;
  const density = settings.musar?.density ?? 'clave';
  const densityText = t(
    density === 'pie'
      ? 'Ahora la frase solo aparece al pie de las pantallas.'
      : density === 'maximo'
        ? 'La frase aparece al pie, en los momentos clave y en el tablero.'
        : 'La frase aparece al pie y en los momentos clave del día.',
  );

  return (
    <div className="space-y-6">
      <SectionTitle es={t('Musar · frases al hueso')} he="מוּסָר" />
      <p className="-mt-3 text-[12px] leading-relaxed text-ink-faint">
        {t(
          'Un recordatorio corto, elegido por lo que está pasando hoy: si caíste pesa la vuelta; en Elul y en los Diez Días pesa la teshuvá; si no, rota entre poner a Hashem primero y no aflojar. Se ajusta a tu nivel de exigencia.',
        )}
      </p>

      <ParashaMusarCard />

      {/* Frase de hoy */}
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">{t('Frase de hoy')}</div>
          <div className="hebrew text-lg text-gold">{MUSAR_THEMES[todayLine.theme].he}</div>
        </div>
        <Card className="space-y-3 p-5 text-center">
          {todayLine.he && (
            <p className="hebrew text-2xl leading-snug text-gold" dir="rtl">
              {todayLine.he}
            </p>
          )}
          <p className="text-[14px] leading-relaxed text-ink">{todayLine.es}</p>
          {todayLine.sourceEs && (
            <p className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">
              {todayLine.sourceEs}
              {todayLine.mine ? t(' · escrito por ti') : ''}
            </p>
          )}
          <div className="flex items-center justify-center gap-2 pt-1">
            <Btn variant="ghost" onClick={() => setNonce((n) => n + 1)}>
              {t('Otra')}
            </Btn>
            <Btn variant={favSet.has(todayLine.id) ? 'solid' : 'ghost'} onClick={() => toggleFav(todayLine.id)}>
              {favSet.has(todayLine.id) ? t('★ Favorita') : t('☆ Guardar')}
            </Btn>
          </div>
        </Card>
      </div>

      {/* Seder musar */}
      <div>
        <SectionTitle es={t('Asentarla · ~1 min')} he="סֵדֶר מוּסָר" />
        <Card className="space-y-3 p-4">
          <p className="text-[12px] leading-relaxed text-ink-faint">
            {t(
              'Léela despacio dos veces. Después escribe, en una línea, qué te pide a ti hoy — y guárdalo como registro para volver a verlo.',
            )}
          </p>
          <Field label={t('¿Qué me pide esta frase hoy?')}>
            <textarea
              className={inputCls + ' resize-none'}
              rows={2}
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder={t('Una cosa concreta…')}
            />
          </Field>
          <Btn className="w-full" onClick={saveSeder} disabled={!reflection.trim()}>
            {t('Guardar como registro')}
          </Btn>
          {savedMsg && <p className="text-center text-[12px] text-[var(--success)]">{savedMsg}</p>}
        </Card>
      </div>

      {/* Favoritas */}
      {favorites.length > 0 && (
        <div>
          <SectionTitle es={t('Tus favoritas')} he="נִבְחָרוֹת" />
          <Card className="divide-y divide-line">
            {favorites
              .map((id) => MUSAR_BY_ID[id])
              .filter(Boolean)
              .map((l) => (
                <LineRow key={l.id} line={l} fav onFav={() => toggleFav(l.id)} />
              ))}
          </Card>
        </div>
      )}

      {/* Temas */}
      <div>
        <SectionTitle es={t('Las seis áreas del musar')} he="שֵׁשׁ מִדּוֹת" />
        <div className="space-y-2">
          {THEME_ORDER.map((theme) => {
            const meta = MUSAR_THEMES[theme];
            const lines = linesForTheme(theme, settings.strictness);
            const open = openTheme === theme;
            return (
              <Card key={theme} className="overflow-hidden">
                <button
                  onClick={() => setOpenTheme(open ? null : theme)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="hebrew text-[17px] text-gold">{meta.he}</span>
                      <span className="text-[12px] text-ink-soft">{meta.es}</span>
                    </span>
                    <span className="mt-1 block text-[11px] leading-relaxed text-ink-faint">{meta.desc}</span>
                  </span>
                  <span className="mt-1 text-ink-faint">{open ? '−' : '+'}</span>
                </button>
                {open && (
                  <div className="border-t border-line">
                    <p className="hebrew px-4 pt-3 text-right text-[13px] text-ink-soft" dir="rtl">
                      {meta.mekor}
                    </p>
                    <p className="px-4 pb-2 pt-1 text-[11px] leading-relaxed text-ink-faint">{meta.mekorEs}</p>
                    <div className="divide-y divide-line border-t border-line">
                      {lines.map((l) => (
                        <LineRow key={l.id} line={l} fav={favSet.has(l.id)} onFav={() => toggleFav(l.id)} />
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Buscar */}
      <div>
        <SectionTitle es={t('Buscar')} he="חִפּוּשׂ" />
        <input
          className={inputCls}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('Palabra, tema o fuente…')}
        />
        {q.trim() && (
          <Card className="mt-2 divide-y divide-line">
            {results.length === 0 ? (
              <p className="px-4 py-3 text-[12px] text-ink-faint">
                {t('Nada con')} «{q.trim()}»
              </p>
            ) : (
              results.map((l) => (
                <LineRow key={l.id} line={l} fav={favSet.has(l.id)} onFav={() => toggleFav(l.id)} />
              ))
            )}
          </Card>
        )}
      </div>

      <p className="text-center text-[11px] text-ink-faint">
        {densityText}{' '}
        <Link to="/ajustes#musar" className="text-gold">
          {t('cambiar')}
        </Link>
      </p>
    </div>
  );
}
