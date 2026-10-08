import { useMemo, useState } from 'react';
import type { AdminUser } from '../lib/admin';
import { Btn, inputCls } from './ui';

/** Solo admin: buscar y elegir a una persona (por nombre o correo). */
export default function ElegirPersona({ users, value, onChange }: { users: AdminUser[]; value: string | null; onChange: (id: string | null) => void }) {
  const [q, setQ] = useState('');
  const elegida = users.find((u) => u.id === value);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return users.filter((u) => !u.disabled && (u.full_name.toLowerCase().includes(t) || u.email.toLowerCase().includes(t))).slice(0, 8);
  }, [q, users]);

  if (elegida) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gold/60 bg-raised px-3 py-2.5">
        <span className="text-[14px] text-ink">
          {elegida.full_name || elegida.email}
          <span className="ml-2 text-[12px] text-ink-faint">{elegida.email}</span>
        </span>
        <Btn variant="quiet" onClick={() => onChange(null)}>
          Cambiar
        </Btn>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <input className={inputCls} value={q} onChange={(ev) => setQ(ev.target.value)} placeholder="Busca por nombre o correo…" />
      {matches.map((u) => (
        <button
          key={u.id}
          type="button"
          onClick={() => {
            onChange(u.id);
            setQ('');
          }}
          className="block w-full rounded-lg border border-line bg-raised px-3 py-2 text-left text-[14px] text-ink hover:border-gold"
        >
          {u.full_name || u.email}
          <span className="ml-2 text-[12px] text-ink-faint">{u.email}</span>
        </button>
      ))}
      {q.trim() && matches.length === 0 && <p className="text-[12px] text-ink-faint">Nadie con ese nombre o correo.</p>}
    </div>
  );
}
