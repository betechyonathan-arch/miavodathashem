import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSession } from '../lib/auth/session';
import { backendConfigured } from '../lib/supabase';
import {
  addAdminByEmail,
  AdminError,
  deleteUser,
  listUsers,
  setAdmin,
  setDisabled,
  type AdminUser,
} from '../lib/admin';
import { Btn, Card, Field, SectionTitle, inputCls } from '../components/ui';

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/**
 * Panel de administración: quién tiene cuenta, quién es admin, activar/desactivar y
 * borrar cuentas. NO muestra ningún registro personal — esos datos no están aquí.
 */
export default function Admin() {
  const me = getSession();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [newAdmin, setNewAdmin] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setUsers(await listUsers());
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'No se pudo cargar la lista.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<void>, ok: string) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await action();
      setMsg(ok);
      await load();
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  }

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!users) return [];
    return t ? users.filter((u) => u.email.toLowerCase().includes(t) || u.full_name.toLowerCase().includes(t)) : users;
  }, [users, q]);

  const stats = useMemo(() => {
    const list = users ?? [];
    const week = Date.now() - 7 * 86_400_000;
    return {
      total: list.length,
      admins: list.filter((u) => u.role === 'admin').length,
      active7: list.filter((u) => u.last_seen_at && new Date(u.last_seen_at).getTime() > week).length,
      women: list.filter((u) => u.gender === 'mujer').length,
      men: list.filter((u) => u.gender === 'hombre').length,
    };
  }, [users]);

  if (!backendConfigured) {
    return (
      <div className="space-y-4">
        <SectionTitle es="Administración" he="ניהול" />
        <Card className="p-4 text-[14px] text-ink-soft">
          El panel necesita el servidor (Supabase). Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.
        </Card>
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="space-y-4">
        <SectionTitle es="Administración" he="ניהול" />
        <Card className="p-4 text-[14px] text-ink-soft">Esta sección es solo para administradores.</Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle es="Administración" he="ניהול" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ['Cuentas', stats.total],
          ['Activas (7 días)', stats.active7],
          ['Admins', stats.admins],
          ['Mujeres / Hombres', `${stats.women} / ${stats.men}`],
        ].map(([label, value]) => (
          <Card key={label as string} className="p-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{label}</div>
            <div className="mt-0.5 text-2xl text-ink">{value}</div>
          </Card>
        ))}
      </div>

      <Card className="space-y-3 p-4">
        <SectionTitle es="Hacer admin a otra persona" he="מנהל חדש" />
        <p className="text-[12px] text-ink-faint">
          Debe haberse registrado antes en la app con ese correo. Un admin puede ver la lista de cuentas y
          administrarlas, pero nunca ve los registros personales de nadie.
        </p>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newAdmin.trim()) return;
            void run(async () => {
              await addAdminByEmail(newAdmin);
              setNewAdmin('');
            }, 'Listo: ahora es admin.');
          }}
        >
          <input
            className={inputCls}
            type="email"
            placeholder="correo@ejemplo.com"
            value={newAdmin}
            onChange={(e) => setNewAdmin(e.target.value)}
            aria-label="Correo de la nueva persona admin"
          />
          <Btn type="submit" disabled={busy}>
            Hacer admin
          </Btn>
        </form>
      </Card>

      {msg && <p className="text-[13px] text-[var(--success)]">{msg}</p>}
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}

      <section className="space-y-3">
        <Field label="Buscar cuenta">
          <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o correo" />
        </Field>

        {!users && !error && <p className="text-[13px] text-ink-faint">Cargando cuentas…</p>}
        {users && shown.length === 0 && <p className="text-[13px] text-ink-faint">No hay cuentas que coincidan.</p>}

        <div className="space-y-2">
          {shown.map((u) => {
            const self = u.id === me.userId;
            return (
              <Card key={u.id} className={`space-y-2 p-3 ${u.disabled ? 'opacity-60' : ''}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <div className="min-w-0">
                    <span className="text-[15px] text-ink">{u.full_name || '(sin nombre)'}</span>
                    {u.role === 'admin' && (
                      <span className="ms-2 rounded bg-gold px-1.5 py-0.5 text-[10px] font-medium uppercase text-[#1a140a]">admin</span>
                    )}
                    {u.disabled && (
                      <span className="ms-2 rounded border border-[var(--danger)] px-1.5 py-0.5 text-[10px] uppercase text-[var(--danger)]">
                        desactivada
                      </span>
                    )}
                    {self && <span className="ms-2 text-[11px] text-ink-faint">(tú)</span>}
                  </div>
                  <span className="text-[11px] text-ink-faint">
                    {u.gender ?? '—'} · alta {fmtDate(u.created_at)} · último acceso {fmtDate(u.last_seen_at)}
                  </span>
                </div>
                <div className="break-all text-[13px] text-ink-soft">{u.email}</div>
                {!self && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Btn
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(
                          () => setAdmin(u.id, u.role !== 'admin'),
                          u.role === 'admin' ? 'Ya no es admin.' : 'Ahora es admin.',
                        )
                      }
                    >
                      {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </Btn>
                    <Btn
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        run(() => setDisabled(u.id, !u.disabled), u.disabled ? 'Cuenta activada.' : 'Cuenta desactivada.')
                      }
                    >
                      {u.disabled ? 'Activar' : 'Desactivar'}
                    </Btn>
                    <Btn
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        if (confirm(`¿Borrar la cuenta de ${u.email}? No se puede deshacer.`)) {
                          void run(() => deleteUser(u.id), 'Cuenta borrada.');
                        }
                      }}
                    >
                      Borrar
                    </Btn>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
