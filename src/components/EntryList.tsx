import { useState } from 'react';
import type { Entry, Valence } from '../lib/db/schema';
import { catEmoji, catLabel } from '../lib/categories';
import { archiveEntry, restoreEntry, reviseEntry } from '../lib/db/repo';
import { timeHM } from '../lib/format';
import { describeFields } from './AreaFields';
import { Btn, inputCls } from './ui';

const VAL_DOT: Record<Valence, string> = {
  victory: 'bg-[var(--success)]',
  fall: 'bg-[var(--danger)]',
  recovery: 'bg-gold',
  neutral: 'bg-line',
};

export default function EntryList({ entries }: { entries: Entry[] }) {
  return (
    <ul className="space-y-2">
      {entries.map((e) => (
        <EntryRow key={e.id} e={e} />
      ))}
    </ul>
  );
}

function EntryRow({ e }: { e: Entry }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(e.text);

  return (
    <li
      className={`rounded-xl border border-line bg-raised p-3 ${e.deletedAt ? 'opacity-50' : ''}`}
    >
      <button className="flex w-full items-start gap-3 text-left" onClick={() => setOpen((v) => !v)}>
        <span className="mt-0.5 text-lg">{catEmoji(e.area)}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-[12px] font-medium text-ink-soft">{catLabel(e.area)}</span>
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${VAL_DOT[e.valence]}`} />
            <span className="text-[11px] text-ink-faint">{timeHM(e.createdAt)}</span>
            {e.revisions.length > 0 && (
              <span className="text-[10px] text-ink-faint">· editado {e.revisions.length}×</span>
            )}
            {e.fields && Object.keys(e.fields).length > 0 && (
              <span className="text-[10px] text-ink-faint">· ▦ {Object.keys(e.fields).length}</span>
            )}
          </span>
          <span className={`mt-0.5 block text-[14px] text-ink ${open ? '' : 'line-clamp-2'}`}>{e.text}</span>
          {(e.tags.length > 0 || e.areasSecondary.length > 0) && (
            <span className="mt-1 flex flex-wrap gap-1">
              {e.areasSecondary.map((a) => (
                <span key={a} className="rounded bg-sunken px-1.5 py-0.5 text-[10px] text-ink-soft">
                  {catEmoji(a)} {catLabel(a)}
                </span>
              ))}
              {e.tags.map((t) => (
                <span key={t} className="rounded border border-line px-1 py-0.5 text-[10px] text-ink-faint">
                  #{t}
                </span>
              ))}
            </span>
          )}
        </span>
      </button>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          {e.intensity != null && (
            <div className="mb-2 text-[12px] text-ink-soft">Intensidad: {e.intensity}/10</div>
          )}
          {(() => {
            const rows = describeFields(e.area, e.fields);
            return rows.length ? (
              <dl className="mb-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px]">
                {rows.map((r, i) => (
                  <div key={i} className="contents">
                    <dt className="text-ink-faint">{r.label}</dt>
                    <dd className="text-ink">{r.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null;
          })()}
          {e.revisions.length > 0 && (
            <details className="mb-2 text-[12px] text-ink-faint">
              <summary className="cursor-pointer text-gold">Historial de este registro ({e.revisions.length})</summary>
              <ul className="mt-1 space-y-1">
                {e.revisions.map((r, i) => (
                  <li key={i} className="rounded bg-sunken p-2">
                    <span className="block text-[10px]">{timeHM(r.at)}</span>
                    <span className="block">{r.prevText}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {editing ? (
            <div className="space-y-2">
              <textarea
                className={inputCls + ' resize-none'}
                rows={3}
                value={draft}
                onChange={(ev) => setDraft(ev.target.value)}
              />
              <div className="flex gap-2">
                <Btn
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    setEditing(false);
                    setDraft(e.text);
                  }}
                >
                  Cancelar
                </Btn>
                <Btn
                  className="flex-1"
                  onClick={async () => {
                    await reviseEntry(e.id, { text: draft }, 'edición manual');
                    setEditing(false);
                  }}
                >
                  Guardar revisión
                </Btn>
              </div>
              <p className="text-[10px] text-ink-faint">El texto anterior se conserva en el historial.</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Btn variant="quiet" onClick={() => setEditing(true)}>
                Corregir
              </Btn>
              {e.deletedAt ? (
                <Btn variant="quiet" onClick={() => restoreEntry(e.id)}>
                  Restaurar
                </Btn>
              ) : (
                <Btn variant="quiet" onClick={() => archiveEntry(e.id)}>
                  Archivar
                </Btn>
              )}
            </div>
          )}
        </div>
      )}
    </li>
  );
}
