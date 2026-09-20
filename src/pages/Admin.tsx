import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSession } from '../lib/auth/session';
import { requestPasswordReset } from '../lib/auth/accounts';
import { backendConfigured } from '../lib/supabase';
import {
  addAdminByEmail,
  AdminError,
  deleteUser,
  listEvents,
  listUsers,
  setAdmin,
  setDisabled,
  type AdminEvent,
  type AdminUser,
  type EventKind,
} from '../lib/admin';
import {
  featureAporte,
  KIND_LABEL,
  listAll,
  reviewAporte,
  deleteAporte,
  SPLASH_MAX,
  type AporteRow,
} from '../lib/aportes';
import { AporteForm } from '../components/Aportes';
import { deleteAviso, listAllAvisos, saveAviso, type Aviso } from '../lib/avisos';
import {
  COMUNIDAD_AREAS,
  deleteComunidad,
  endsLabel,
  fetchComunidad,
  saveComunidad,
  type KabalaComunidad,
  type KabalaComunidadInput,
} from '../lib/kabalaComunidad';
import { Btn, Card, Field, inputCls } from '../components/ui';

/* ───────────────────────────── Ayudas ───────────────────────────── */

const ONLINE_MS = 5 * 60_000; // la app avisa cada ~2 min: 5 min sin señal = ya no está en línea
const REFRESH_MS = 30_000;

const DEMO = import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo') === '1';

function ago(iso: string | null, now: number): string {
  if (!iso) return 'nunca';
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'justo ahora';
  const m = Math.round(s / 60);
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return 'ayer';
  if (d < 30) return `hace ${d} días`;
  return new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

function dateTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });

function dayLabel(iso: string, now: number): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date(now)) - start(d)) / 86_400_000);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Ayer';
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}

/** Formulario en blanco de una kabalá para todos: por defecto dura dos semanas. */
const emptyKab = (): KabalaComunidadInput => ({
  title: '',
  he: '',
  blurb: '',
  kavana: '',
  subject_label: '',
  pasuk_he: '',
  pasuk_es: '',
  pasuk_ref: '',
  kind: 'cuidar',
  area: 'speech',
  ends_on: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
  active: true,
});

const isOnline = (u: AdminUser, now: number) =>
  !!u.last_seen_at && now - new Date(u.last_seen_at).getTime() < ONLINE_MS;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ───────────────────────────── Datos de muestra (solo desarrollo) ───────────────────────────── */

function demoAportes(): AporteRow[] {
  const now = Date.now();
  const mk = (i: number, o: Partial<AporteRow>): AporteRow => ({
    id: `ap-${i}`,
    kind: 'dvar',
    title: '',
    body: '',
    source: '',
    author_id: 'demo-2',
    author_name: 'Sara Levy',
    anonymous: false,
    status: 'pendiente',
    featured: false,
    created_at: new Date(now - i * 3_600_000).toISOString(),
    reviewed_at: null,
    ...o,
  });
  return [
    mk(1, { title: 'Ser agradecido', body: 'Modé ani cada mañana nos enseña que empezamos el día dando gracias, antes de pedir nada.', source: 'Siddur' }),
    mk(2, { kind: 'musar', author_id: 'demo-3', author_name: 'David Mizrahi', anonymous: true, body: 'El tiempo que no se usa para servir a Hashem no vuelve. Cada minuto cuenta.' }),
    mk(3, { kind: 'pirush', status: 'aprobado', featured: true, title: 'Bereshit 1:1', body: 'Rashi pregunta por qué la Torá empieza con la creación y no con las mitzvot.', source: 'Rashi', reviewed_at: new Date(now).toISOString() }),
  ];
}

function demoData(): { users: AdminUser[]; events: AdminEvent[] } {
  const now = Date.now();
  const min = 60_000;
  const mk = (i: number, o: Partial<AdminUser>): AdminUser => ({
    id: `demo-${i}`,
    email: `persona${i}@ejemplo.com`,
    full_name: '',
    gender: 'hombre',
    role: 'user',
    disabled: false,
    created_at: new Date(now - 3 * 86_400_000).toISOString(),
    last_seen_at: null,
    last_login_at: null,
    login_count: 0,
    referred_by: null,
    referral_code: `demo${i}abc`,
    ...o,
  });
  const users = [
    mk(1, { full_name: 'Isaac Cohen (tú)', email: 'admin@ejemplo.com', role: 'admin', created_at: new Date(now - 30 * 86_400_000).toISOString(), last_seen_at: new Date(now - 1 * min).toISOString(), login_count: 84 }),
    mk(2, { full_name: 'Sara Levy', gender: 'mujer', created_at: new Date(now - 2 * 86_400_000).toISOString(), last_seen_at: new Date(now - 2 * min).toISOString(), login_count: 9, referred_by: 'demo-1' }),
    mk(3, { full_name: 'David Mizrahi', created_at: new Date(now - 5 * 86_400_000).toISOString(), last_seen_at: new Date(now - 47 * min).toISOString(), login_count: 14, referred_by: 'demo-1' }),
    mk(4, { full_name: 'Rivka Ben-David', gender: 'mujer', created_at: new Date(now - 1 * 86_400_000).toISOString(), last_seen_at: new Date(now - 3 * min).toISOString(), login_count: 3, referred_by: 'demo-2' }),
    mk(5, { full_name: 'Moshe Attias', created_at: new Date(now - 20 * 86_400_000).toISOString(), last_seen_at: new Date(now - 9 * 86_400_000).toISOString(), login_count: 22 }),
    mk(6, { full_name: 'Leah Sasson', gender: 'mujer', created_at: new Date(now - 40 * 60 * min).toISOString(), last_seen_at: new Date(now - 40 * 60 * min).toISOString(), login_count: 1, referred_by: 'demo-2' }),
    mk(7, { full_name: 'Yosef Romano', disabled: true, created_at: new Date(now - 12 * 86_400_000).toISOString(), last_seen_at: new Date(now - 11 * 86_400_000).toISOString(), login_count: 4 }),
  ];
  const ev = (i: number, at: number, kind: EventKind, user: string, actor?: string): AdminEvent => {
    const u = users.find((x) => x.id === user);
    return { id: i, at: new Date(at).toISOString(), kind, user_id: user, actor_id: actor ?? null, detail: { nombre: u?.full_name, correo: u?.email } };
  };
  const events = [
    ev(10, now - 30_000, 'actividad', 'demo-2'),
    ev(1, now - 1 * min, 'entrada', 'demo-1'),
    ev(2, now - 2 * min, 'entrada', 'demo-2'),
    ev(3, now - 3 * min, 'entrada', 'demo-4'),
    ev(4, now - 20 * min, 'registro', 'demo-4'),
    ev(5, now - 47 * min, 'entrada', 'demo-3'),
    ev(6, now - 40 * 60 * min, 'registro', 'demo-6'),
    ev(7, now - 26 * 60 * min, 'admin_otorgado', 'demo-1', 'demo-1'),
    ev(8, now - 2 * 86_400_000, 'registro', 'demo-2'),
    ev(9, now - 11 * 86_400_000, 'cuenta_desactivada', 'demo-7', 'demo-1'),
  ];
  return { users, events };
}

/* ───────────────────────────── Piezas ───────────────────────────── */

function Stat({ label, value, hint, live }: { label: string; value: string | number; hint?: string; live?: boolean }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {live && <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--success)]" />}
        {label}
      </div>
      <div className="mt-1 text-5xl leading-none text-ink">{value}</div>
      {hint && <div className="mt-2 text-[13px] text-ink-faint">{hint}</div>}
    </Card>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'gold' | 'green' | 'red' | 'muted' }) {
  const cls = {
    gold: 'bg-gold text-[#1a140a]',
    green: 'border border-[var(--success)] text-[var(--success)]',
    red: 'border border-[var(--danger)] text-[var(--danger)]',
    muted: 'border border-line text-ink-faint',
  }[tone];
  return <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium uppercase tracking-wide ${cls}`}>{children}</span>;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-[12px] uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-0.5 text-[15px] text-ink">{children}</div>
    </div>
  );
}

const chip = (on: boolean) =>
  `rounded-xl border px-4 py-2.5 text-[15px] transition-colors ${on ? 'border-gold bg-gold font-medium text-[#1a140a]' : 'border-line bg-raised text-ink-soft hover:border-gold'}`;

/* ───────────────────────────── Página ───────────────────────────── */

type Tab = 'resumen' | 'personas' | 'aportes' | 'avisos' | 'kabalot' | 'actividad';
type Filter = 'todas' | 'en_linea' | 'nuevas' | 'admins' | 'desactivadas';
type Sort = 'recientes' | 'ultima' | 'nombre' | 'entradas';
type EventFilter = 'todo' | 'actividad' | 'registros' | 'entradas' | 'aportes' | 'admin';

/**
 * Panel de administración: quién tiene cuenta, quién está en línea, quién se registró y cuándo
 * entra cada persona. NUNCA muestra lo que registra cada quien (caídas, logros, kabalot…):
 * eso vive solo en su dispositivo y no existe en el servidor.
 */
export default function Admin() {
  const me = getSession();
  const [tab, setTab] = useState<Tab>(() =>
    new URLSearchParams(window.location.search).get('t') === 'aportes' ? 'aportes' : 'resumen',
  );
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [extended, setExtended] = useState(true);
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [aportes, setAportes] = useState<AporteRow[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [avisos, setAvisos] = useState<Aviso[] | null>(null);
  const [kabalotCom, setKabalotCom] = useState<KabalaComunidad[] | null>(null);
  const [kabDraft, setKabDraft] = useState<KabalaComunidadInput>(emptyKab);
  const [avisoDraft, setAvisoDraft] = useState<{ id?: string; title: string; body: string }>({ title: '', body: '' });
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('todas');
  const [sort, setSort] = useState<Sort>('recientes');
  const [evFilter, setEvFilter] = useState<EventFilter>('todo');
  const [newAdmin, setNewAdmin] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      if (DEMO) {
        const d = demoData();
        setUsers(d.users);
        setEvents(d.events);
        setAportes(demoAportes());
        setKabalotCom([{ id: 'kc-1', title: 'No hablar lashón hará de la persona que más me cae mal', he: 'שְׁמִירַת הַלָּשׁוֹן', blurb: 'Hasta después de Sucot, sin lashón hará de esa persona.', kavana: '', subject_label: '', pasuk_he: '', pasuk_es: '', pasuk_ref: '', kind: 'cuidar', area: 'speech', ends_on: '2026-10-04', active: true, aceptaron: 42, acepte: false }]);
        setAvisos([{ id: 'av-1', title: 'Shabat Shalom', body: 'Que tengan un Shabat de mucha luz. Recuerden encender las velas a tiempo.', active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
        setExtended(true);
      } else {
        const [u, e, a, av, kc] = await Promise.all([listUsers(), listEvents(), listAll(), listAllAvisos(), fetchComunidad()]);
        setUsers(u.users);
        setExtended(u.extended);
        setEvents(e);
        setAportes(a);
        setAvisos(av);
        setKabalotCom(kc);
      }
      setNow(Date.now());
    } catch (e) {
      setError(e instanceof AdminError ? e.message : 'No se pudo cargar el panel.');
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [load]);

  async function run(action: () => Promise<void>, ok: string) {
    if (DEMO) return setMsg('(Modo de muestra: no se cambió nada.)');
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await action();
      setMsg(ok);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo completar la acción.');
    } finally {
      setBusy(false);
    }
  }

  const byId = useMemo(() => new Map((users ?? []).map((u) => [u.id, u])), [users]);

  const invitedCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const u of users ?? []) if (u.referred_by) m.set(u.referred_by, (m.get(u.referred_by) ?? 0) + 1);
    return m;
  }, [users]);

  const stats = useMemo(() => {
    const list = users ?? [];
    const day0 = new Date(now);
    day0.setHours(0, 0, 0, 0);
    const week = now - 7 * 86_400_000;
    const t = (s: string | null) => (s ? new Date(s).getTime() : 0);
    return {
      total: list.length,
      online: list.filter((u) => isOnline(u, now)),
      enteredToday: list.filter((u) => t(u.last_seen_at) >= day0.getTime()).length,
      active7: list.filter((u) => t(u.last_seen_at) >= week).length,
      registeredToday: list.filter((u) => t(u.created_at) >= day0.getTime()).length,
      registered7: list.filter((u) => t(u.created_at) >= week).length,
      admins: list.filter((u) => u.role === 'admin').length,
      women: list.filter((u) => u.gender === 'mujer').length,
      men: list.filter((u) => u.gender === 'hombre').length,
      disabled: list.filter((u) => u.disabled).length,
      viaInvite: list.filter((u) => u.referred_by).length,
    };
  }, [users, now]);

  const shown = useMemo(() => {
    let list = users ?? [];
    const term = q.trim().toLowerCase();
    if (term) list = list.filter((u) => u.email.toLowerCase().includes(term) || u.full_name.toLowerCase().includes(term));
    const week = now - 7 * 86_400_000;
    if (filter === 'en_linea') list = list.filter((u) => isOnline(u, now));
    if (filter === 'nuevas') list = list.filter((u) => new Date(u.created_at).getTime() >= week);
    if (filter === 'admins') list = list.filter((u) => u.role === 'admin');
    if (filter === 'desactivadas') list = list.filter((u) => u.disabled);
    const t = (s: string | null) => (s ? new Date(s).getTime() : 0);
    const sorted = [...list];
    if (sort === 'recientes') sorted.sort((a, b) => t(b.created_at) - t(a.created_at));
    if (sort === 'ultima') sorted.sort((a, b) => t(b.last_seen_at) - t(a.last_seen_at));
    if (sort === 'nombre') sorted.sort((a, b) => (a.full_name || a.email).localeCompare(b.full_name || b.email, 'es'));
    if (sort === 'entradas') sorted.sort((a, b) => b.login_count - a.login_count);
    return sorted;
  }, [users, q, filter, sort, now]);

  const eventsShown = useMemo(() => {
    const list = events ?? [];
    const admin: EventKind[] = ['admin_otorgado', 'admin_quitado', 'cuenta_desactivada', 'cuenta_activada', 'cuenta_borrada'];
    if (evFilter === 'actividad') return list.filter((e) => e.kind === 'actividad');
    if (evFilter === 'aportes') return list.filter((e) => e.kind.startsWith('aporte_'));
    if (evFilter === 'registros') return list.filter((e) => e.kind === 'registro');
    if (evFilter === 'entradas') return list.filter((e) => e.kind === 'entrada');
    if (evFilter === 'admin') return list.filter((e) => admin.includes(e.kind));
    return list;
  }, [events, evFilter]);

  function exportCsv() {
    const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [
      ['Nombre', 'Correo', 'Género', 'Rol', 'Estado', 'Se registró', 'Última vez', 'Entradas', 'Personas que invitó'],
      ...shown.map((u) => [
        u.full_name,
        u.email,
        u.gender ?? '',
        u.role === 'admin' ? 'Admin' : 'Usuario',
        u.disabled ? 'Desactivada' : 'Activa',
        dateTime(u.created_at),
        dateTime(u.last_seen_at),
        u.login_count,
        invitedCount.get(u.id) ?? 0,
      ]),
    ];
    const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n'); // BOM: Excel lee bien los acentos
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `avodah-personas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!DEMO && !backendConfigured) {
    return (
      <Card className="p-5 text-[15px] text-ink-soft">
        El panel necesita el servidor (Supabase). Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en .env.local.
      </Card>
    );
  }
  if (!DEMO && !me?.isAdmin) {
    return <Card className="p-5 text-[15px] text-ink-soft">Esta sección es solo para administradores.</Card>;
  }

  const who = (id: string | null, fallback?: { nombre?: string; correo?: string }) => {
    const u = id ? byId.get(id) : undefined;
    return u?.full_name || u?.email || fallback?.nombre || fallback?.correo || 'Alguien';
  };

  const describe = (e: AdminEvent): string => {
    const name = who(e.user_id, e.detail);
    const actor = who(e.actor_id);
    switch (e.kind) {
      case 'registro':
        return e.detail.invitado_por ? `${name} se registró con la invitación de ${who(e.detail.invitado_por)}` : `${name} se registró`;
      case 'entrada':
        return `${name} entró a la app`;
      case 'admin_otorgado':
        return `${actor} hizo admin a ${name}`;
      case 'admin_quitado':
        return `${actor} quitó el permiso de admin a ${name}`;
      case 'cuenta_desactivada':
        return `${actor} desactivó la cuenta de ${name}`;
      case 'cuenta_activada':
        return `${actor} volvió a activar la cuenta de ${name}`;
      case 'cuenta_borrada':
        return `${actor} borró la cuenta de ${name}`;
      case 'actividad':
        return e.detail.veces && e.detail.veces > 1 ? `${name} registró · ${e.detail.veces} veces` : `${name} registró`;
      case 'aporte_enviado':
        return e.detail.directo
          ? `${name} publicó un aporte (${e.detail.tipo ?? 'dvar'})`
          : `${name} mandó un aporte (${e.detail.tipo ?? 'dvar'}) a revisión`;
      case 'aporte_aprobado':
        return `${actor} aprobó un aporte de ${name}`;
      case 'aporte_rechazado':
        return `${actor} rechazó un aporte de ${name}`;
      case 'kabala_aceptada':
        return `${name} aceptó la kabalá «${e.detail.kabala ?? ''}»`;
    }
  };

  const dotColor = (k: EventKind) =>
    k === 'registro' || k === 'aporte_enviado' ? 'bg-gold' : k === 'entrada' || k === 'actividad' || k === 'aporte_aprobado' || k === 'kabala_aceptada' ? 'bg-[var(--success)]' : k === 'aporte_rechazado' ? 'bg-[var(--danger)]' : k === 'cuenta_borrada' || k === 'cuenta_desactivada' ? 'bg-[var(--danger)]' : 'bg-ink-faint';

  const pending = (aportes ?? []).filter((a) => a.status === 'pendiente');
  const aporteAuthor = (a: AporteRow) => (a.author_id ? who(a.author_id) : a.author_name || 'Alguien');

  const TABS: [Tab, string][] = [
    ['resumen', 'Resumen'],
    ['personas', `Personas${users ? ` (${users.length})` : ''}`],
    ['aportes', `Aportes${pending.length ? ` (${pending.length})` : ''}`],
    ['avisos', 'Avisos'],
    ['kabalot', 'Kabalot'],
    ['actividad', 'Actividad'],
  ];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="hebrew text-3xl text-gold" style={{ direction: 'ltr', textAlign: 'left' }}>ניהול</div>
          <h1 className="text-3xl text-ink">Panel de administración</h1>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-ink-soft">
            Ves quién tiene cuenta, quién está en línea y cuándo entra cada persona.{' '}
            Ves que alguien <span className="text-ink">registró algo</span>, pero nunca qué (caídas, logros, kabalot): eso solo vive en su dispositivo.
          </p>
        </div>
        <div className="text-right text-[13px] text-ink-faint">
          Actualizado {ago(new Date(now).toISOString(), Date.now())}
          <div>
            <button onClick={() => void load()} className="mt-1 text-[15px] text-gold underline underline-offset-2">
              Actualizar ahora
            </button>
          </div>
        </div>
      </div>

      {DEMO && (
        <Card className="border-gold p-3 text-[13px] text-gold">Modo de muestra: estos datos son de ejemplo y no se guarda nada.</Card>
      )}

      {/* Pestañas grandes */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-line bg-raised p-1.5 sm:grid-cols-6">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-xl py-3 text-[16px] transition-colors ${tab === id ? 'bg-gold font-medium text-[#1a140a]' : 'text-ink-soft hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {!extended && (
        <Card className="border-[var(--danger)] p-4 text-[14px] leading-relaxed text-ink">
          <strong>Falta activar la auditoría.</strong> Sin ella no se ven las entradas ni la actividad. Pega{' '}
          <code className="text-gold">supabase/admin-auditoria.sql</code> en el Editor SQL de Supabase y pulsa Run.
        </Card>
      )}
      {msg && <p className="text-[15px] text-[var(--success)]">{msg}</p>}
      {error && <p className="text-[15px] text-[var(--danger)]">{error}</p>}
      {!users && !error && <p className="text-[15px] text-ink-faint">Cargando…</p>}

      {users && tab === 'resumen' && (
        <div className="space-y-6">
          {pending.length > 0 && (
            <button onClick={() => setTab('aportes')} className="block w-full rounded-2xl border-2 border-gold bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-5 py-4 text-start">
              <span className="block text-[17px] font-medium text-ink">{plural(pending.length, 'aporte espera', 'aportes esperan')} tu aprobación</span>
              <span className="block text-[13px] text-ink-soft">Toca para revisarlos y publicarlos.</span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="En línea ahora" value={stats.online.length} live hint="con la app abierta" />
            <Stat label="Entraron hoy" value={stats.enteredToday} />
            <Stat label="Activas en 7 días" value={stats.active7} />
            <Stat label="Cuentas en total" value={stats.total} />
            <Stat label="Registradas hoy" value={stats.registeredToday} />
            <Stat label="Registradas en 7 días" value={stats.registered7} />
            <Stat label="Llegaron por invitación" value={stats.viaInvite} hint="con el enlace de alguien" />
            <Stat label="Admins" value={stats.admins} hint={stats.disabled ? `${plural(stats.disabled, 'desactivada', 'desactivadas')}` : undefined} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="p-5">
              <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-ink-faint">Mujeres y hombres</div>
              <div className="mt-2 flex items-baseline gap-6">
                <div>
                  <span className="text-3xl text-ink">{stats.women}</span> <span className="text-[14px] text-ink-soft">mujeres</span>
                </div>
                <div>
                  <span className="text-3xl text-ink">{stats.men}</span> <span className="text-[14px] text-ink-soft">hombres</span>
                </div>
              </div>
            </Card>
          </div>

          <section className="space-y-3">
            <h2 className="text-xl text-ink">En línea ahora</h2>
            {stats.online.length === 0 ? (
              <Card className="p-5 text-[15px] text-ink-faint">Nadie tiene la app abierta en este momento.</Card>
            ) : (
              <Card className="divide-y divide-line">
                {stats.online.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--success)]" />
                      <div className="min-w-0">
                        <div className="truncate text-[16px] text-ink">{u.full_name || '(sin nombre)'}</div>
                        <div className="truncate text-[13px] text-ink-faint">{u.email}</div>
                      </div>
                    </div>
                    <span className="shrink-0 text-[13px] text-ink-faint">{ago(u.last_seen_at, now)}</span>
                  </div>
                ))}
              </Card>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl text-ink">Últimos registros</h2>
              <button onClick={() => setTab('personas')} className="text-[14px] text-gold underline underline-offset-2">
                Ver todas las personas
              </button>
            </div>
            <Card className="divide-y divide-line">
              {[...users]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 8)
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <div className="truncate text-[16px] text-ink">{u.full_name || '(sin nombre)'}</div>
                      <div className="truncate text-[13px] text-ink-faint">{u.email}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[14px] text-ink">{ago(u.created_at, now)}</div>
                      <div className="text-[12px] text-ink-faint">{dateTime(u.created_at)}</div>
                    </div>
                  </div>
                ))}
            </Card>
          </section>
        </div>
      )}

      {users && tab === 'personas' && (
        <div className="space-y-5">
          <Card className="space-y-3 p-5">
            <h2 className="text-lg text-ink">Hacer admin a otra persona</h2>
            <p className="text-[13px] leading-relaxed text-ink-faint">
              Debe haberse registrado antes en la app con ese correo. Un admin ve la lista de cuentas y las administra, pero nunca
              ve lo que registran.
            </p>
            <form
              className="flex flex-wrap gap-2"
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
                className={inputCls + ' min-w-0 flex-1 !py-3'}
                type="email"
                placeholder="correo@ejemplo.com"
                value={newAdmin}
                onChange={(e) => setNewAdmin(e.target.value)}
                aria-label="Correo de la nueva persona admin"
              />
              <Btn type="submit" disabled={busy} className="!py-3">
                Hacer admin
              </Btn>
            </form>
          </Card>

          <div className="space-y-3">
            <Field label="Buscar por nombre o correo">
              <input className={inputCls + ' !py-3 !text-[16px]'} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe para buscar…" />
            </Field>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['todas', 'Todas'],
                  ['en_linea', `En línea (${stats.online.length})`],
                  ['nuevas', 'Nuevas (7 días)'],
                  ['admins', 'Admins'],
                  ['desactivadas', 'Desactivadas'],
                ] as [Filter, string][]
              ).map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id)} className={chip(filter === id)}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-[14px] text-ink-soft">
                Ordenar por
                <select className={inputCls + ' !w-auto !py-2'} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="recientes">Más nuevas primero</option>
                  <option value="ultima">Última vez que entraron</option>
                  <option value="entradas">Más entradas</option>
                  <option value="nombre">Nombre (A–Z)</option>
                </select>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-[14px] text-ink-faint">{plural(shown.length, 'persona', 'personas')}</span>
                <Btn variant="ghost" onClick={exportCsv} disabled={shown.length === 0}>
                  Descargar lista (Excel)
                </Btn>
              </div>
            </div>
          </div>

          {shown.length === 0 && <p className="text-[15px] text-ink-faint">No hay personas que coincidan.</p>}

          <div className="space-y-4">
            {shown.map((u) => {
              const self = u.id === me?.userId;
              const online = isOnline(u, now);
              const inviter = u.referred_by ? byId.get(u.referred_by) : undefined;
              return (
                <Card key={u.id} className={`space-y-4 p-5 ${u.disabled ? 'opacity-60' : ''}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xl text-ink">{u.full_name || '(sin nombre)'}</span>
                      {online && <Badge tone="green">En línea</Badge>}
                      {u.role === 'admin' && <Badge tone="gold">Admin</Badge>}
                      {u.disabled && <Badge tone="red">Desactivada</Badge>}
                      {self && <Badge tone="muted">Tú</Badge>}
                    </div>
                    <div className="mt-1 break-all text-[15px] text-ink-soft">{u.email}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                    <Fact label="Se registró">
                      {ago(u.created_at, now)}
                      <div className="text-[13px] text-ink-faint">{dateTime(u.created_at)}</div>
                    </Fact>
                    <Fact label="Última vez">
                      {online ? <span className="text-[var(--success)]">En línea ahora</span> : ago(u.last_seen_at, now)}
                      {u.last_seen_at && !online && <div className="text-[13px] text-ink-faint">{dateTime(u.last_seen_at)}</div>}
                    </Fact>
                    <Fact label="Entradas">{extended ? u.login_count : '—'}</Fact>
                    <Fact label="Es">{u.gender === 'mujer' ? 'Mujer' : u.gender === 'hombre' ? 'Hombre' : '—'}</Fact>
                    <Fact label="Invitó a">{plural(invitedCount.get(u.id) ?? 0, 'persona', 'personas')}</Fact>
                    <Fact label="Llegó por">{inviter ? `Invitación de ${inviter.full_name || inviter.email}` : 'Su cuenta, sin invitación'}</Fact>
                  </div>

                  {!self && (
                    <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() => run(() => setAdmin(u.id, u.role !== 'admin'), u.role === 'admin' ? 'Ya no es admin.' : 'Ahora es admin.')}
                      >
                        {u.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          run(
                            async () => {
                              try {
                                await requestPasswordReset(u.email);
                              } catch (e) {
                                throw new Error(e instanceof Error ? e.message : 'No se pudo enviar el enlace.');
                              }
                            },
                            `Enviamos a ${u.email} el enlace para crear una contraseña nueva.`,
                          )
                        }
                      >
                        Enviar enlace de contraseña
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() => run(() => setDisabled(u.id, !u.disabled), u.disabled ? 'Cuenta activada.' : 'Cuenta desactivada.')}
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
        </div>
      )}

      {users && tab === 'aportes' && (
        <div className="space-y-6">
          {aportes === null ? (
            <Card className="border-[var(--danger)] p-4 text-[14px] leading-relaxed text-ink">
              <strong>Falta activar los aportes.</strong> Pega <code className="text-gold">supabase/aportes.sql</code> en el Editor SQL de
              Supabase y pulsa Run.
            </Card>
          ) : (
            <>
              <div>
                {showForm ? (
                  <AporteForm onSent={() => void load()} onCancel={() => setShowForm(false)} />
                ) : (
                  <Btn onClick={() => setShowForm(true)}>Publicar algo yo (sale directo, sin revisión)</Btn>
                )}
              </div>

              <section className="space-y-3">
                <h2 className="text-xl text-ink">Por aprobar ({pending.length})</h2>
                {pending.length === 0 && <Card className="p-5 text-[15px] text-ink-faint">No hay nada esperando tu revisión.</Card>}
                {pending.map((a) => (
                  <Card key={a.id} className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="gold">{KIND_LABEL[a.kind]}</Badge>
                      <span className="text-[13px] text-ink-faint">{ago(a.created_at, now)}</span>
                    </div>
                    {a.title && <h3 className="text-[18px] text-ink">{a.title}</h3>}
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.body}</p>
                    {a.source && <p className="text-[13px] text-ink-faint">Fuente: {a.source}</p>}
                    <p className="text-[13px] text-ink-soft">
                      Lo mandó <strong className="text-ink">{aporteAuthor(a)}</strong> · se publicará{' '}
                      {a.anonymous ? <strong className="text-ink">como anónimo</strong> : 'con su nombre'}
                    </p>
                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <Btn disabled={busy} onClick={() => run(() => reviewAporte(a.id, true), 'Aprobado: ya lo ven todos.')}>
                        Aprobar y publicar
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={busy || a.body.length > SPLASH_MAX}
                        onClick={() =>
                          run(async () => {
                            await reviewAporte(a.id, true);
                            await featureAporte(a.id, true);
                          }, 'Aprobado y puesto en la pantalla de entrada.')
                        }
                      >
                        Aprobar y poner en la pantalla de entrada
                      </Btn>
                      <Btn variant="danger" disabled={busy} onClick={() => run(() => reviewAporte(a.id, false), 'Rechazado.')}>
                        Rechazar
                      </Btn>
                    </div>
                    {a.body.length > SPLASH_MAX && (
                      <p className="text-[12px] text-ink-faint">
                        Es largo para la pantalla de entrada (máx. {SPLASH_MAX} letras); solo puede publicarse en Torá.
                      </p>
                    )}
                  </Card>
                ))}
              </section>

              <section className="space-y-3">
                <h2 className="text-xl text-ink">Publicados ({aportes.filter((a) => a.status === 'aprobado').length})</h2>
                <p className="text-[13px] leading-relaxed text-ink-faint">
                  Todos los ven en Torá → Comunidad. Puedes poner uno en la pantalla que sale al entrar a la app, en lugar de «Servir a Hashem
                  en todos tus caminos». Solo hay uno a la vez.
                </p>
                {aportes.filter((a) => a.status === 'aprobado').length === 0 && (
                  <Card className="p-5 text-[15px] text-ink-faint">Todavía no hay aportes publicados.</Card>
                )}
                {aportes
                  .filter((a) => a.status === 'aprobado')
                  .map((a) => (
                    <Card key={a.id} className={`space-y-3 p-5 ${a.featured ? 'border-gold' : ''}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="gold">{KIND_LABEL[a.kind]}</Badge>
                        {a.featured && <Badge tone="green">En la pantalla de entrada</Badge>}
                        {a.anonymous && <Badge tone="muted">Anónimo</Badge>}
                        <span className="text-[13px] text-ink-faint">
                          {aporteAuthor(a)} · {dateTime(a.created_at)}
                        </span>
                      </div>
                      {a.title && <h3 className="text-[18px] text-ink">{a.title}</h3>}
                      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.body}</p>
                      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                        {a.featured ? (
                          <Btn variant="ghost" disabled={busy} onClick={() => run(() => featureAporte(a.id, false), 'Quitado: vuelve el lema de siempre.')}>
                            Quitar de la pantalla de entrada
                          </Btn>
                        ) : (
                          <Btn
                            variant="ghost"
                            disabled={busy || a.body.length > SPLASH_MAX}
                            onClick={() => run(() => featureAporte(a.id, true), 'Puesto en la pantalla de entrada.')}
                          >
                            Poner en la pantalla de entrada
                          </Btn>
                        )}
                        <Btn
                          variant="danger"
                          disabled={busy}
                          onClick={() => {
                            if (confirm('¿Borrar este aporte? Deja de verse para todos.')) void run(() => deleteAporte(a.id), 'Borrado.');
                          }}
                        >
                          Borrar
                        </Btn>
                      </div>
                      {a.body.length > SPLASH_MAX && !a.featured && (
                        <p className="text-[12px] text-ink-faint">Es largo para la pantalla de entrada (máx. {SPLASH_MAX} letras).</p>
                      )}
                    </Card>
                  ))}
              </section>

              {aportes.some((a) => a.status === 'rechazado') && (
                <section className="space-y-3">
                  <h2 className="text-xl text-ink">Rechazados</h2>
                  {aportes
                    .filter((a) => a.status === 'rechazado')
                    .map((a) => (
                      <Card key={a.id} className="space-y-2 p-4 opacity-80">
                        <div className="text-[13px] text-ink-faint">
                          {KIND_LABEL[a.kind]} · {aporteAuthor(a)} · {ago(a.created_at, now)}
                        </div>
                        <p className="line-clamp-3 whitespace-pre-line text-[14px] text-ink-soft">{a.body}</p>
                        <div className="flex gap-2">
                          <Btn variant="ghost" disabled={busy} onClick={() => run(() => reviewAporte(a.id, true), 'Aprobado: ya lo ven todos.')}>
                            Aprobar
                          </Btn>
                          <Btn variant="danger" disabled={busy} onClick={() => run(() => deleteAporte(a.id), 'Borrado.')}>
                            Borrar
                          </Btn>
                        </div>
                      </Card>
                    ))}
                </section>
              )}
            </>
          )}
        </div>
      )}

      {users && tab === 'avisos' && (
        <div className="space-y-6">
          {avisos === null ? (
            <Card className="border-[var(--danger)] p-4 text-[14px] leading-relaxed text-ink">
              <strong>Falta activar los avisos.</strong> Pega <code className="text-gold">supabase/avisos.sql</code> en el Editor SQL de
              Supabase y pulsa Run.
            </Card>
          ) : (
            <>
              <Card className="space-y-4 p-5">
                <div>
                  <h2 className="text-xl text-ink">{avisoDraft.id ? 'Editar aviso' : 'Nuevo aviso para todos'}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
                    Sale arriba, en «Hoy» y en «¿Cómo estoy?», para todas las personas, hasta que lo ocultes o lo borres.
                  </p>
                </div>
                <Field label="Título (opcional)">
                  <input
                    className={inputCls + ' !py-3'}
                    value={avisoDraft.title}
                    maxLength={120}
                    onChange={(e) => setAvisoDraft({ ...avisoDraft, title: e.target.value })}
                    placeholder="Por ejemplo: Shabat Shalom"
                  />
                </Field>
                <Field label="Texto del aviso" hint={`${avisoDraft.body.trim().length} / 1000 letras`}>
                  <textarea
                    className={inputCls + ' min-h-[8rem]'}
                    value={avisoDraft.body}
                    maxLength={1000}
                    onChange={(e) => setAvisoDraft({ ...avisoDraft, body: e.target.value })}
                    placeholder="Escribe aquí lo que quieres decirles a todos…"
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    disabled={busy || avisoDraft.body.trim().length < 1}
                    onClick={() =>
                      run(async () => {
                        await saveAviso({ id: avisoDraft.id, title: avisoDraft.title.trim(), body: avisoDraft.body.trim(), active: true });
                        setAvisoDraft({ title: '', body: '' });
                      }, avisoDraft.id ? 'Aviso actualizado.' : 'Aviso publicado: ya lo ven todos.')
                    }
                  >
                    {avisoDraft.id ? 'Guardar cambios' : 'Publicar aviso'}
                  </Btn>
                  {avisoDraft.id && (
                    <Btn variant="quiet" onClick={() => setAvisoDraft({ title: '', body: '' })}>
                      Cancelar
                    </Btn>
                  )}
                </div>
              </Card>

              <section className="space-y-3">
                <h2 className="text-xl text-ink">Avisos ({avisos.length})</h2>
                {avisos.length === 0 && <Card className="p-5 text-[15px] text-ink-faint">Todavía no hay avisos.</Card>}
                {avisos.map((a) => (
                  <Card key={a.id} className={`space-y-3 p-5 ${a.active ? 'border-gold' : 'opacity-70'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {a.active ? <Badge tone="green">Visible para todos</Badge> : <Badge tone="muted">Oculto</Badge>}
                      <span className="text-[13px] text-ink-faint">{dateTime(a.created_at)}</span>
                    </div>
                    {a.title && <h3 className="text-[18px] text-ink">{a.title}</h3>}
                    <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.body}</p>
                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setAvisoDraft({ id: a.id, title: a.title, body: a.body });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Editar
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          run(
                            () => saveAviso({ id: a.id, title: a.title, body: a.body, active: !a.active }),
                            a.active ? 'Aviso oculto: ya no lo ven.' : 'Aviso visible otra vez.',
                          )
                        }
                      >
                        {a.active ? 'Ocultar' : 'Mostrar'}
                      </Btn>
                      <Btn
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          if (confirm('¿Borrar este aviso para siempre?')) void run(() => deleteAviso(a.id), 'Aviso borrado.');
                        }}
                      >
                        Borrar
                      </Btn>
                    </div>
                  </Card>
                ))}
              </section>
            </>
          )}
        </div>
      )}

      {users && tab === 'kabalot' && (
        <div className="space-y-6">
          {kabalotCom === null ? (
            <Card className="border-[var(--danger)] p-4 text-[14px] leading-relaxed text-ink">
              <strong>Falta activar las kabalot para todos.</strong> Pega <code className="text-gold">supabase/kabalot-comunidad.sql</code> en el
              Editor SQL de Supabase y pulsa Run.
            </Card>
          ) : (
            <>
              <Card className="space-y-4 p-5">
                <div>
                  <h2 className="text-xl text-ink">{kabDraft.id ? 'Editar kabalá' : 'Nueva kabalá para todos'}</h2>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
                    Sale en «Hoy» para todas las personas. Quien toca «Acepto» se suma, todos ven cuántas la aceptaron, y cada día se le pregunta si
                    hoy la cumplió (eso solo lo ve ella o él).
                  </p>
                </div>
                <Field label="Título">
                  <input className={inputCls + ' !py-3'} value={kabDraft.title} maxLength={140} onChange={(e) => setKabDraft({ ...kabDraft, title: e.target.value })} placeholder="Por ejemplo: No hablar lashón hará de la persona que más me cae mal" />
                </Field>
                <Field label="Título en hebreo (opcional)">
                  <input className={inputCls + ' !py-3'} dir="rtl" value={kabDraft.he} maxLength={140} onChange={(e) => setKabDraft({ ...kabDraft, he: e.target.value })} />
                </Field>
                <Field label="Explicación" hint={`${kabDraft.blurb.length} / 800 letras`}>
                  <textarea className={inputCls + ' min-h-[8rem]'} value={kabDraft.blurb} maxLength={800} onChange={(e) => setKabDraft({ ...kabDraft, blurb: e.target.value })} />
                </Field>
                <Field label="Kavaná (para qué se hace)">
                  <input className={inputCls + ' !py-3'} value={kabDraft.kavana} maxLength={300} onChange={(e) => setKabDraft({ ...kabDraft, kavana: e.target.value })} />
                </Field>
                <Field label="Pregunta opcional al aceptar (solo la persona la ve)" hint="Si la dejas vacía, no se pregunta nada. Lo que responda se queda en su dispositivo.">
                  <input className={inputCls + ' !py-3'} value={kabDraft.subject_label} maxLength={160} onChange={(e) => setKabDraft({ ...kabDraft, subject_label: e.target.value })} placeholder="Por ejemplo: ¿Quién es? (opcional)" />
                </Field>
                <Field label="Pasuk de inspiración (hebreo)">
                  <textarea className={inputCls + ' min-h-[4rem]'} dir="rtl" value={kabDraft.pasuk_he} maxLength={400} onChange={(e) => setKabDraft({ ...kabDraft, pasuk_he: e.target.value })} />
                </Field>
                <Field label="Pasuk en español">
                  <textarea className={inputCls + ' min-h-[4rem]'} value={kabDraft.pasuk_es} maxLength={400} onChange={(e) => setKabDraft({ ...kabDraft, pasuk_es: e.target.value })} />
                </Field>
                <Field label="Fuente del pasuk">
                  <input className={inputCls + ' !py-3'} value={kabDraft.pasuk_ref} maxLength={80} onChange={(e) => setKabDraft({ ...kabDraft, pasuk_ref: e.target.value })} placeholder="Por ejemplo: Tehilim 34:14-15" />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Es de">
                    <select className={inputCls + ' !py-3'} value={kabDraft.kind} onChange={(e) => setKabDraft({ ...kabDraft, kind: e.target.value as 'cuidar' | 'hacer' })}>
                      <option value="cuidar">Cuidar algo (no hacerlo)</option>
                      <option value="hacer">Hacer algo cada día</option>
                    </select>
                  </Field>
                  <Field label="Área">
                    <select className={inputCls + ' !py-3'} value={kabDraft.area} onChange={(e) => setKabDraft({ ...kabDraft, area: e.target.value })}>
                      {COMUNIDAD_AREAS.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.es}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Dura hasta (incluido)">
                    <input type="date" className={inputCls + ' !py-3'} value={kabDraft.ends_on} onChange={(e) => setKabDraft({ ...kabDraft, ends_on: e.target.value })} />
                  </Field>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Btn
                    disabled={busy || kabDraft.title.trim().length < 3 || !kabDraft.ends_on}
                    onClick={() =>
                      run(async () => {
                        await saveComunidad({ ...kabDraft, id: kabDraft.id, active: kabDraft.active });
                        setKabDraft(emptyKab());
                      }, kabDraft.id ? 'Kabalá actualizada.' : 'Kabalá publicada: ya la ven todos.')
                    }
                  >
                    {kabDraft.id ? 'Guardar cambios' : 'Publicar kabalá'}
                  </Btn>
                  {kabDraft.id && (
                    <Btn variant="quiet" onClick={() => setKabDraft(emptyKab())}>
                      Cancelar
                    </Btn>
                  )}
                </div>
              </Card>

              <section className="space-y-3">
                <h2 className="text-xl text-ink">Kabalot ({kabalotCom.length})</h2>
                {kabalotCom.length === 0 && <Card className="p-5 text-[15px] text-ink-faint">Todavía no hay kabalot para todos.</Card>}
                {kabalotCom.map((k) => (
                  <Card key={k.id} className={`space-y-3 p-5 ${k.active ? 'border-gold' : 'opacity-70'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      {k.active ? <Badge tone="green">Visible para todos</Badge> : <Badge tone="muted">Oculta</Badge>}
                      <Badge tone="gold">{plural(k.aceptaron, 'aceptó', 'aceptaron')}</Badge>
                      <span className="text-[13px] text-ink-faint">hasta el {endsLabel(k.ends_on)}</span>
                    </div>
                    <h3 className="text-[18px] text-ink">{k.title}</h3>
                    {k.blurb && <p className="line-clamp-3 whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{k.blurb}</p>}
                    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() => {
                          setKabDraft({ ...k });
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        Editar
                      </Btn>
                      <Btn
                        variant="ghost"
                        disabled={busy}
                        onClick={() => run(() => saveComunidad({ ...k, active: !k.active }), k.active ? 'Kabalá oculta.' : 'Kabalá visible otra vez.')}
                      >
                        {k.active ? 'Ocultar' : 'Mostrar'}
                      </Btn>
                      <Btn
                        variant="danger"
                        disabled={busy}
                        onClick={() => {
                          if (confirm('¿Borrar esta kabalá? También se borra la cuenta de quiénes la aceptaron.')) void run(() => deleteComunidad(k.id), 'Kabalá borrada.');
                        }}
                      >
                        Borrar
                      </Btn>
                    </div>
                  </Card>
                ))}
              </section>
            </>
          )}
        </div>
      )}

      {users && tab === 'actividad' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['todo', 'Todo'],
                ['actividad', 'Registraron algo'],
                ['entradas', 'Entradas'],
                ['registros', 'Cuentas nuevas'],
                ['aportes', 'Aportes'],
                ['admin', 'Acciones de admin'],
              ] as [EventFilter, string][]
            ).map(([id, label]) => (
              <button key={id} onClick={() => setEvFilter(id)} className={chip(evFilter === id)}>
                {label}
              </button>
            ))}
          </div>

          {events === null ? (
            <Card className="p-5 text-[15px] text-ink-soft">La actividad todavía no está activada. Falta ejecutar la auditoría (arriba).</Card>
          ) : eventsShown.length === 0 ? (
            <Card className="p-5 text-[15px] text-ink-faint">Todavía no hay actividad de este tipo.</Card>
          ) : (
            <Card className="divide-y divide-line">
              {eventsShown.map((e, i) => {
                const label = dayLabel(e.at, now);
                const prev = i > 0 ? dayLabel(eventsShown[i - 1].at, now) : null;
                return (
                  <div key={e.id}>
                    {label !== prev && (
                      <div className="bg-[var(--bg-sunken)] px-5 py-2 text-[13px] font-medium uppercase tracking-[0.14em] text-ink-faint">{label}</div>
                    )}
                    <div className="flex items-start gap-3 px-5 py-3.5">
                      <span className="w-12 shrink-0 pt-0.5 text-[14px] tabular-nums text-ink-faint">{hhmm(e.at)}</span>
                      <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor(e.kind)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] leading-snug text-ink">{describe(e)}</div>
                        {e.detail.correo && <div className="truncate text-[13px] text-ink-faint">{e.detail.correo}</div>}
                      </div>
                      <span className="shrink-0 text-[12px] text-ink-faint">{ago(e.at, now)}</span>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}
          <p className="text-[12px] leading-relaxed text-ink-faint">
            Se muestran los últimos {events?.length ?? 0} eventos. Una "entrada" se cuenta cuando alguien abre la app después de más de 30
            minutos sin usarla.
          </p>
        </div>
      )}
    </div>
  );
}
