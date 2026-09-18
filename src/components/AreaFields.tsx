import { Fragment } from 'react';
import type { FieldDef } from '../lib/areaForms';
import { inputCls } from './ui';

type Value = Record<string, unknown>;

export default function AreaFields({
  schema,
  value,
  onChange,
}: {
  schema: FieldDef[];
  value: Value;
  onChange: (next: Value) => void;
}) {
  const set = (k: string, v: unknown) => {
    const next = { ...value };
    if (v === '' || v === undefined || v === null || (Array.isArray(v) && v.length === 0)) delete next[k];
    else next[k] = v;
    onChange(next);
  };

  // agrupar por `group`
  const groups: { name: string | null; fields: FieldDef[] }[] = [];
  for (const f of schema) {
    const g = f.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.name === g) last.fields.push(f);
    else groups.push({ name: g, fields: [f] });
  }

  return (
    <div className="space-y-3">
      {groups.map((grp, gi) => (
        <Fragment key={gi}>
          {grp.name && (
            <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {grp.name}
            </div>
          )}
          {grp.fields.map((f) => (
            <Field key={f.key} f={f} value={value[f.key]} onChange={(v) => set(f.key, v)} />
          ))}
        </Fragment>
      ))}
    </div>
  );
}

function Field({
  f,
  value,
  onChange,
}: {
  f: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const label = (
    <span className="mb-1 flex items-baseline gap-2 text-[12px] font-medium text-ink-soft">
      {f.label}
      {f.he && <span className="hebrew text-[11px] text-ink-faint">{f.he}</span>}
      {f.unit && <span className="text-[10px] text-ink-faint">({f.unit})</span>}
    </span>
  );

  if (f.type === 'bool') {
    return (
      <button
        type="button"
        onClick={() => onChange(value ? undefined : true)}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-[13px] ${
          value ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] text-ink' : 'border-line text-ink-soft'
        }`}
      >
        <span className="flex items-baseline gap-2">
          {f.label}
          {f.he && <span className="hebrew text-[11px] text-ink-faint">{f.he}</span>}
        </span>
        <span>{value ? '✓' : ''}</span>
      </button>
    );
  }

  if (f.type === 'scale') {
    const v = typeof value === 'number' ? value : null;
    return (
      <label className="block">
        {label}
        <div className="flex flex-wrap gap-1">
          {Array.from({ length: (f.max ?? 10) - (f.min ?? 0) + 1 }, (_, i) => i + (f.min ?? 0)).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(v === n ? undefined : n)}
              className={`h-7 w-7 rounded-md border text-[11px] ${
                v === n ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-faint'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        {f.hint && <span className="mt-1 block text-[10px] text-ink-faint">{f.hint}</span>}
      </label>
    );
  }

  if (f.type === 'select') {
    return (
      <label className="block">
        {label}
        <select className={inputCls} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {f.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (f.type === 'multiselect') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    const toggle = (o: string) => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o]);
    return (
      <div>
        {label}
        <div className="flex flex-wrap gap-1.5">
          {f.options?.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={`rounded-lg border px-2 py-1 text-[12px] ${
                arr.includes(o) ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_14%,transparent)]' : 'border-line text-ink-soft'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (f.type === 'chips') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <label className="block">
        {label}
        <input
          className={inputCls}
          defaultValue={arr.join(', ')}
          placeholder={f.placeholder ?? 'separadas por coma'}
          onBlur={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        />
        {f.hint && <span className="mt-1 block text-[10px] text-ink-faint">{f.hint}</span>}
      </label>
    );
  }

  if (f.type === 'textarea') {
    return (
      <label className="block">
        {label}
        <textarea
          className={inputCls + ' resize-none'}
          rows={2}
          value={(value as string) ?? ''}
          placeholder={f.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    );
  }

  // text | number | time
  return (
    <label className="block">
      {label}
      <input
        className={inputCls}
        type={f.type === 'number' ? 'number' : f.type === 'time' ? 'time' : 'text'}
        min={f.min}
        max={f.max}
        value={(value as string | number) ?? ''}
        placeholder={f.placeholder}
        onChange={(e) => onChange(f.type === 'number' ? (e.target.value === '' ? undefined : Number(e.target.value)) : e.target.value)}
      />
      {f.hint && <span className="mt-1 block text-[10px] text-ink-faint">{f.hint}</span>}
    </label>
  );
}

// --- Presentación de fields guardados (para EntryList / DayView) ---
export function describeFields(area: string, fields: Record<string, unknown>): { label: string; value: string }[] {
  const out: { label: string; value: string }[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === '' || v == null || (Array.isArray(v) && v.length === 0)) continue;
    out.push({ label: FIELD_LABELS[`${area}.${k}`] ?? FIELD_LABELS[k] ?? k, value: fmt(v) });
  }
  return out;
}

function fmt(v: unknown): string {
  if (Array.isArray(v)) return v.join(', ');
  if (v === true) return 'sí';
  if (v === false) return 'no';
  return String(v);
}

// etiquetas mínimas para lectura (las más comunes; el resto cae en la key)
const FIELD_LABELS: Record<string, string> = {
  minutes: 'min',
  hours: 'horas',
  kind: 'Tipo',
  which: 'Tefilá',
  sefer: 'Sefer',
  masejet: 'Masejet',
  daf: 'Daf',
  topic: 'Tema',
  seder: 'Seder',
  concentration: 'Concentración',
  understanding: 'Comprensión',
  quality: 'Calidad',
  effort: 'Esfuerzo',
  kavana: 'Kavaná',
  connection: 'Conexión',
  awareness: 'Conciencia',
  level: 'Nivel',
  trust: 'Bitajón',
  middah: 'Midá',
  situation: 'Situación',
  result: 'Resultado',
  learned: 'Aprendí',
  chidush: 'Chidush',
  notes: 'Notas',
  note: 'Nota',
  song: 'Canción',
  artist: 'Artista',
  category: 'Categoría',
  effect: 'Efecto',
  emotions: 'Emociones',
  intensity: 'Intensidad',
  stress: 'Estrés',
  hoursWork: 'Horas',
  screenMin: 'Pantalla (min)',
  durationMin: 'Duración (min)',
  simcha: 'Simjá',
  satisfaction: 'Satisfacción',
  forWhat: 'Agradezco',
  fromHashem: 'De Hashem',
};
