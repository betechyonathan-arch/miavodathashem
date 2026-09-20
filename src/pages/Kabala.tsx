import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useSearchParams } from 'react-router-dom';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import { createKabala, markKabalaDay, updateKabala } from '../lib/db/repo';
import {
  KIND_COPY,
  PRESET_BY_ID,
  TARGET_SHORTCUTS,
  kabalaProgress,
  kindOf,
  presetsFor,
  type KabalaPreset,
} from '../lib/kabala';
import { getGender } from '../lib/gender';
import { resolveJewishDay, keyToNoon } from '../lib/jewishDay';
import { hebrewDateEs } from '../lib/format';
import type { Kabala, KabalaKind } from '../lib/db/schema';
import { Btn, Card, Field, Ring, Sheet, SectionTitle, inputCls } from '../components/ui';

const chip = (on: boolean) =>
  `rounded-lg border px-3 py-1.5 text-[13px] ${on ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'}`;

/**
 * Kabalot: compromisos con fecha que cada persona crea a su medida — cuántos días, de qué
 * tipo y para qué. Hay sugerencias según el género, pero todo es editable.
 *   /kabala            → mis kabalot
 *   /kabala?nueva=ID   → crear una (ID = sugerencia, o "1" para crear desde cero)
 *   /kabala?id=ID      → una kabalá en detalle
 */
export default function KabalaPage() {
  const { day } = useZury();
  const [params, setParams] = useSearchParams();
  const all = useLiveQuery(() => db.kabalot.toArray(), [], [] as Kabala[]);

  const nueva = params.get('nueva');
  const id = params.get('id');
  const selected = id ? all.find((k) => k.id === id) : undefined;

  if (!day) return null;

  if (nueva) {
    return (
      <NewKabala
        presetId={nueva === '1' ? null : nueva}
        startDayId={day.dayId}
        startHebrewDate={day.hebrewDate}
        onCancel={() => setParams({})}
        onCreated={(newId) => setParams({ id: newId })}
      />
    );
  }
  if (selected) {
    return <KabalaDetail k={selected} onBack={() => setParams({})} onOpen={(kid) => setParams({ id: kid })} />;
  }
  return <KabalaList all={all} onNew={(pid) => setParams({ nueva: pid })} onOpen={(kid) => setParams({ id: kid })} />;
}

/* ------------------------------------------------------------------ */

function KabalaList({
  all,
  onNew,
  onOpen,
}: {
  all: Kabala[];
  onNew: (presetId: string) => void;
  onOpen: (id: string) => void;
}) {
  const { now, day } = useZury();
  const gender = getGender();
  const suggestions = presetsFor(gender);

  const active = useMemo(
    () => all.filter((k) => k.status === 'activa').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all],
  );
  const past = useMemo(
    () => all.filter((k) => k.status !== 'activa').sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all],
  );

  return (
    <div className="space-y-5">
      <SectionTitle he="קַבָּלָה" es="Mis kabalot" />
      <p className="px-1 text-[13px] leading-relaxed text-ink-soft">
        Una kabalá es un compromiso con fecha que tú eliges: cuántos días, qué cuidar o qué hacer, y para qué. Se toma{' '}
        <span className="text-ink">bli neder</span> y es solo tuya: nadie más la ve.
      </p>

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((k) => {
            const p = kabalaProgress(k, now, day?.dayId);
            const copy = KIND_COPY[kindOf(k)];
            return (
              <button key={k.id} onClick={() => onOpen(k.id)} className="block w-full text-left">
                <Card className="flex items-center gap-4 p-4 transition-colors hover:border-gold">
                  <Ring value={p.pct} size={64} stroke={6} emoji={`${p.cleanDays}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] text-ink">{k.es}</div>
                    {k.he && <div className="hebrew text-[14px] text-gold">{k.he}</div>}
                    <div className="mt-0.5 text-[12px] text-ink-faint">
                      {p.cleanDays} de {p.target} {copy.unitPlural} ·{' '}
                      {p.done ? 'completada' : p.todayStatus ? 'hoy ya marcado' : 'hoy pendiente'}
                    </div>
                  </div>
                  <span className="text-ink-faint">›</span>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      <div>
        <SectionTitle
          es={active.length > 0 ? 'Empezar otra' : 'Empieza tu primera kabalá'}
          he={active.length > 0 ? 'עוד אחת' : 'להתחיל'}
        />
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <button key={s.id} onClick={() => onNew(s.id)} className="block w-full text-left">
              <Card className="p-4 transition-colors hover:border-gold">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[15px] text-ink">{s.es}</div>
                    <div className="hebrew text-[14px] text-gold">{s.he}</div>
                  </div>
                  {i === 0 && (
                    <span className="shrink-0 rounded-md border border-gold px-2 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                      recomendada
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{s.blurb}</p>
                <p className="mt-1 text-[11px] text-ink-faint">Sugerida: {s.days} días · puedes cambiarlo</p>
              </Card>
            </button>
          ))}
          <button onClick={() => onNew('1')} className="block w-full text-left">
            <Card className="border-dashed p-4 transition-colors hover:border-gold">
              <div className="text-[15px] text-ink">+ Crear la mía</div>
              <p className="mt-0.5 text-[12px] text-ink-soft">Tú eliges el nombre, los días y para qué la haces.</p>
            </Card>
          </button>
        </div>
      </div>

      {past.length > 0 && (
        <div>
          <SectionTitle es="Kabalot anteriores" he="מַה שֶּׁהָיָה" />
          <Card className="divide-y divide-line">
            {past.map((k) => {
              const p = kabalaProgress(k, now);
              return (
                <button key={k.id} onClick={() => onOpen(k.id)} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div className="min-w-0">
                    <div className="text-[13px] text-ink">{k.es}</div>
                    <div className="text-[11px] text-ink-faint">
                      Desde {hebrewDateEs(k.startHebrewDate)} · {p.cleanDays}/{k.targetDays} días
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-[11px] ${
                      k.status === 'completada' ? 'border-[var(--success)] text-[var(--success)]' : 'border-line text-ink-faint'
                    }`}
                  >
                    {k.status === 'completada' ? 'completada' : 'no terminada'}
                  </span>
                </button>
              );
            })}
          </Card>
        </div>
      )}

      <p className="px-1 text-[11px] leading-relaxed text-ink-faint">
        Una caída o un día que no pudiste no es un veredicto: lo que sigue es volver, ahora. Marcar la vuelta también
        cuenta.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function NewKabala({
  presetId,
  startDayId,
  startHebrewDate,
  onCancel,
  onCreated,
}: {
  presetId: string | null;
  startDayId: string;
  startHebrewDate: string;
  onCancel: () => void;
  onCreated: (id: string) => void;
}) {
  const preset: KabalaPreset | undefined = presetId ? PRESET_BY_ID[presetId] : undefined;

  const [title, setTitle] = useState(preset?.es ?? '');
  const [kind, setKind] = useState<KabalaKind>(preset?.kind ?? 'hacer');
  const [target, setTarget] = useState(preset?.days ?? 30);
  const [targetText, setTargetText] = useState(String(preset?.days ?? 30));
  const [kavana, setKavana] = useState(preset?.kavana ?? '');
  const [subject, setSubject] = useState('');
  const [mode, setMode] = useState<Kabala['mode']>('acumulativo');
  const [showOpts, setShowOpts] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function pickTarget(n: number) {
    setTarget(n);
    setTargetText(String(n));
  }

  function typeTarget(v: string) {
    setTargetText(v);
    const n = Number(v);
    if (Number.isInteger(n) && n >= 1 && n <= 365) setTarget(n);
  }

  function changeSubject(v: string) {
    setSubject(v);
    if (preset?.subject) setKavana(v.trim() ? preset.subject.kavanaFor(v.trim()) : preset.kavana);
  }

  async function begin() {
    if (!title.trim()) return setError('Ponle un nombre a tu kabalá.');
    if (!Number.isInteger(Number(targetText)) || Number(targetText) < 1 || Number(targetText) > 365) {
      return setError('Los días deben ser un número entre 1 y 365.');
    }
    setError('');
    setBusy(true);
    const k = await createKabala({
      he: preset?.he ?? '',
      es: title.trim(),
      kavana: kavana.trim(),
      kind,
      presetId: preset?.id,
      area: preset?.area ?? 'mitzvot',
      targetDays: target,
      mode,
      onFall: mode === 'acumulativo' ? 'pausa' : 'reinicia',
      startDayId,
      startHebrewDate,
      seedStartDay: null,
    });
    setBusy(false);
    onCreated(k.id);
  }

  return (
    <div className="space-y-5">
      <Btn variant="quiet" onClick={onCancel}>
        ‹ Mis kabalot
      </Btn>
      <Card className="space-y-4 p-5">
        <div>
          {preset?.he && <div className="hebrew text-2xl leading-tight text-gold">{preset.he}</div>}
          <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
            {preset ? 'Kabalá sugerida' : 'Tu propia kabalá'}
          </div>
          {preset && <p className="mt-1 text-[13px] leading-relaxed text-ink-soft">{preset.blurb}</p>}
          <p className="mt-1 text-[12px] text-ink-faint">
            El día 1 es hoy, <span className="text-ink">{hebrewDateEs(startHebrewDate)}</span>.
          </p>
        </div>

        <Field label="Nombre de tu kabalá">
          <input
            className={inputCls}
            value={title}
            maxLength={80}
            placeholder="Por ejemplo: Cuidar mi habla, Decir Shemá con kavaná…"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        {!preset && (
          <Field label="¿Qué tipo de kabalá es?">
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setKind('cuidar')} className={chip(kind === 'cuidar')}>
                Cuidarme de algo
              </button>
              <button onClick={() => setKind('hacer')} className={chip(kind === 'hacer')}>
                Hacer algo cada día
              </button>
            </div>
          </Field>
        )}

        {preset?.subject && (
          <Field label={preset.subject.label} hint={preset.subject.hint}>
            <input
              className={inputCls}
              value={subject}
              maxLength={60}
              onChange={(e) => changeSubject(e.target.value)}
            />
          </Field>
        )}

        <Field label="¿Cuántos días?" hint="Elige un atajo o escribe el número que quieras (de 1 a 365).">
          <div className="flex flex-wrap items-center gap-1.5">
            {TARGET_SHORTCUTS.map((n) => (
              <button key={n} onClick={() => pickTarget(n)} className={chip(target === n && targetText === String(n))}>
                {n}
              </button>
            ))}
            <input
              className={inputCls + ' !w-24'}
              inputMode="numeric"
              value={targetText}
              aria-label="Número de días"
              onChange={(e) => typeTarget(e.target.value.replace(/[^0-9]/g, ''))}
            />
            <span className="text-[13px] text-ink-faint">días</span>
          </div>
        </Field>

        <Field label="Kavaná — para qué la haces (opcional)" hint="Se muestra cada día. Es privada.">
          <textarea className={inputCls} rows={3} value={kavana} onChange={(e) => setKavana(e.target.value)} />
        </Field>

        <button onClick={() => setShowOpts((v) => !v)} className="text-[12px] text-gold">
          {showOpts ? 'Ocultar opciones' : 'Opciones avanzadas'}
        </button>
        {showOpts && (
          <div className="space-y-3 rounded-xl border border-line bg-sunken p-3">
            <Field
              label="Cómo cuenta un día que no llegas"
              hint={
                mode === 'acumulativo'
                  ? 'Acumulativo: sumas días en total; uno fallido pausa, no borra. Menos riesgo de desanimarte.'
                  : 'Racha: días seguidos; uno fallido la reinicia a 0. Más fuerza al contador, más duro.'
              }
            >
              <div className="flex gap-1.5">
                <button onClick={() => setMode('acumulativo')} className={chip(mode === 'acumulativo')}>
                  Acumulativo
                </button>
                <button onClick={() => setMode('racha')} className={chip(mode === 'racha')}>
                  Racha
                </button>
              </div>
            </Field>
          </div>
        )}

        {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
        <Btn onClick={begin} disabled={busy} className="w-full">
          {busy ? 'Comenzando…' : 'Comenzar — hoy es el día 1'}
        </Btn>
        <p className="text-[11px] text-ink-faint">Bli neder. Solo tú ves tus kabalot.</p>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function nextLevel(target: number): number | null {
  return [7, 18, 30, 40, 90, 180, 365].find((n) => n > target) ?? null;
}

function KabalaDetail({
  k,
  onBack,
  onOpen,
}: {
  k: Kabala;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const { day, now, settings } = useZury();
  const kind = kindOf(k);
  const copy = KIND_COPY[kind];
  const p = kabalaProgress(k, now, day?.dayId);
  const isActive = k.status === 'activa';
  const [returnOpen, setReturnOpen] = useState(false);
  const [note, setNote] = useState('');
  const [confirmClean, setConfirmClean] = useState(false);
  const [editKey, setEditKey] = useState<string | null>(null);

  const milestone = isActive ? p.milestonesToCelebrate[0] ?? null : null;

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
      const renewed = await createKabala({
        he: k.he,
        es: k.es,
        kavana: k.kavana,
        kind: k.kind,
        presetId: k.presetId,
        area: k.area,
        targetDays: renewTarget,
        mode: k.mode,
        onFall: k.onFall,
        startDayId: day.dayId,
        startHebrewDate: day.hebrewDate,
        seedStartDay: null,
      });
      onOpen(renewed.id);
    } else {
      onBack();
    }
  }

  async function abandon() {
    if (!window.confirm('¿Dejar esta kabalá? Queda en "Kabalot anteriores".')) return;
    await updateKabala(k.id, { status: 'abandonada', abandonedAt: new Date().toISOString() });
    onBack();
  }

  const upgrade = nextLevel(k.targetDays);

  return (
    <div className="space-y-5">
      <Btn variant="quiet" onClick={onBack}>
        ‹ Mis kabalot
      </Btn>

      {/* Progreso */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Ring value={p.pct} size={104} stroke={8} emoji={`${p.cleanDays}`} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
              Kabalá · bli neder{!isActive ? ` · ${k.status}` : ''}
            </div>
            <div className="text-xl leading-tight text-ink">{k.es}</div>
            {k.he && <div className="hebrew text-lg text-gold">{k.he}</div>}
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              {p.done
                ? '¡Completada!'
                : `${p.remaining} ${p.remaining === 1 ? copy.unit : copy.unitPlural} para completar · día ${p.elapsedDays} desde el inicio`}
            </p>
            <div className="mt-0.5 text-[11px] text-ink-faint">
              {p.cleanDays} de {p.target} · {k.mode === 'acumulativo' ? 'Acumulativo' : 'Racha'}
              {p.fallDays > 0 ? ` · ${p.fallDays} ${p.fallDays === 1 ? 'día sin cumplir' : 'días sin cumplir'}` : ''}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1">
          {p.strip.map((s) => {
            const editable = isActive && s.status === 'sin' && s.key !== p.todayKey;
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
        {isActive && (
          <p className="mt-1 text-[10px] text-ink-faint">
            Un día sin marcar (borde punteado) se puede completar después — toca el cuadro.
          </p>
        )}

        {isActive && p.nextMilestone && !p.done && (
          <p className="mt-3 text-[11px] text-ink-faint">
            Próximo hito: <span className="text-ink-soft">{p.nextMilestone} días</span>
            {p.nextMilestone === 18 ? ' (חי)' : ''}.
          </p>
        )}
      </Card>

      {/* Marca de hoy */}
      {isActive && !p.done && (
        <Card className="space-y-3 p-4">
          <div className="text-[13px] font-medium text-ink">Hoy · {hebrewDateEs(day?.hebrewDate ?? k.startHebrewDate)}</div>
          {p.todayStatus === 'limpio' ? (
            <div className="rounded-xl border border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-3 text-[13px] text-ink">
              {copy.doneToday}
              <button onClick={() => setReturnOpen(true)} className="mt-1 block text-[11px] text-ink-faint underline">
                Corregir a "{copy.miss.toLowerCase()}"
              </button>
            </div>
          ) : p.todayStatus === 'caida' ? (
            <div className="rounded-xl border border-[var(--danger)] p-3 text-[13px] text-ink">
              {copy.missToday}
              <button onClick={() => setConfirmClean(true)} className="mt-1 block text-[11px] text-ink-faint underline">
                Cambiar a "{copy.done.replace(/^[^\s]*\s·\s/, '').toLowerCase()}"
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Btn onClick={() => setConfirmClean(true)} className="flex-1">
                {copy.done}
              </Btn>
              <Btn variant="danger" onClick={() => setReturnOpen(true)} className="flex-1">
                {copy.miss}
              </Btn>
            </div>
          )}
        </Card>
      )}

      {/* Completada */}
      {isActive && p.done && (
        <Card className="space-y-3 border-gold/50 p-5">
          <div className="hebrew text-xl text-gold">תָּם וְנִשְׁלַם · {p.target}</div>
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Completaste tu kabalá. Que sea para bien. Puedes cerrarla, renovarla o subir el nivel.
          </p>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => finish(k.targetDays)}>Renovar {k.targetDays} días</Btn>
            {upgrade && (
              <Btn variant="ghost" onClick={() => finish(upgrade)}>
                Subir a {upgrade}
              </Btn>
            )}
            <Btn variant="quiet" onClick={() => finish()}>
              Terminar
            </Btn>
          </div>
        </Card>
      )}

      {/* Kavaná */}
      {k.kavana.trim() && (
        <Card className="p-4">
          <div className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">Kavaná</div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink" dir="auto">
            {k.kavana}
          </p>
        </Card>
      )}

      {/* Apoyo */}
      {isActive && (
        <div>
          <SectionTitle es={copy.supportTitle} he="עֵצָה" />
          <Card className="space-y-2 p-4 text-[13px] leading-relaxed text-ink-soft">
            {copy.support.map((t) => (
              <p key={t}>· {t}</p>
            ))}
          </Card>
        </div>
      )}

      {isActive && (
        <button onClick={abandon} className="px-1 text-[11px] text-ink-faint underline">
          Dejar esta kabalá
        </button>
      )}

      {/* Hito */}
      <Sheet
        open={milestone != null}
        onClose={dismissMilestone}
        title={<div className="hebrew text-xl text-gold">חֲזַק · {milestone} días</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          {milestone} días. No es poco: cada día es una elección repetida. Sigue — la meta son {p.target}.
        </p>
        <Btn onClick={dismissMilestone} className="mt-4 w-full">
          חזק ואמץ
        </Btn>
      </Sheet>

      {/* Hoy no / caída */}
      <Sheet
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        title={<div className="hebrew text-xl text-gold">{kind === 'cuidar' ? 'הַחֲזָרָה · El regreso' : copy.miss}</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">{copy.missSheet}</p>
        {kind === 'cuidar' && (
          <>
            <p className="mt-3 hebrew text-[15px] leading-relaxed text-ink" dir="rtl">
              לֵב טָהוֹר בְּרָא־לִי אֱלֹהִים · וְרוּחַ נָכוֹן חַדֵּשׁ בְּקִרְבִּי
            </p>
            <p className="text-[11px] text-ink-faint">Tehilim 51:12</p>
          </>
        )}
        <div className="mt-4">
          <Field
            label="Si quieres, una línea (opcional)"
            hint={kind === 'cuidar' ? 'Qué pasó o qué harás distinto. Se guarda como registro de caída.' : 'Qué pasó o qué harás distinto.'}
          >
            <textarea className={inputCls} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={() => setReturnOpen(false)} className="flex-1">
            Cancelar
          </Btn>
          <Btn variant="danger" onClick={() => mark('caida')} className="flex-1">
            {kind === 'cuidar' ? 'Registrar y volver' : 'Anotar'}
          </Btn>
        </div>
      </Sheet>

      {/* Confirmar el día */}
      <Sheet
        open={confirmClean}
        onClose={() => setConfirmClean(false)}
        title={<div className="hebrew text-lg text-gold">{copy.done}</div>}
      >
        <p className="text-[14px] leading-relaxed text-ink-soft">
          {copy.confirmDone} Suma a los {p.target} días de la kabalá.
        </p>
        <div className="mt-4 flex gap-2">
          <Btn variant="ghost" onClick={() => setConfirmClean(false)} className="flex-1">
            Aún no
          </Btn>
          <Btn onClick={() => mark('limpio')} className="flex-1">
            Sí
          </Btn>
        </div>
      </Sheet>

      {/* Completar un día pasado sin marcar */}
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
            {copy.miss}
          </Btn>
          <Btn onClick={() => editKey && markPast(editKey, 'limpio')} className="flex-1">
            {copy.done}
          </Btn>
        </div>
        <button onClick={() => setEditKey(null)} className="mt-3 block w-full text-center text-[11px] text-ink-faint underline">
          Dejarlo sin marcar
        </button>
      </Sheet>
    </div>
  );
}
