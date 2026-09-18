import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import type { AreaId, Entry, YehudiKabala } from '../lib/db/schema';
import { catLabel } from '../lib/categories';
import { YEHUDI_CATALOG, YEHUDI_GROUPS, type YehudiItem } from '../lib/yehudi/catalog';
import { computeYehudiCircle, lifetimeTotals, proposeKabalot } from '../lib/yehudi/circle';
import { Btn, Card, Field, Ring, SectionTitle, inputCls } from '../components/ui';

type Mark = 'si' | 'aveces' | 'no';
const MARK_OPTS: { id: Mark; label: string }[] = [
  { id: 'si', label: 'Sí' },
  { id: 'aveces', label: 'A veces' },
  { id: 'no', label: 'Todavía no' },
];
const LEVEL_LABEL: Record<YehudiItem['level'], string> = {
  halacha: 'halajá',
  jumra: 'jumrá',
  hiddur: 'hiddur',
};
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

function ItemMarks({ value, onSet }: { value: Mark; onSet: (m: Mark) => void }) {
  return (
    <div className="flex gap-1">
      {MARK_OPTS.map((m) => (
        <button
          key={m.id}
          onClick={() => onSet(m.id)}
          className={`rounded-md border px-2 py-0.5 text-[11px] ${
            value === m.id
              ? m.id === 'si'
                ? 'border-[var(--success)] bg-[color-mix(in_srgb,var(--success)_16%,transparent)] text-ink'
                : m.id === 'no'
                  ? 'border-[var(--danger)] text-[var(--danger)]'
                  : 'border-gold bg-gold text-[#1a140a]'
              : 'border-line bg-raised text-ink-faint'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function CatalogList({
  value,
  onSet,
}: {
  value: Record<string, Mark>;
  onSet: (id: string, m: Mark) => void;
}) {
  return (
    <div className="space-y-4">
      {YEHUDI_GROUPS.map((g) => {
        const items = YEHUDI_CATALOG.filter((i) => i.area === g.area);
        if (!items.length) return null;
        return (
          <div key={g.area}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <div className="text-[11px] uppercase tracking-[0.16em] text-ink-faint">{g.es}</div>
              <div className="hebrew text-base text-gold">{g.he}</div>
            </div>
            <Card className="divide-y divide-line">
              {items.map((it) => (
                <div key={it.id} className="px-4 py-3">
                  <p className="hebrew text-[15px] leading-relaxed text-ink" dir="rtl">
                    {it.he}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{it.es}</p>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                      {LEVEL_LABEL[it.level]}
                      {it.sourceEs ? ` · ${it.sourceEs}` : ''}
                    </span>
                    <ItemMarks value={value[it.id] ?? 'no'} onSet={(m) => onSet(it.id, m)} />
                  </div>
                </div>
              ))}
            </Card>
          </div>
        );
      })}
    </div>
  );
}

export default function Yehudi() {
  const { settings, saveSettings } = useZury();
  const entries = useLiveQuery(() => db.entries.toArray(), [], [] as Entry[]);

  const [draft, setDraft] = useState<Record<string, Mark>>({});
  const [editingCatalog, setEditingCatalog] = useState(false);
  const [ownText, setOwnText] = useState('');
  const [ownArea, setOwnArea] = useState<AreaId | ''>('');
  const [showWhy, setShowWhy] = useState(true);

  const onboarded = !!settings?.yehudi?.onboardedAt;
  const circle = useMemo(
    () => (settings ? computeYehudiCircle(settings, entries) : null),
    [settings, entries],
  );
  const totals = useMemo(
    () => (settings ? lifetimeTotals(entries, settings) : null),
    [entries, settings],
  );
  const proposals = useMemo(() => (settings ? proposeKabalot(settings, 3) : []), [settings]);

  if (!settings) return null;
  const yehudi = settings.yehudi;

  function patchYehudi(patch: Partial<typeof yehudi>) {
    void saveSettings({ yehudi: { ...yehudi, ...patch } });
  }

  // ---------- Cuestionario inicial ----------
  if (!onboarded && !editingCatalog) {
    const draftFilled = { ...yehudi.items, ...draft };
    return (
      <div className="space-y-5">
        <SectionTitle es="Ser Yehudí — punto de partida" he="נְקֻדַּת הַהַתְחָלָה" />
        <p className="-mt-2 text-[12px] leading-relaxed text-ink-faint">
          El círculo «ser Yehudí al 100%» mide, con exactitud y sin adornos, cuánto de la vara sostienes:
          todas las halajot y las jumrot, con actividad real, menos las caídas recientes. No es un
          veredicto sobre tu alma; es el camino y lo que sigue. Primero dime qué cuidas hoy — de ahí
          partimos.
        </p>
        <CatalogList
          value={draftFilled}
          onSet={(id, m) => setDraft((d) => ({ ...d, [id]: m }))}
        />
        <Btn
          className="w-full"
          onClick={() =>
            patchYehudi({ items: draftFilled, onboardedAt: new Date().toISOString() })
          }
        >
          Guardar y ver mi círculo
        </Btn>
        <p className="text-center text-[11px] text-ink-faint">
          Lo que dejes sin marcar cuenta como «todavía no». Puedes ajustarlo cuando quieras.
        </p>
      </div>
    );
  }

  // ---------- Editar catálogo (post-onboarding) ----------
  if (editingCatalog) {
    return (
      <div className="space-y-5">
        <SectionTitle es="Revisar el catálogo" he="הַקָּטָלוֹג" />
        <p className="-mt-2 text-[12px] leading-relaxed text-ink-faint">
          Marca honestamente. «Sí» solo cuenta pleno si además hay actividad reciente en esa área.
        </p>
        <CatalogList value={yehudi.items} onSet={(id, m) => patchYehudi({ items: { ...yehudi.items, [id]: m } })} />
        <Btn className="w-full" onClick={() => setEditingCatalog(false)}>
          Listo
        </Btn>
      </div>
    );
  }

  // ---------- Vista principal ----------
  const kabalot = yehudi.kabalot ?? [];
  const activeKabalot = kabalot.filter((k) => k.status !== 'archivada');

  function addOwnKabala() {
    if (!ownText.trim()) return;
    const k: YehudiKabala = {
      id: uid(),
      kind: 'own',
      es: ownText.trim(),
      area: ownArea || undefined,
      status: 'aceptada',
      acceptedAt: new Date().toISOString(),
    };
    patchYehudi({ kabalot: [...kabalot, k] });
    setOwnText('');
    setOwnArea('');
  }

  function acceptProposal(it: YehudiItem) {
    const k: YehudiKabala = {
      id: uid(),
      kind: 'catalog',
      catalogId: it.id,
      he: it.he,
      es: it.es,
      area: it.area,
      level: it.level,
      status: 'aceptada',
      acceptedAt: new Date().toISOString(),
    };
    patchYehudi({ kabalot: [...kabalot, k] });
  }

  function setKabalaStatus(id: string, status: YehudiKabala['status']) {
    patchYehudi({
      kabalot: kabalot.map((k) =>
        k.id === id
          ? {
              ...k,
              status,
              lastKeptAt: status === 'sostenida' ? new Date().toISOString() : k.lastKeptAt,
              brokenAt: status === 'rota' ? new Date().toISOString() : k.brokenAt,
            }
          : k,
      ),
    });
  }

  return (
    <div className="space-y-6">
      <SectionTitle es="Ser Yehudí — el círculo exacto" he="יְהוּדִי שָׁלֵם" />

      {/* Círculo */}
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Ring value={(circle?.percent ?? 0) / 100} size={112} stroke={9} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">El camino recorrido</div>
            <div className="hebrew text-3xl leading-tight text-gold">
              {circle?.percent ?? 0}<span className="text-xl">%</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              El 100% es todas las halajot y las jumrot, sostenidas con actividad real, sin caídas. Es una
              vara alta a propósito. No es un juicio sobre ti: es lo que falta del camino.
            </p>
          </div>
        </div>
      </Card>

      {/* ¿Por qué? */}
      {circle && (
        <div>
          <SectionTitle
            es="¿Por qué ese número?"
            he="לָמָּה"
            extra={
              <button onClick={() => setShowWhy((v) => !v)} className="text-[12px] text-gold">
                {showWhy ? 'ocultar' : 'ver'}
              </button>
            }
          />
          {showWhy && (
            <Card className="space-y-2 p-4">
              {circle.parts.map((p) => (
                <div key={p.kind} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] text-ink">{p.label}</p>
                    <p className="text-[11px] leading-relaxed text-ink-faint">{p.detail}</p>
                  </div>
                  <span
                    className="shrink-0 text-[13px] tabular-nums"
                    style={{ color: p.points < 0 ? 'var(--danger)' : 'var(--success)' }}
                  >
                    {p.points > 0 ? '+' : ''}
                    {p.points}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-2">
                <span className="text-[13px] font-medium text-ink">Total</span>
                <span className="text-[13px] font-medium tabular-nums text-gold">{circle.percent}%</span>
              </div>
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Catálogo hasta +88 · constancia de por vida hasta +12 (meta 600 registros) · las caídas de
                30 días recortan el avance hasta un 30%, nunca a cero. Cuenta más el principio del camino,
                para que se mueva desde el primer paso. La caída se responde con el regreso, no con culpa (§60).
              </p>
            </Card>
          )}
        </div>
      )}

      {/* Kabalot */}
      <div>
        <SectionTitle es="Kabalot de crecimiento" he="קַבָּלוֹת" />

        {proposals.length > 0 && (
          <Card className="mb-2 space-y-2 p-4">
            <p className="text-[12px] text-ink-faint">El sistema te propone (de tu área más floja, lo más alcanzable):</p>
            {proposals.map((it) => (
              <div key={it.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="hebrew text-[14px] text-ink" dir="rtl">
                    {it.he}
                  </p>
                  <p className="text-[12px] leading-relaxed text-ink-soft">{it.es}</p>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    {catLabel(it.area)} · {LEVEL_LABEL[it.level]}
                  </p>
                </div>
                <Btn variant="ghost" className="shrink-0 px-3 py-1.5 text-[12px]" onClick={() => acceptProposal(it)}>
                  Aceptar
                </Btn>
              </div>
            ))}
          </Card>
        )}

        <Card className="mb-2 space-y-2 p-4">
          <Field label="Tu propia kabalá">
            <input
              className={inputCls}
              value={ownText}
              onChange={(e) => setOwnText(e.target.value)}
              placeholder="Algo concreto que aceptas sostener…"
            />
          </Field>
          <div className="flex gap-2">
            <select
              className={inputCls + ' flex-1'}
              value={ownArea}
              onChange={(e) => setOwnArea(e.target.value as AreaId | '')}
            >
              <option value="">(sin área)</option>
              {YEHUDI_GROUPS.map((g) => (
                <option key={g.area} value={g.area}>
                  {g.es}
                </option>
              ))}
            </select>
            <Btn onClick={addOwnKabala} disabled={!ownText.trim()}>
              Agregar
            </Btn>
          </div>
        </Card>

        {activeKabalot.length > 0 ? (
          <Card className="divide-y divide-line">
            {activeKabalot.map((k) => (
              <div key={k.id} className="px-4 py-3">
                {k.he && (
                  <p className="hebrew text-[14px] text-ink" dir="rtl">
                    {k.he}
                  </p>
                )}
                <p className="text-[13px] leading-relaxed text-ink-soft">{k.es}</p>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <span
                    className="text-[10px] uppercase tracking-[0.12em]"
                    style={{
                      color:
                        k.status === 'sostenida'
                          ? 'var(--success)'
                          : k.status === 'rota'
                            ? 'var(--danger)'
                            : 'var(--ink-faint)',
                    }}
                  >
                    {k.status === 'sostenida'
                      ? 'sostenida'
                      : k.status === 'rota'
                        ? 'se rompió'
                        : 'aceptada'}
                    {k.kind === 'own' ? ' · propia' : ''}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setKabalaStatus(k.id, 'sostenida')}
                      className="rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-soft"
                    >
                      La sostengo
                    </button>
                    <button
                      onClick={() => setKabalaStatus(k.id, 'rota')}
                      className="rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-soft"
                    >
                      Se rompió
                    </button>
                    <button
                      onClick={() => setKabalaStatus(k.id, 'archivada')}
                      className="rounded-md border border-line px-2 py-0.5 text-[11px] text-ink-faint"
                    >
                      Archivar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        ) : (
          <p className="px-1 text-[12px] text-ink-faint">
            Aún no aceptas ninguna kabalá. Acepta una propuesta o escribe la tuya.
          </p>
        )}
      </div>

      {/* Registro de toda la app */}
      {totals && (
        <div>
          <SectionTitle es="Registro de toda la app" he="הַכֹּל" />
          <Card className="grid grid-cols-2 gap-y-3 p-4 text-[13px]">
            {[
              ['Registros', totals.entries],
              ['Días registrados', totals.daysLogged],
              ['Victorias', totals.victories],
              ['Caídas', totals.falls],
              ['Recuperaciones', totals.recoveries],
              ['Minutos de Torá', totals.torahMinutes],
              ['Kabalot sostenidas', totals.kabalotSostenidas],
              ['% del catálogo', `${Math.round((circle?.catalogPct ?? 0) * 100)}%`],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-[18px] font-medium text-gold tabular-nums">{value}</div>
                <div className="text-[11px] text-ink-faint">{label}</div>
              </div>
            ))}
          </Card>
        </div>
      )}

      <button
        onClick={() => setEditingCatalog(true)}
        className="w-full rounded-xl border border-line bg-raised px-4 py-3 text-[13px] text-ink-soft"
      >
        Revisar el catálogo de halajot y jumrot ({circle?.catalogKept ?? 0}/{circle?.catalogTotal ?? 0}) →
      </button>
    </div>
  );
}
