import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useZury } from '../state/zury';
import { Btn, Card, Field, SectionTitle, inputCls } from '../components/ui';
import StagesPanel from '../components/StagesPanel';
import GoalsPanel from '../components/GoalsPanel';
import { MITZVOT_CATALOG } from '../lib/mitzvot';
import { WATCHED_FALLS_CATALOG } from '../lib/watchedFalls';

type Tab = 'identidad' | 'etapas' | 'metas';
const TABS: { id: Tab; es: string; he: string }[] = [
  { id: 'identidad', es: 'Identidad', he: 'זהות' },
  { id: 'etapas', es: 'Etapas', he: 'שלבים' },
  { id: 'metas', es: 'Metas', he: 'מטרות' },
];

export default function Mission() {
  const { settings, saveSettings } = useZury();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTab = (['identidad', 'etapas', 'metas'] as Tab[]).includes(params.get('t') as Tab)
    ? (params.get('t') as Tab)
    : 'identidad';
  const [tab, setTab] = useState<Tab>(initialTab);

  // Deep-link a #mitzvot / #caidas dentro de Identidad.
  useEffect(() => {
    const h = window.location.hash.slice(1);
    if (!h) return;
    setTab('identidad');
    const t = setTimeout(() => {
      const el = document.getElementById(h);
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-gold');
      setTimeout(() => el.classList.remove('ring-2', 'ring-gold'), 1800);
    }, 120);
    return () => clearTimeout(t);
  }, []);
  const [m, setM] = useState(settings?.mission);
  const [primaryMiddah, setPrimaryMiddah] = useState(settings?.primaryMiddah ?? '');
  const [mitzvot, setMitzvot] = useState<string[]>(settings?.trackedMitzvot ?? []);
  const [customMitzvah, setCustomMitzvah] = useState('');
  const [watched, setWatched] = useState<string[]>(
    settings?.watchedFalls ?? WATCHED_FALLS_CATALOG.map((w) => w.id),
  );
  const [customWatched, setCustomWatched] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setM(settings?.mission);
    setPrimaryMiddah(settings?.primaryMiddah ?? '');
    setMitzvot(settings?.trackedMitzvot ?? []);
    setWatched(settings?.watchedFalls ?? WATCHED_FALLS_CATALOG.map((w) => w.id));
  }, [settings]);

  if (!m) return null;

  async function save() {
    await saveSettings({
      mission: m,
      primaryMiddah,
      trackedMitzvot: mitzvot,
      watchedFalls: watched,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-4">
      <SectionTitle es="Mi misión" he="השליחות שלי" />

      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-lg border py-1.5 text-[12px] ${
              tab === t.id ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-soft'
            }`}
          >
            {t.es}
            <span className="hebrew block text-[10px] opacity-70">{t.he}</span>
          </button>
        ))}
      </div>

      {tab === 'etapas' && <StagesPanel />}
      {tab === 'metas' && <GoalsPanel />}

      {tab === 'identidad' && (
        <>
          <Card className="p-4 text-center">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Misión de vida</div>
            <div className="hebrew my-1 text-3xl text-gold">{m.lifeMission || 'לעבוד את ה׳'}</div>
            <input
              className={inputCls + ' text-center'}
              value={m.lifeMission}
              onChange={(e) => setM({ ...m, lifeMission: e.target.value })}
            />
          </Card>

          <Card className="space-y-3 p-4">
            <Field label="¿En quién me estoy intentando convertir?" hint="No es un número. Es una visión que puede evolucionar.">
              <textarea
                className={inputCls + ' resize-none'}
                rows={3}
                value={m.becomingWho}
                onChange={(e) => setM({ ...m, becomingWho: e.target.value })}
              />
            </Field>
            <Field label="Visión">
              <textarea className={inputCls + ' resize-none'} rows={2} value={m.vision} onChange={(e) => setM({ ...m, vision: e.target.value })} />
            </Field>
            <Field label="Valores" hint="Separados por coma">
              <input
                className={inputCls}
                value={m.values.join(', ')}
                onChange={(e) => setM({ ...m, values: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
            <Field label="Objetivos espirituales generales">
              <textarea
                className={inputCls + ' resize-none'}
                rows={2}
                value={m.spiritualGoals}
                onChange={(e) => setM({ ...m, spiritualGoals: e.target.value })}
              />
            </Field>
          </Card>

          <Card as="section" id="mitzvot" className="scroll-mt-24 space-y-3 p-4">
            <Field label="Midá principal (etapa actual)" hint="El motor la usa en el check-in. Nunca dirá que es tu “Tikún” — solo que aparece con frecuencia.">
              <input className={inputCls} value={primaryMiddah} onChange={(e) => setPrimaryMiddah(e.target.value)} placeholder="Ej. Savlanut" />
            </Field>
            <div>
              <div className="mb-1 text-[13px] font-medium text-ink-soft">Mitzvot que quiero seguir</div>
              <div className="flex flex-wrap gap-1.5">
                {MITZVOT_CATALOG.map((m) => {
                  const on = mitzvot.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMitzvot((cur) => (on ? cur.filter((x) => x !== m.id) : [...cur, m.id]))}
                      className={`rounded-lg border px-2 py-1 text-[12px] ${
                        on ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]' : 'border-line text-ink-soft'
                      }`}
                    >
                      {m.es} <span className="hebrew text-[10px] text-ink-faint">{m.he}</span>
                    </button>
                  );
                })}
                {mitzvot
                  .filter((id) => !MITZVOT_CATALOG.some((m) => m.id === id))
                  .map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMitzvot((cur) => cur.filter((x) => x !== id))}
                      className="rounded-lg border border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] px-2 py-1 text-[12px]"
                    >
                      {id} ×
                    </button>
                  ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className={inputCls}
                  value={customMitzvah}
                  onChange={(e) => setCustomMitzvah(e.target.value)}
                  placeholder="Añadir otra mitzvá…"
                />
                <Btn
                  variant="ghost"
                  onClick={() => {
                    const v = customMitzvah.trim();
                    if (v && !mitzvot.includes(v)) setMitzvot((c) => [...c, v]);
                    setCustomMitzvah('');
                  }}
                >
                  +
                </Btn>
              </div>
              <p className="mt-1 text-[11px] text-ink-faint">Se registra comportamiento, no una puntuación.</p>
            </div>

            <div id="caidas" className="scroll-mt-24">
              <div className="mb-1 text-[13px] font-medium text-ink-soft">Caídas que quiero vigilar</div>
              <div className="flex flex-wrap gap-1.5">
                {WATCHED_FALLS_CATALOG.map((w) => {
                  const on = watched.includes(w.id);
                  return (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => setWatched((cur) => (on ? cur.filter((x) => x !== w.id) : [...cur, w.id]))}
                      className={`rounded-lg border px-2 py-1 text-[12px] ${
                        on ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]' : 'border-line text-ink-soft'
                      }`}
                    >
                      {w.es} <span className="hebrew text-[10px] text-ink-faint">{w.he}</span>
                    </button>
                  );
                })}
                {watched
                  .filter((id) => !WATCHED_FALLS_CATALOG.some((w) => w.id === id))
                  .map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setWatched((cur) => cur.filter((x) => x !== id))}
                      className="rounded-lg border border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)] px-2 py-1 text-[12px]"
                    >
                      {id} ×
                    </button>
                  ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className={inputCls}
                  value={customWatched}
                  onChange={(e) => setCustomWatched(e.target.value)}
                  placeholder="Añadir otra caída a vigilar…"
                />
                <Btn
                  variant="ghost"
                  onClick={() => {
                    const v = customWatched.trim();
                    if (v && !watched.includes(v)) setWatched((c) => [...c, v]);
                    setCustomWatched('');
                  }}
                >
                  +
                </Btn>
              </div>
              <p className="mt-1 text-[11px] text-ink-faint">
                El sistema las cuenta y te pide el regreso. Nunca te juzga ni da psak (§60).
              </p>
            </div>
          </Card>

          <Btn className="w-full" onClick={save}>
            {saved ? 'Guardado ✓' : 'Guardar'}
          </Btn>

          <button
            onClick={() => navigate('/areas')}
            className="w-full rounded-2xl border border-line bg-raised p-4 text-left shadow-[var(--shadow)]"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-ink">Las 27 áreas de la avodá</span>
              <span className="hebrew text-lg text-gold">תחומי העבודה</span>
            </div>
            <p className="mt-1 text-[12px] text-ink-faint">
              Qué es cada área, su fuente (pasuk / Chazal / Rambam) y qué cuenta como registro. →
            </p>
          </button>

          <p className="text-center text-[11px] text-ink-faint">
            La jerarquía completa está en las pestañas <span className="text-ink-soft">Etapas</span> y <span className="text-ink-soft">Metas</span>.
          </p>
        </>
      )}
    </div>
  );
}
