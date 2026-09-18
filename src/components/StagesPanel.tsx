import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db/db';
import { archiveStage, setCurrentStage, upsertStage } from '../lib/db/repo';
import type { Entry, LifeStage } from '../lib/db/schema';
import { Btn, Card, Field, SectionTitle, inputCls } from './ui';

function stat(entries: Entry[]) {
  const days = new Set(entries.map((e) => e.dayId)).size;
  const wins = entries.filter((e) => e.valence === 'victory').length;
  const falls = entries.filter((e) => e.valence === 'fall').length;
  let torahMin = 0;
  for (const e of entries) if (typeof e.fields.minutes === 'number' && (e.area === 'torah' || e.areasSecondary.includes('torah'))) torahMin += e.fields.minutes;
  return { entries: entries.length, days, wins, falls, torahMin };
}

export default function StagesPanel() {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [compare, setCompare] = useState(false);

  const stagesRaw = useLiveQuery(() => db.stages.toArray(), [], [] as LifeStage[]);
  const stages = useMemo(
    () => stagesRaw.filter((s) => !s.archivedAt).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.startDate.localeCompare(b.startDate)),
    [stagesRaw],
  );
  const allEntries = useLiveQuery(async () => (await db.entries.toArray()).filter((e) => !e.deletedAt), [], [] as Entry[]);

  const rangeFor = (s: LifeStage) => {
    const from = s.startDate.slice(0, 10);
    const to = (s.endDate ?? new Date().toISOString()).slice(0, 10);
    return allEntries.filter((e) => e.dayId >= from && e.dayId <= to);
  };

  return (
    <div className="space-y-4">
      <SectionTitle es="Etapas de vida" he="שלבי חיים" />
      <p className="-mt-2 text-[12px] text-ink-faint">
        Yeshivá, trabajo, matrimonio, familia… Tú las defines. Ninguna se borra: puedes verlas y compararlas siempre.
      </p>

      <div className="flex items-center justify-between">
        <button onClick={() => setCompare((v) => !v)} className="text-[12px] text-gold" disabled={stages.length < 2}>
          {compare ? 'ver lista' : 'comparar etapas'}
        </button>
        <Btn variant="ghost" onClick={() => { setCreating(true); setEditing(null); }}>＋ Nueva etapa</Btn>
      </div>

      {creating && <StageEditor onDone={() => setCreating(false)} />}

      {compare ? (
        <Card className="overflow-x-auto p-3">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-ink-faint">
                <th className="py-1 text-left">Etapa</th>
                <th className="px-2">Días</th>
                <th className="px-2">Reg.</th>
                <th className="px-2">🟢</th>
                <th className="px-2">🔴</th>
                <th className="px-2">Torá</th>
              </tr>
            </thead>
            <tbody>
              {stages.map((s) => {
                const st = stat(rangeFor(s));
                return (
                  <tr key={s.id} className="border-t border-line text-ink">
                    <td className="py-1.5">
                      {s.name}
                      {s.isCurrent && <span className="ml-1 text-[10px] text-gold">actual</span>}
                    </td>
                    <td className="px-2 text-center">{st.days}</td>
                    <td className="px-2 text-center">{st.entries}</td>
                    <td className="px-2 text-center">{st.wins}</td>
                    <td className="px-2 text-center">{st.falls}</td>
                    <td className="px-2 text-center">{st.torahMin ? `${st.torahMin}m` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-ink-faint">Cuenta lo registrado dentro del rango de fechas de cada etapa.</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {stages.map((s) =>
            editing === s.id ? (
              <StageEditor key={s.id} stage={s} onDone={() => setEditing(null)} />
            ) : (
              <li key={s.id} className="rounded-xl border border-line bg-raised p-3">
                <button className="w-full text-left" onClick={() => setEditing(s.id)}>
                  <div className="flex items-start justify-between">
                    <span className="text-[15px] text-ink">
                      {s.name}
                      {s.he && <span className="hebrew text-ink-faint"> · {s.he}</span>}
                    </span>
                    {s.isCurrent && <span className="text-[11px] text-gold">● actual</span>}
                  </div>
                  <div className="text-[12px] text-ink-faint">
                    {new Date(s.startDate + 'T12:00').toLocaleDateString('es-MX', { month: 'short', year: 'numeric' })}
                    {' – '}
                    {s.endDate ? new Date(s.endDate + 'T12:00').toLocaleDateString('es-MX', { month: 'short', year: 'numeric' }) : 'en curso'}
                  </div>
                  {s.primaryMiddah && <div className="mt-1 text-[12px] text-ink-soft">Midá de la etapa: {s.primaryMiddah}</div>}
                  {s.description && <p className="mt-0.5 text-[12px] text-ink-soft">{s.description}</p>}
                </button>
                {!s.isCurrent && (
                  <button onClick={() => setCurrentStage(s.id)} className="mt-2 text-[11px] text-gold">
                    marcar como etapa actual
                  </button>
                )}
              </li>
            ),
          )}
          {stages.length === 0 && !creating && (
            <Card className="p-5 text-center text-[13px] text-ink-faint">
              Aún no has creado ninguna etapa.
            </Card>
          )}
        </ul>
      )}
    </div>
  );
}

function StageEditor({ stage, onDone }: { stage?: LifeStage; onDone: () => void }) {
  const [s, setS] = useState<Partial<LifeStage>>(
    stage ?? { name: '', he: '', startDate: new Date().toISOString().slice(0, 10), endDate: null },
  );
  const [ongoing, setOngoing] = useState(stage ? stage.endDate == null : true);

  return (
    <Card className="space-y-3 p-4">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Nombre">
          <input className={inputCls} value={s.name ?? ''} onChange={(e) => setS({ ...s, name: e.target.value })} placeholder="Etapa Yeshivá" />
        </Field>
        <Field label="Nombre hebreo (opcional)">
          <input className={inputCls + ' hebrew'} value={s.he ?? ''} onChange={(e) => setS({ ...s, he: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Inicio">
          <input type="date" className={inputCls} value={(s.startDate ?? '').slice(0, 10)} onChange={(e) => setS({ ...s, startDate: e.target.value })} />
        </Field>
        <Field label="Fin">
          <input
            type="date"
            className={inputCls}
            disabled={ongoing}
            value={(s.endDate ?? '').slice(0, 10)}
            onChange={(e) => setS({ ...s, endDate: e.target.value || null })}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-[13px] text-ink-soft">
        <input type="checkbox" checked={ongoing} onChange={(e) => { setOngoing(e.target.checked); if (e.target.checked) setS({ ...s, endDate: null }); }} />
        En curso (sin fecha de fin)
      </label>
      <Field label="Midá principal de la etapa">
        <input className={inputCls} value={s.primaryMiddah ?? ''} onChange={(e) => setS({ ...s, primaryMiddah: e.target.value })} placeholder="Ej. Savlanut" />
      </Field>
      <Field label="Enfoque / valores de la etapa">
        <textarea className={inputCls + ' resize-none'} rows={2} value={s.focus ?? ''} onChange={(e) => setS({ ...s, focus: e.target.value })} />
      </Field>
      <Field label="Descripción">
        <textarea className={inputCls + ' resize-none'} rows={2} value={s.description ?? ''} onChange={(e) => setS({ ...s, description: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Btn variant="ghost" className="flex-1" onClick={onDone}>Cancelar</Btn>
        <Btn
          className="flex-1"
          onClick={async () => {
            await upsertStage({ ...s, id: stage?.id, endDate: ongoing ? null : s.endDate ?? null });
            onDone();
          }}
        >
          Guardar
        </Btn>
        {stage && (
          <Btn variant="quiet" onClick={async () => { await archiveStage(stage.id); onDone(); }}>
            Archivar
          </Btn>
        )}
      </div>
    </Card>
  );
}
