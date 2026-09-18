import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import { archiveGoal, upsertGoal } from '../lib/db/repo';
import type { Goal, GoalLevel } from '../lib/db/schema';
import { CATEGORIES, catLabel } from '../lib/categories';
import { GOAL_LEVELS, STATUS_LABEL, levelLabel, parentLevel } from '../lib/goals';
import { Btn, Card, Field, SectionTitle, inputCls } from './ui';

const STATUS_TONE: Record<string, string> = {
  active: 'text-[var(--success)]',
  paused: 'text-ink-faint',
  done: 'text-gold',
  dropped: 'text-[var(--danger)]',
};

export default function GoalsPanel() {
  const [level, setLevel] = useState<GoalLevel>('year');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const allGoals = useLiveQuery(() => db.goals.toArray(), [], [] as Goal[]);
  const goals = useMemo(
    () => allGoals.filter((g) => g.level === level && (showArchived || !g.archivedAt)),
    [allGoals, level, showArchived],
  );
  const parentOptions = useMemo(() => {
    const pl = parentLevel(level);
    return pl && pl !== 'mission' ? allGoals.filter((g) => g.level === pl && !g.archivedAt) : [];
  }, [allGoals, level]);
  const stages = useLiveQuery(() => db.stages.toArray(), [], []);

  const parentLabel = (g: Goal) => {
    if (!g.parentId) return null;
    const pg = allGoals.find((x) => x.id === g.parentId);
    if (pg) return pg.title;
    const st = stages.find((s) => s.id === g.parentId);
    return st ? st.name : null;
  };

  return (
    <div className="space-y-4">
      <SectionTitle es="Jerarquía de metas" he="מטרות" />
      <p className="-mt-2 text-[12px] text-ink-faint">
        Misión de vida → Etapa → Año → Mes → Semana → Día. Las metas pueden cambiar; nada se borra.
      </p>

      <div className="flex gap-1">
        {GOAL_LEVELS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLevel(l.id)}
            className={`flex-1 rounded-lg border py-1.5 text-[12px] ${
              level === l.id ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-soft'
            }`}
          >
            {l.es}
            <span className="hebrew block text-[10px] opacity-70">{l.he}</span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => setShowArchived((v) => !v)} className="text-[12px] text-ink-faint">
          {showArchived ? 'ocultar archivadas' : 'ver archivadas'}
        </button>
        <Btn variant="ghost" onClick={() => { setCreating(true); setEditing(null); }}>
          ＋ Añadir {GOAL_LEVELS.find((l) => l.id === level)?.es.toLowerCase()}
        </Btn>
      </div>

      {creating && (
        <GoalEditor
          level={level}
          parentOptions={parentOptions}
          stages={level === 'stage' ? [] : stages}
          onDone={() => setCreating(false)}
        />
      )}

      {goals.length === 0 && !creating && (
        <Card className="p-5 text-center text-[13px] text-ink-faint">
          Aún no hay metas a nivel {GOAL_LEVELS.find((l) => l.id === level)?.es.toLowerCase()}.
        </Card>
      )}

      <ul className="space-y-2">
        {goals.map((g) =>
          editing === g.id ? (
            <GoalEditor
              key={g.id}
              goal={g}
              level={level}
              parentOptions={parentOptions}
              stages={stages}
              onDone={() => setEditing(null)}
            />
          ) : (
            <li key={g.id} className={`rounded-xl border border-line bg-raised p-3 ${g.archivedAt ? 'opacity-50' : ''}`}>
              <button className="w-full text-left" onClick={() => setEditing(g.id)}>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[14px] text-ink">{g.title || '(sin título)'}</span>
                  <span className={`shrink-0 text-[11px] ${STATUS_TONE[g.status]}`}>{STATUS_LABEL[g.status]}</span>
                </div>
                {g.description && <p className="mt-0.5 text-[12px] text-ink-soft">{g.description}</p>}
                <div className="mt-1 flex flex-wrap gap-1">
                  {g.area && <span className="rounded bg-sunken px-1.5 py-0.5 text-[10px] text-ink-soft">{catLabel(g.area)}</span>}
                  {parentLabel(g) && (
                    <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">↑ {parentLabel(g)}</span>
                  )}
                  {g.targetDate && (
                    <span className="rounded border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">
                      {new Date(g.targetDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${g.progress}%` }} />
                  </div>
                  <span className="text-[11px] text-ink-faint">{g.progress}%</span>
                </div>
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}

function GoalEditor({
  goal,
  level,
  parentOptions,
  stages,
  onDone,
}: {
  goal?: Goal;
  level: GoalLevel;
  parentOptions: Goal[];
  stages: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [g, setG] = useState<Partial<Goal>>(
    goal ?? { level, status: 'active', progress: 0, area: null, parentId: null },
  );

  const parentChoices = level === 'stage' ? stages.map((s) => ({ id: s.id, name: s.name })) : parentOptions.map((p) => ({ id: p.id, name: p.title }));

  return (
    <Card className="space-y-3 p-4">
      <Field label="Nombre">
        <input className={inputCls} value={g.title ?? ''} onChange={(e) => setG({ ...g, title: e.target.value })} />
      </Field>
      <Field label="Descripción">
        <textarea className={inputCls + ' resize-none'} rows={2} value={g.description ?? ''} onChange={(e) => setG({ ...g, description: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Área">
          <select className={inputCls} value={g.area ?? ''} onChange={(e) => setG({ ...g, area: (e.target.value || null) as Goal['area'] })}>
            <option value="">—</option>
            {CATEGORIES.filter((c) => c.group === 'avodah' || c.group === 'evento').map((c) => (
              <option key={c.id} value={c.id}>{c.emoji} {c.es}</option>
            ))}
          </select>
        </Field>
        <Field label={level === 'stage' ? 'Etapa' : `Depende de (${parentLevel(level) === 'mission' ? 'misión' : levelLabel(parentLevel(level) ?? 'year').toLowerCase()})`}>
          <select className={inputCls} value={g.parentId ?? ''} onChange={(e) => setG({ ...g, parentId: e.target.value || null })}>
            <option value="">—</option>
            {parentChoices.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Fecha objetivo">
          <input type="date" className={inputCls} value={(g.targetDate ?? '').slice(0, 10)} onChange={(e) => setG({ ...g, targetDate: e.target.value || null })} />
        </Field>
        <Field label="Estado">
          <select className={inputCls} value={g.status ?? 'active'} onChange={(e) => setG({ ...g, status: e.target.value as Goal['status'] })}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </Field>
      </div>
      <div>
        <div className="mb-1 text-[13px] font-medium text-ink-soft">Progreso: {g.progress ?? 0}%</div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={g.progress ?? 0}
          onChange={(e) => setG({ ...g, progress: Number(e.target.value) })}
          className="w-full accent-[var(--gold)]"
        />
      </div>
      <Field label="Notas">
        <textarea className={inputCls + ' resize-none'} rows={2} value={g.notes ?? ''} onChange={(e) => setG({ ...g, notes: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" className="flex-1" onClick={onDone}>Cancelar</Btn>
        <Btn
          className="flex-1"
          onClick={async () => {
            await upsertGoal({ ...g, id: goal?.id, level });
            onDone();
          }}
        >
          Guardar
        </Btn>
        {goal && (
          <Btn variant="quiet" onClick={async () => { await archiveGoal(goal.id); onDone(); }}>
            {goal.archivedAt ? 'Restaurar' : 'Archivar'}
          </Btn>
        )}
      </div>
    </Card>
  );
}
