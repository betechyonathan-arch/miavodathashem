import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, catEmoji, catHe, catLabel } from '../lib/categories';
import { classify, type Classification } from '../lib/classify';
import { AREA_FORMS, hasForm } from '../lib/areaForms';
import type { AreaId, Valence } from '../lib/db/schema';
import { addEntry } from '../lib/db/repo';
import { useZury } from '../state/zury';
import { aiReady } from '../lib/ai/config';
import { aiClassify } from '../lib/ai/tasks';
import { Btn, Sheet, inputCls } from './ui';
import AreaFields from './AreaFields';
import { AreaInfoBody } from './AreaInfoSheet';
import { areaInfo } from '../lib/areaInfo';

/** Texto de respaldo cuando se guarda solo con campos estructurados. */
function synthText(area: AreaId, fields: Record<string, unknown>): string {
  const vals = Object.values(fields)
    .filter((v) => v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
    .map((v) => (Array.isArray(v) ? v.join(', ') : v === true ? 'sí' : String(v)))
    .slice(0, 4);
  return `[${catLabel(area)}] ${vals.join(' · ')}`.trim();
}

const VALENCE_LABEL: Record<Valence, string> = {
  victory: '🟢 Victoria',
  fall: '🔴 Caída',
  recovery: '🔄 Recuperación',
  neutral: '• Neutral',
};

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export default function QuickRegister({
  open,
  onClose,
  onSaved,
  initialArea,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  initialArea?: AreaId;
}) {
  const day = useZury((s) => s.day);
  const settings = useZury((s) => s.settings);
  const [area, setArea] = useState<AreaId | null>(initialArea ?? null);
  const [text, setText] = useState('');
  const [overrideValence, setOverrideValence] = useState<Valence | null>(null);
  const [intensity, setIntensity] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [listening, setListening] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<Record<string, unknown>>({});
  const [showFields, setShowFields] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [aiSug, setAiSug] = useState<Classification | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);
  const recRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  const useAi = aiReady(settings) && !!settings?.aiAutoClassify;

  // Sugerencia de IA (invisible, con rebote). Si falla, no pasa nada: quedan las reglas.
  useEffect(() => {
    if (!useAi || text.trim().length < 15) {
      setAiSug(null);
      return;
    }
    const t = window.setTimeout(async () => {
      setAiLoading(true);
      const r = await aiClassify(text, settings!.aiModel, area ?? undefined);
      setAiLoading(false);
      setAiSug(r);
    }, 1300);
    return () => window.clearTimeout(t);
  }, [text, area, useAi, settings]);

  const fieldCount = Object.keys(fields).length;

  const cls = useMemo(
    () => classify(text || '', area ?? undefined),
    [text, area],
  );

  const effArea: AreaId = area ?? cls.area;
  const effValence = overrideValence ?? cls.valence;

  function reset() {
    setArea(initialArea ?? null);
    setText('');
    setOverrideValence(null);
    setIntensity(null);
    setShowWhy(false);
    setFields({});
    setShowFields(false);
    setShowInfo(false);
    setAiSug(null);
    setAiApplied(false);
  }

  function pickArea(id: AreaId) {
    const next = area === id ? null : id;
    setArea(next);
    setFields({});
    setShowFields(false);
    setShowInfo(false);
  }

  function applyAi() {
    if (!aiSug) return;
    setArea(aiSug.area);
    setOverrideValence(aiSug.valence);
    if (aiSug.intensity != null) setIntensity(aiSug.intensity);
    setAiApplied(true);
  }

  function toggleVoice() {
    const Ctor =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionCtor }).webkitSpeechRecognition;
    if (!Ctor) {
      alert('Este dispositivo no permite dictado por voz. Puedes escribir.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new Ctor();
    rec.lang = 'es-MX';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e) => {
      let chunk = '';
      for (let i = 0; i < e.results.length; i++) chunk += e.results[i][0].transcript;
      setText((t) => (t ? t + ' ' : '') + chunk.trim());
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  async function save() {
    const canSave = text.trim() || fieldCount > 0;
    if (!day || !canSave) return;
    setSaving(true);
    const finalCls = classify(text, area ?? undefined);
    const finalText = text.trim() || synthText(effArea, fields);
    // Datos extraídos por IA se guardan aparte; el texto original nunca se toca (§51).
    const aiData = aiSug
      ? { area: aiSug.area, areasSecondary: aiSug.areasSecondary, tags: aiSug.tags, valence: aiSug.valence, applied: aiApplied, at: new Date().toISOString() }
      : null;
    const mergedTags = aiApplied && aiSug ? [...new Set([...finalCls.tags, ...aiSug.tags])] : finalCls.tags;
    const outFields =
      fieldCount > 0 || aiData ? { ...(fieldCount > 0 ? fields : {}), ...(aiData ? { _ai: aiData } : {}) } : undefined;
    await addEntry({
      dayId: day.dayId,
      hebrewDate: day.hebrewDate,
      area: effArea,
      areasSecondary: (aiApplied && aiSug ? aiSug.areasSecondary : finalCls.areasSecondary).filter((a) => a !== effArea),
      tags: mergedTags,
      text: finalText,
      fields: outFields,
      source: area ? 'quick' : 'text',
      valence: effValence,
      intensity: intensity ?? finalCls.intensity,
      autoClassified: aiApplied || (!text.trim() ? false : !area || finalCls.areasSecondary.length > 0 || finalCls.tags.length > 0),
    });
    setSaving(false);
    reset();
    onSaved?.();
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title={
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[13px] uppercase tracking-[0.16em] text-ink-faint">+ Registrar</div>
            <div className="hebrew text-2xl text-gold">רישום מהיר</div>
          </div>
          {day && <div className="hebrew text-sm text-ink-faint">{day.hebrewDateHe}</div>}
        </div>
      }
    >
      {/* Selector de categoría */}
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => pickArea(c.id)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition ${
              (area ?? cls.area) === c.id
                ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]'
                : 'border-line bg-raised'
            }`}
          >
            <span className="text-xl">{c.emoji}</span>
            <span className="hebrew text-[11px] leading-tight text-ink-soft">{c.he}</span>
            <span className="text-[9px] leading-none text-ink-faint">{c.es}</span>
          </button>
        ))}
      </div>

      {/* Ficha del área elegida — qué es, fuente, qué registrar */}
      {area && areaInfo(area) && (
        <div className="mb-3">
          <button
            onClick={() => setShowInfo((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-raised px-3 py-2 text-[13px] text-ink-soft"
          >
            <span>
              {showInfo ? '▾' : '▸'} מקור · ¿Qué es {catLabel(area)}?
            </span>
            <span className="text-[11px] text-ink-faint">{areaInfo(area)!.fuente.cita}</span>
          </button>
          {showInfo && (
            <div className="mt-3 rounded-xl border border-line bg-sunken p-3">
              <AreaInfoBody area={area} />
            </div>
          )}
        </div>
      )}

      {/* Texto */}
      <div className="relative mb-2">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder={
            area
              ? `Cuéntale al sistema lo de ${catLabel(area)}…`
              : 'Cuéntale a tu sistema lo que pasó. Él lo organiza.'
          }
          className={inputCls + ' resize-none pr-11'}
        />
        <button
          onClick={toggleVoice}
          title="Dictar por voz"
          className={`absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg border text-base ${
            listening ? 'animate-pulse border-[var(--danger)] text-[var(--danger)]' : 'border-line text-ink-soft'
          }`}
        >
          🎤
        </button>
      </div>

      {/* Lectura automática */}
      {text.trim() && (
        <div className="mb-3 rounded-xl border border-line bg-sunken p-3 text-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-raised px-2 py-0.5 text-[12px]">
              {catEmoji(effArea)} {catLabel(effArea)}
            </span>
            {cls.areasSecondary
              .filter((a) => a !== effArea)
              .map((a) => (
                <span key={a} className="rounded-md bg-raised px-2 py-0.5 text-[11px] text-ink-soft">
                  {catEmoji(a)} {catLabel(a)}
                </span>
              ))}
            {cls.tags.map((t) => (
              <span key={t} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-faint">
                #{t}
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowWhy((v) => !v)}
            className="mt-2 text-[11px] text-gold underline underline-offset-2"
          >
            ¿Por qué?
          </button>
          {showWhy && (
            <ul className="mt-1 list-disc pl-4 text-[11px] text-ink-faint">
              {cls.why.length ? cls.why.map((w, i) => <li key={i}>{w}</li>) : <li>Sin señales; se guarda como texto libre.</li>}
              <li className="text-ink-faint/70">El texto original nunca se modifica.</li>
            </ul>
          )}
        </div>
      )}

      {/* Sugerencia de IA (invisible; solo si está activada y hay clave) */}
      {useAi && text.trim().length >= 15 && (aiLoading || aiSug) && (
        <div className="mb-3 rounded-xl border border-gold/40 bg-[color-mix(in_srgb,var(--gold)_7%,transparent)] p-3 text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-medium text-gold">✦ IA</span>
            {aiLoading && <span className="text-[11px] text-ink-faint">pensando…</span>}
          </div>
          {aiSug && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-md bg-raised px-2 py-0.5 text-[12px]">
                  {catEmoji(aiSug.area)} {catLabel(aiSug.area)}
                </span>
                {aiSug.areasSecondary.map((a) => (
                  <span key={a} className="rounded-md bg-raised px-2 py-0.5 text-[11px] text-ink-soft">
                    {catEmoji(a)} {catLabel(a)}
                  </span>
                ))}
                {aiSug.valence !== 'neutral' && (
                  <span className="rounded-md bg-raised px-2 py-0.5 text-[11px]">{VALENCE_LABEL[aiSug.valence]}</span>
                )}
                {aiSug.tags.map((t) => (
                  <span key={t} className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-ink-faint">
                    #{t}
                  </span>
                ))}
              </div>
              <button
                onClick={applyAi}
                disabled={aiApplied}
                className="mt-2 rounded-lg border border-gold px-2.5 py-1 text-[12px] text-gold disabled:opacity-40"
              >
                {aiApplied ? 'Aplicado ✓' : 'Aplicar sugerencia'}
              </button>
              <span className="ml-2 text-[10px] text-ink-faint">Se guarda junto al texto original, sin modificarlo.</span>
            </>
          )}
        </div>
      )}

      {/* Formulario detallado del área (opcional) */}
      {area && hasForm(area) && (
        <div className="mb-3">
          <button
            onClick={() => setShowFields((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-raised px-3 py-2 text-[13px] text-ink-soft"
          >
            <span>
              {showFields ? '▾' : '▸'} Detalles de {catLabel(area)}{' '}
              <span className="text-ink-faint">(opcional)</span>
            </span>
            {fieldCount > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-[11px] text-[#1a140a]">{fieldCount}</span>
            )}
          </button>
          {showFields && (
            <div className="mt-3 rounded-xl border border-line bg-sunken p-3">
              <AreaFields schema={AREA_FORMS[area]!} value={fields} onChange={setFields} />
            </div>
          )}
        </div>
      )}

      {/* Valencia */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(['victory', 'fall', 'recovery', 'neutral'] as Valence[]).map((v) => (
          <button
            key={v}
            onClick={() => setOverrideValence(overrideValence === v ? null : v)}
            className={`rounded-lg border px-2.5 py-1 text-[12px] transition ${
              effValence === v ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]' : 'border-line'
            }`}
          >
            {VALENCE_LABEL[v]}
          </button>
        ))}
      </div>

      {/* Intensidad opcional */}
      <div className="mb-4">
        <div className="mb-1 text-[12px] text-ink-soft">Intensidad (opcional)</div>
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: 11 }, (_, i) => i).map((n) => (
            <button
              key={n}
              onClick={() => setIntensity(intensity === n ? null : n)}
              className={`h-8 w-8 rounded-md border text-xs ${
                intensity === n ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-faint'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Btn variant="ghost" className="flex-1" onClick={() => { reset(); onClose(); }}>
          Cancelar
        </Btn>
        <Btn className="flex-1" onClick={save} disabled={(!text.trim() && fieldCount === 0) || saving}>
          {saving ? 'Guardando…' : 'Guardar'}
        </Btn>
      </div>
      <p className="mt-3 text-center text-[11px] text-ink-faint">
        <span className="hebrew">לרשום את האמת · ללמוד ממנה · לקום שוב</span>
      </p>
    </Sheet>
  );
}

export { catHe };
