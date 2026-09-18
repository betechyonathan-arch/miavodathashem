import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import { createKabala, markKabalaDay, updateKabala } from '../lib/db/repo';
import { KABALA_KEDUSHA_PRESET, kabalaProgress } from '../lib/kabala';
import { resolveJewishDay, keyToNoon } from '../lib/jewishDay';
import { hebrewDateEs } from '../lib/format';
import type { Kabala } from '../lib/db/schema';
import { Btn, Card, Field, Ring, Sheet, SectionTitle, inputCls } from '../components/ui';

export default function KabalaPage() {
  const { day, now } = useZury();
  const all = useLiveQuery(() => db.kabalot.toArray(), [], [] as Kabala[]);

  const active = useMemo(
    () =>
      all
        .filter((k) => k.status === 'activa')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null,
    [all],
  );
  const past = useMemo(
    () => all.filter((k) => k.status !== 'activa').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all],
  );

  if (!day) return null;

  return (
    <div className="space-y-5">
      <SectionTitle he="קַבָּלָה" es="Kabalá con fecha" />
      {active ? (
        <ActiveKabala k={active} now={now} />
      ) : (
        <NewKabala startDayId={day.dayId} startHebrewDate={day.hebrewDate} />
      )}

      {past.length > 0 && (
        <div>
          <SectionTitle es="Kabalot anteriores" he="מַה שֶּׁהָיָה" />
          <Card className="divide-y divide-line">
            {past.map((k) => {
              const p = kabalaProgress(k, now);
              return (
                <div key={k.id} className="flex items-center justify-between px-4 py-3">
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink">{k.es}</div>
                    <div className="text-[11px] text-ink-faint">
                      Desde {hebrewDateEs(k.startHebrewDate)} · {p.cleanDays}/{k.targetDays} días
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${
                      k.status === 'completada'
                        ? 'border-[var(--success)] text-[var(--success)]'
                        : 'border-line text-ink-faint'
                    }`}
                  >
                    {k.status === 'completada' ? 'completada' : 'no terminada'}
                  </span>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-ink-faint">
        Se toma <span className="text-ink-soft">bli neder</span>. Una caída no es un veredicto y no
        significa que Hashem retiene la yeshuá: lo que sigue es el regreso, ahora. Marcar la vuelta
        también cuenta.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NewKabala({ startDayId, startHebrewDate }: { startDayId: string; startHebrewDate: string }) {
  const [kavana, setKavana] = useState(KABALA_KEDUSHA_PRESET.kavana);
  const [target, setTarget] = useState(KABALA_KEDUSHA_PRESET.targetDays);
  const [mode, setMode] = useState<Kabala['mode']>(KABALA_KEDUSHA_PRESET.mode);
  const [showOpts, setShowOpts] = useState(false);
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    await createKabala({
      he: KABALA_KEDUSHA_PRESET.he,
      es: `${target} días de kedushá`,
      kavana: kavana.trim() || KABALA_KEDUSHA_PRESET.kavana,
      area: KABALA_KEDUSHA_PRESET.area,
      targetDays: target,
      mode,
      onFall: mode === 'acumulativo' ? 'pausa' : 'reinicia',
      startDayId,
      startHebrewDate,
      seedStartDay: 'limpio',
    });
    setBusy(false);
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <div className="hebrew text-2xl leading-tight text-gold">{KABALA_KEDUSHA_PRESET.he}</div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">
          {target} días de shemirat habrit — kedushá de la brit, nada de masturbación. El día 1 es
          hoy, <span className="text-ink">{hebrewDateEs(startHebrewDate)}</span>.
        </p>
      </div>

      <Field label="Kavaná" hint="Para qué la haces. Se muestra cada día.">
        <textarea className={inputCls} rows={4} value={kavana} onChange={(e) => setKavana(e.target.value)} />
      </Field>

      <button onClick={() => setShowOpts((v) => !v)} className="text-[12px] text-gold">
        {showOpts ? 'Ocultar opciones' : 'Opciones (meta y modo)'}
      </button>

      {showOpts && (
        <div className="space-y-3 rounded-xl border border-line bg-sunken p-3">
          <Field label="Meta">
            <div className="flex gap-1.5">
              {[40, 90, 180].map((n) => (
                <button
                  key={n}
                  onClick={() => setTarget(n)}
                  className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                    target === n ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'
                  }`}
                >
                  {n} días
                </button>
              ))}
            </div>
          </Field>
          <Field
            label="Cómo cuenta una caída"
            hint={
              mode === 'acumulativo'
                ? 'Acumulativo: sumas días limpios en total; una caída pausa, no borra. Menos riesgo de yeush.'
                : 'Racha: días seguidos; una caída la reinicia a 0. Más fuerza al contador, más duro.'
            }
          >
            <div className="flex gap-1.5">
              <button
                onClick={() => setMode('acumulativo')}
                className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                  mode === 'acumulativo' ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'
                }`}
              >
                Acumulativo
              </button>
              <button
                onClick={() => setMode('racha')}
                className={`rounded-lg border px-3 py-1.5 text-[13px] ${
                  mode === 'racha' ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'
                }`}
              >
                Racha
              </button>
            </div>
          </Field>
        </div>
      )}

      <Btn onClick={begin} disabled={busy} className="w-full">
        {busy ? 'Comenzando…' : 'Comenzar — hoy es el día 1'}
      </Btn>
      <p className="text-[11px] text-ink-faint">Bli neder.</p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

function ActiveKabala({ k, now }: { k: Kabala; now: Date }) {
  const navigate = useNavigate();
  const { day, settings } = useZury();
  const p = kabalaProgress(k, now, day?.dayId);
  const [returnOpen, setReturnOpen] = useState(false);
  const [note, setNote] = useState('');
  const [confirmClean, setConfirmClean] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);

  const milestone = p.milestonesToCelebrate[0] ?? null;

  async function mark(status: 'limpio' | 'caida') {
    if (!day) return;
    await markKabalaDay({
      id: k.id,
      dayId: p.todayKey,
      hebrewDate: day.hebrewDate,
      status,
      note: status === 'caida' ? note.trim() || undefined : undefined,
    });
    setReturnOpen(false);
    setNote('');
    setConfirmClean(false);
  }

  async function markPast(key: string, status: 'limpio' | 'caida') {
    if (!settings) return;
    const info = resolveJewishDay(keyToNoon(key), settings);
    await markKabalaDay({ id: k.id, dayId: key, hebrewDate: info.hebrewDate, status });
    setEditKey(null);
  }

  async function dismissMilestone() {
    if (milestone == null) return;
    await updateKabala(k.id, { milestonesSeen: [...(k.milestonesSeen ?? []), milestone] });
  }

  async function finish(renewTarget?: number) {
    await updateKabala(k.id, { status: 'completada', completedAt: new Date().toISOString() });
    if (renewTarget && day) {
      await createKabala({
        he: k.he,
        es: `${renewTarget} días de kedushá`,
        kavana: k.kavana,
        area: k.area,
        targetDays: renewTarget,
        mode: k.mode,
        onFall: k.onFall,
        startDayId: day.dayId,
        startHebrewDate: day.hebrewDate,
        seedStartDay: 'limpio',
      });
    }
  }

  async function abandon() {
    await updateKabala(k.id, { status: 'abandonada', abandonedAt: new Date().toISOString() });
  }

  return (
    <div className="space-y-5">
      {/* Progreso */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Ring value={p.pct} size={104} stroke={8} emoji={`${p.cleanDays}`} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Kabalá · bli neder</div>
            <div className="hebrew text-2xl leading-tight text-gold">
              קדושה · יום {p.cleanDays} מ־{p.target}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              {p.done
                ? '¡Completada! Mira abajo para cerrarla o renovarla.'
                : `${p.remaining} ${p.remaining === 1 ? 'día limpio' : 'días limpios'} para completar · día ${p.elapsedDays} desde el inicio`}
            </p>
            <div className="mt-0.5 text-[11px] text-ink-faint">
              {k.mode === 'acumulativo' ? 'Acumulativo' : 'Racha'}
              {p.fallDays > 0 ? ` · ${p.fallDays} ${p.fallDays === 1 ? 'caída' : 'caídas'} registradas` : ''}
            </div>
          </div>
        </div>

        {/* Tira de los últimos días */}
        <div className="mt-4 flex flex-wrap gap-1">
          {p.strip.map((s) => {
            const editable = s.status === 'sin' && s.key !== p.todayKey;
            const cls = `h-3.5 w-3.5 rounded-[3px] border ${
              s.status === 'limpio'
                ? 'border-transparent bg-[var(--success)]'
                : s.status === 'caida'
                  ? 'border-transparent bg-[var(--danger)]'
                  : editable
                    ? 'border-line border-dashed bg-sunken'
                    : 'border-line bg-sunken'
            }`;
            return editable ? (
              <button key={s.key} title={`${s.key} · sin marcar, toca para completar`} onClick={() => setEditKey(s.key)} className={cls} />
            ) : (
              <span key={s.key} title={s.key} className={cls} />
            );
          })}
        </div>
        <p className="mt-1 text-[10px] text-ink-faint">
          Un día sin marcar (borde punteado) se puede completar después — toca el cuadro.
        </p>

        {p.nextMilestone && !p.done && (
          <p className="mt-3 text-[11px] text-ink-faint">
            Próximo hito: <span className="text-ink-soft">{p.nextMilestone} días</span>
            {p.nextMilestone === 18 ? ' (חי)' : ''}.
          </p>
        )}
      </Card>

      {/* Marca de hoy */}
      {!p.done && (
        <Card className="space-y-3 p-4">
          <div className="text-[13px] font-medium text-ink">
            Hoy · {hebrewDateEs(day?.hebrewDate ?? k.startHebrewDate)}
          </div>
          {p.todayStatus === 'limpio' ? (
            <div className="rounded-xl border border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-3 text-[13px] text-ink">
              שָׁמַרְתִּי הַיּוֹם · Hoy cuidaste. חזק ואמץ.
              <button onClick={() => setReturnOpen(true)} className="mt-1 block text-[11px] text-ink-faint underline">
                Corregir a "caí"
              </button>
            </div>
          ) : p.todayStatus === 'caida' ? (
            <div className="rounded-xl border border-[var(--danger)] p-3 text-[13px] text-ink">
              Registraste una caída hoy. El regreso ya empezó al escribirlo. Mañana de nuevo, sin
              arrastrar la culpa.
              <button onClick={() => setConfirmClean(true)} className="mt-1 block text-[11px] text-ink-faint underline">
                Cambiar a "cuidé hoy"
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Btn onClick={() => setConfirmClean(true)} className="flex-1">
                שמרתי · Cuidé hoy
              </Btn>
              <Btn variant="danger" onClick={() => setReturnOpen(true)} className="flex-1">
                Caí
              </Btn>
            </div>
          )}
          <p className="text-[11px] text-ink-faint">
            La raíz es el día: shemirat einayim, lo que ves y scrolleas, no quedarte solo con el
            teléfono de noche, la hora de dormir.
          </p>
        </Card>
      )}

      {/* Completada */}
      {p.done && (
        <Card className="space-y-3 border-gold/50 p-5">
          <div className="hebrew text-xl text-gold">תָּם וְנִשְׁלַם · {p.target} días</div>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Completaste la kabalá. Que sea le-zejut para tu zivug hagun bekarov. Puedes cerrarla,
            renovarla o subir el nivel.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => finish(40)}>Renovar 40 días</Btn>
            <Btn variant="ghost" onClick={() => finish(90)}>Subir a 90</Btn>
            <Btn variant="quiet" onClick={() => finish()}>Terminar</Btn>
          </div>
        </Card>
      )}

      {/* Kavaná */}
      <Card className="p-4">
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">Kavaná</div>
        <p className="mt-1 text-[13px] leading-relaxed text-ink" dir="auto">
          {k.kavana}
        </p>
      </Card>

      {/* Apoyo */}
      <div>
        <SectionTitle es="Cuando pega el momento" he="בְּעֵת נִסָּיוֹן" />
        <Card className="space-y-2 p-4 text-[13px] leading-relaxed text-ink-soft">
          <p>· Párate. Cambia de cuarto. Sal del teléfono.</p>
          <p>
            · Un kapitel — Tehilim 51.{' '}
            <span className="hebrew text-ink">לֵב טָהוֹר בְּרָא־לִי אֱלֹהִים וְרוּחַ נָכוֹן חַדֵּשׁ בְּקִרְבִּי</span>
          </p>
          <p>· 2 minutos de hitbodedut: pídele a Hashem, con tus palabras, ayuda — y el zivug.</p>
          <p>
            · Tikún HaKlali si puedes.{' '}
            <button onClick={() => navigate('/musar')} className="text-gold underline">
              Ir a Musar
            </button>
          </p>
        </Card>
      </div>

      <button onClick={abandon} className="px-1 text-[11px] text-ink-faint underline">
        Dejar esta kabalá
      </button>

      {/* Hito */}
      <Sheet
        open={milestone != null}
        onClose={dismissMilestone}
        title={<div className="hebrew text-xl text-gold">חֲזַק · {milestone} días</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          {milestone} días de kedushá. No es poco: cada día limpio es una elección repetida. Sigue —
          la meta son {p.target}. Que este zejut suba por tu zivug hagun.
        </p>
        <Btn onClick={dismissMilestone} className="mt-4 w-full">
          חזק ואמץ
        </Btn>
      </Sheet>

      {/* Regreso / caída */}
      <Sheet
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title={<div className="hebrew text-xl text-gold">הַחֲזָרָה · El regreso</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Registrar la caída no es castigo — es verdad, y la verdad es el principio del regreso. Esto{' '}
          <span className="text-ink">no</span> significa que Hashem te retenga el zivug. Levántate
          ahora, sin arrastrar la culpa.
        </p>
        <p className="mt-3 hebrew text-[15px] leading-relaxed text-ink" dir="rtl">
          לֵב טָהוֹר בְּרָא־לִי אֱלֹהִים · וְרוּחַ נָכוֹן חַדֵּשׁ בְּקִרְבִּי
        </p>
        <p className="text-[11px] text-ink-faint">Tehilim 51:12</p>
        <div className="mt-4">
          <Field
            label="Si quieres, una línea (opcional)"
            hint="Qué pasó o qué harás distinto. Se guarda como registro de caída."
          >
            <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={() => setReturnOpen(false)} className="flex-1">
            Cancelar
          </Btn>
          <Btn variant="danger" onClick={() => mark('caida')} className="flex-1">
            Registrar y volver
          </Btn>
        </div>
      </Sheet>

      {/* Confirmar día limpio */}
      <Sheet
        open={confirmClean}
        onClose={() => setConfirmClean(false)}
        title={<div className="hebrew text-lg text-gold">שָׁמַרְתִּי הַיּוֹם</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          ¿Marcar hoy como día cuidado? Suma a los {p.target} días de la kabalá.
        </p>
        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={() => setConfirmClean(false)} className="flex-1">
            Aún no
          </Btn>
          <Btn onClick={() => mark('limpio')} className="flex-1">
            Sí, cuidé hoy
          </Btn>
        </div>
      </Sheet>

      {/* Completar un día pasado sin marcar (p. ej. Shabat / Yom Tov sin teléfono) */}
      <Sheet
        open={editKey != null}
        onClose={() => setEditKey(null)}
        title={<div className="hebrew text-lg text-gold">{editKey ?? ''}</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Ese día no quedó marcado — quizás fue Shabat o Yom Tov y no usaste el teléfono. ¿Cómo fue?
        </p>
        <div className="mt-4 flex gap-2">
          <Btn variant="danger" onClick={() => editKey && markPast(editKey, 'caida')} className="flex-1">
            Caí
          </Btn>
          <Btn onClick={() => editKey && markPast(editKey, 'limpio')} className="flex-1">
            שמרתי · Cuidé
          </Btn>
        </div>
        <button onClick={() => setEditKey(null)} className="mt-3 block w-full text-center text-[11px] text-ink-faint underline">
          Dejarlo sin marcar
        </button>
      </Sheet>
    </div>
  );
}
