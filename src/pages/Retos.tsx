import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useZury } from '../state/zury';
import { KIND_COPY, TARGET_SHORTCUTS } from '../lib/kabala';
import { COMUNIDAD_AREAS } from '../lib/kabalaComunidad';
import {
  RetoError,
  abandonarReto,
  buscarParaRetar,
  crearReto,
  listMisRetos,
  listParticipantesReto,
  listRetosPublicos,
  marcarDiaReto,
  reportarReto,
  responderInvitacion,
  unirsePorLink,
  type MiReto,
  type ParticipanteReto,
  type RetoPublico,
  type UsuarioBusqueda,
} from '../lib/retos';
import { backendConfigured } from '../lib/supabase';
import { siteOrigin } from '../lib/site';
import {
  TehilimError,
  listCadenas,
  listCapitulos,
  marcarDicho,
  organizarCadena,
  soltarCapitulo,
  tomarCapitulo,
  type Cadena,
  type Capitulo,
} from '../lib/tehilim';
import { Btn, Card, Field, SectionTitle, inputCls } from '../components/ui';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function retoLink(code: string): string {
  return `${siteOrigin()}/retos/${code}`;
}

function tehilimLink(code: string): string {
  return `${siteOrigin()}/retos/tehilim/${code}`;
}

async function compartirUrl(url: string, text: string) {
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Avodah', text, url });
      return 'compartido';
    }
  } catch {
    /* la persona canceló el share nativo: seguimos con copiar */
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copiado';
  } catch {
    return null;
  }
}

function ShareBtn({ url, text, label }: { url: string; text: string; label?: string }) {
  const [msg, setMsg] = useState('');
  return (
    <div className="flex items-center gap-2">
      <Btn
        variant="ghost"
        onClick={async () => {
          const r = await compartirUrl(url, text);
          setMsg(r === 'compartido' ? '' : r === 'copiado' ? 'Enlace copiado.' : 'No se pudo copiar.');
          if (r) setTimeout(() => setMsg(''), 2500);
        }}
      >
        🔗 {label ?? 'Compartir enlace'}
      </Btn>
      {msg && <span className="text-[12px] text-ink-faint">{msg}</span>}
    </div>
  );
}

/* ───────────────────────── Crear reto ───────────────────────── */

function CrearReto({ onCreated }: { onCreated: (id: string) => void }) {
  const { day } = useZury();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<'cuidar' | 'hacer'>('cuidar');
  const [area, setArea] = useState<string>(COMUNIDAD_AREAS[0].id);
  const [target, setTarget] = useState(5);
  const [visibility, setVisibility] = useState<'privado' | 'publico'>('privado');
  const [q, setQ] = useState('');
  const [opciones, setOpciones] = useState<UsuarioBusqueda[]>([]);
  const [elegido, setElegido] = useState<UsuarioBusqueda | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visibility !== 'privado') return;
    let alive = true;
    buscarParaRetar(q)
      .then((r) => alive && setOpciones(r))
      .catch(() => alive && setOpciones([]));
    return () => {
      alive = false;
    };
  }, [q, visibility]);

  async function crear() {
    if (!day) return;
    setBusy(true);
    setError('');
    try {
      const r = await crearReto({
        title: title.trim(),
        description: description.trim(),
        kind,
        area,
        targetDays: target,
        visibility,
        dayId: day.dayId,
        invitadoInicial: elegido?.user_id,
      });
      onCreated(r.id);
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo crear el reto.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-5">
        <Field label="El reto (por ejemplo: «5 días sin decir groserías»)">
          <input className={inputCls} value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Explicación (opcional)">
          <textarea className={inputCls + ' min-h-[4rem]'} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Es de">
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as 'cuidar' | 'hacer')}>
              <option value="cuidar">Cuidar algo (no hacerlo)</option>
              <option value="hacer">Hacer algo cada día</option>
            </select>
          </Field>
          <Field label="Área">
            <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value)}>
              {COMUNIDAD_AREAS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.es}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Cuántos días">
          <div className="flex flex-wrap gap-1.5">
            {TARGET_SHORTCUTS.map((n) => (
              <button
                key={n}
                onClick={() => setTarget(n)}
                className={`rounded-lg border px-3 py-1.5 text-[13px] ${target === n ? 'border-gold bg-gold text-[#1a140a]' : 'border-line bg-raised text-ink-soft'}`}
              >
                {n}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={365}
              className={inputCls + ' !w-20'}
              value={target}
              onChange={(e) => setTarget(Math.min(365, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setVisibility('privado')} className={`rounded-xl border p-3 text-left ${visibility === 'privado' ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]' : 'border-line bg-raised'}`}>
            <div className="text-[14px] font-medium text-ink">Privado</div>
            <div className="text-[12px] text-ink-faint">Solo quien invites. No pasa por revisión.</div>
          </button>
          <button onClick={() => setVisibility('publico')} className={`rounded-xl border p-3 text-left ${visibility === 'publico' ? 'border-gold bg-[color-mix(in_srgb,var(--gold)_10%,transparent)]' : 'border-line bg-raised'}`}>
            <div className="text-[14px] font-medium text-ink">Público</div>
            <div className="text-[12px] text-ink-faint">Cualquiera se suscribe, anónimo. Un admin lo revisa antes.</div>
          </button>
        </div>

        {visibility === 'privado' && (
          <Field label="Retar a alguien de una vez (opcional)" hint="Solo aparece gente de tu mismo género. Puedes invitar a más después, o mandar el enlace por WhatsApp.">
            {elegido ? (
              <div className="flex items-center justify-between rounded-xl border border-gold bg-raised px-3 py-2">
                <span className="text-[14px] text-ink">{elegido.full_name || '(sin nombre)'}</span>
                <button onClick={() => setElegido(null)} className="text-[12px] text-gold underline underline-offset-2">
                  Quitar
                </button>
              </div>
            ) : (
              <>
                <input className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe un nombre…" />
                {opciones.length > 0 && (
                  <div className="mt-1.5 space-y-1 rounded-xl border border-line bg-raised p-1.5">
                    {opciones.map((o) => (
                      <button
                        key={o.user_id}
                        onClick={() => {
                          setElegido(o);
                          setOpciones([]);
                        }}
                        className="block w-full rounded-lg px-2 py-1.5 text-left text-[14px] text-ink hover:bg-[var(--bg-sunken)]"
                      >
                        {o.full_name || '(sin nombre)'}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </Field>
        )}

        {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
        <Btn disabled={busy || title.trim().length < 3 || !day} onClick={() => void crear()} className="w-full">
          {busy ? 'Creando…' : 'Crear reto'}
        </Btn>
      </Card>
    </div>
  );
}

/* ───────────────────────── Mis retos ───────────────────────── */

function MiRetoCard({ r, onOpen }: { r: MiReto; onOpen: () => void }) {
  const copy = KIND_COPY[r.kind];
  return (
    <button onClick={onOpen} className="block w-full text-left">
      <Card className={`space-y-2 p-4 ${r.mi_estado === 'invitado' ? 'border-gold' : ''}`}>
        <div className="flex flex-wrap items-center gap-2">
          {r.mi_estado === 'invitado' && <span className="rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-medium text-[#1a140a]">Te retaron</span>}
          {r.visibility === 'publico' && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">Público</span>}
          {r.anonimo && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">Anónimo</span>}
          {r.status === 'pendiente_admin' && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">Esperando aprobación</span>}
        </div>
        <div className="text-[16px] text-ink">{r.title}</div>
        <div className="text-[12px] text-ink-faint">
          {r.target_days} {copy.unitPlural} · {plural(r.aceptaron, 'participante', 'participantes')}
        </div>
      </Card>
    </button>
  );
}

function MisRetos({ onOpen }: { onOpen: (id: string) => void }) {
  const [list, setList] = useState<MiReto[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    listMisRetos()
      .then(setList)
      .catch(() => setError('No se pudo cargar. Intenta de nuevo.'));
  }, []);

  if (error) return <p className="text-[14px] text-ink-faint">{error}</p>;
  if (!list) return <p className="text-[13px] text-ink-faint">Cargando…</p>;

  const invitaciones = list.filter((r) => r.mi_estado === 'invitado');
  const activos = list.filter((r) => r.mi_estado === 'activo');

  if (list.length === 0) {
    return <Card className="p-5 text-[14px] leading-relaxed text-ink-soft">Todavía no tienes retos. Crea uno o entra a «Retos públicos».</Card>;
  }

  return (
    <div className="space-y-5">
      {invitaciones.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Te retaron</h2>
          {invitaciones.map((r) => (
            <MiRetoCard key={r.id} r={r} onOpen={() => onOpen(r.id)} />
          ))}
        </section>
      )}
      <section className="space-y-2">
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Activos</h2>
        {activos.length === 0 && <p className="text-[13px] text-ink-faint">Ninguno todavía.</p>}
        {activos.map((r) => (
          <MiRetoCard key={r.id} r={r} onOpen={() => onOpen(r.id)} />
        ))}
      </section>
    </div>
  );
}

/* ───────────────────────── Retos públicos ───────────────────────── */

function RetosPublicos({ onJoined }: { onJoined: (id: string) => void }) {
  const { day } = useZury();
  const [list, setList] = useState<RetoPublico[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = () => listRetosPublicos().then(setList).catch(() => setError('No se pudo cargar.'));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function unirme(r: RetoPublico) {
    if (!day) return;
    setBusy(r.id);
    try {
      await unirsePorLink(r.invite_code, day.dayId);
      onJoined(r.id);
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo unir.');
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-[14px] text-ink-faint">{error}</p>;
  if (!list) return <p className="text-[13px] text-ink-faint">Cargando…</p>;
  if (list.length === 0) return <Card className="p-5 text-[14px] leading-relaxed text-ink-soft">Todavía no hay retos públicos. ¡Crea el primero!</Card>;

  return (
    <div className="space-y-3">
      {list.map((r) => {
        const copy = KIND_COPY[r.kind];
        return (
          <Card key={r.id} className="space-y-2 p-4">
            <div className="text-[16px] text-ink">{r.title}</div>
            {r.description && <p className="text-[13px] leading-relaxed text-ink-soft">{r.description}</p>}
            <p className="text-[12px] text-ink-faint">
              {r.target_days} {copy.unitPlural} · {plural(r.aceptaron, 'persona suscrita', 'personas suscritas')} · anónimo
            </p>
            {r.ya_participo ? (
              <span className="text-[13px] text-gold">✓ Ya participas</span>
            ) : (
              <Btn disabled={busy === r.id} onClick={() => void unirme(r)}>
                {busy === r.id ? 'Uniendo…' : 'Suscribirme'}
              </Btn>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Detalle de un reto ───────────────────────── */

export function RetoDetalle({ id, onBack }: { id: string; onBack: () => void }) {
  const { day } = useZury();
  const [reto, setReto] = useState<MiReto | null | undefined>(undefined);
  const [participantes, setParticipantes] = useState<ParticipanteReto[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [reportando, setReportando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const load = async () => {
    if (!day) return;
    try {
      const [mios, parts] = await Promise.all([listMisRetos(), listParticipantesReto(id, day.dayId).catch(() => null)]);
      setReto(mios.find((r) => r.id === id) ?? null);
      setParticipantes(parts);
    } catch {
      setError('No se pudo cargar el reto.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, day?.dayId]);

  if (error) return <p className="text-[14px] text-ink-faint">{error}</p>;
  if (reto === undefined) return <p className="text-[13px] text-ink-faint">Cargando…</p>;
  if (reto === null) return <p className="text-[14px] text-ink-faint">Ese reto ya no está disponible.</p>;

  const copy = KIND_COPY[reto.kind];
  const yo = participantes?.find((p) => p.soy_yo);

  async function responder(aceptar: boolean) {
    if (!day) return;
    setBusy(true);
    try {
      await responderInvitacion(id, aceptar, day.dayId);
      await load();
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo responder.');
    } finally {
      setBusy(false);
    }
  }

  async function marcar(status: 'limpio' | 'caida') {
    if (!day) return;
    setBusy(true);
    try {
      await marcarDiaReto(id, day.dayId, status);
      await load();
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo marcar.');
    } finally {
      setBusy(false);
    }
  }

  async function enviarReporte(reportedUser: string) {
    if (motivo.trim().length < 1) return;
    setBusy(true);
    try {
      await reportarReto(id, reportedUser, motivo.trim());
      setMotivo('');
      setReportando(null);
      setMsg('Denuncia enviada. Un admin la va a revisar.');
    } catch (e) {
      setError(e instanceof RetoError ? e.message : 'No se pudo enviar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Btn variant="quiet" onClick={onBack}>
        ‹ Mis retos
      </Btn>

      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {reto.visibility === 'publico' && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">Público</span>}
          {reto.anonimo && <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">Anónimo</span>}
        </div>
        <h1 className="text-2xl text-ink">{reto.title}</h1>
        {reto.description && <p className="text-[14px] leading-relaxed text-ink-soft">{reto.description}</p>}
        <p className="text-[13px] text-ink-faint">
          {reto.target_days} {copy.unitPlural}
        </p>
        {reto.visibility === 'privado' && (
          <ShareBtn url={retoLink(reto.invite_code)} text={`Te reto: ${reto.title}`} />
        )}
      </Card>

      {reto.mi_estado === 'invitado' ? (
        <Card className="space-y-3 p-5">
          <p className="text-[15px] text-ink">Te retaron a esto. ¿Aceptas?</p>
          <div className="grid grid-cols-2 gap-2">
            <Btn disabled={busy} onClick={() => void responder(true)}>
              Aceptar
            </Btn>
            <Btn variant="ghost" disabled={busy} onClick={() => void responder(false)}>
              Rechazar
            </Btn>
          </div>
        </Card>
      ) : (
        <>
          {yo && (
            <Card className="space-y-3 p-5">
              {yo.estado_hoy === null ? (
                <>
                  <div className="text-[15px] font-medium text-ink">Hoy, ¿cumpliste?</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Btn disabled={busy} onClick={() => void marcar('limpio')}>
                      {copy.done}
                    </Btn>
                    <Btn variant="ghost" disabled={busy} onClick={() => void marcar('caida')}>
                      {copy.miss}
                    </Btn>
                  </div>
                </>
              ) : yo.estado_hoy === 'limpio' ? (
                <p className="text-[14px] text-[var(--success)]">{copy.doneToday}</p>
              ) : (
                <p className="text-[14px] text-ink-soft">{copy.missToday}</p>
              )}
              <p className="text-[12px] text-ink-faint">
                {yo.dias_limpios} de {reto.target_days} {copy.unitPlural}
              </p>
            </Card>
          )}

          {reto.visibility === 'privado' && participantes && (
            <Card className="divide-y divide-line p-0">
              {participantes.map((p) => (
                <div key={p.user_id} className="space-y-1.5 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[14px] text-ink">{p.etiqueta}</span>
                    {!p.soy_yo && !p.esperando && (
                      <button
                        onClick={() => setReportando(reportando === p.user_id ? null : p.user_id)}
                        className="text-[11px] text-ink-faint underline underline-offset-2"
                      >
                        Denunciar
                      </button>
                    )}
                  </div>
                  {!p.esperando && !p.soy_yo && (
                    <div className="text-[12px] text-ink-faint">
                      {p.dias_limpios} {copy.unitPlural} · {p.estado_hoy === 'limpio' ? 'hoy cumplió' : p.estado_hoy === 'caida' ? 'hoy no' : 'hoy: sin marcar'}
                    </div>
                  )}
                  {p.esperando && <div className="text-[12px] text-ink-faint">Esperando respuesta…</div>}
                  {reportando === p.user_id && (
                    <div className="space-y-2 rounded-lg border border-line bg-[var(--bg-sunken)] p-3">
                      <input className={inputCls} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="¿Qué pasó?" />
                      <Btn disabled={busy || motivo.trim().length < 1} onClick={() => void enviarReporte(p.user_id)}>
                        Enviar denuncia
                      </Btn>
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {msg && <p className="text-[13px] text-[var(--success)]">{msg}</p>}
          {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}

          {yo && (
            <Btn
              variant="quiet"
              onClick={() => {
                if (confirm('¿Dejar este reto?')) void abandonarReto(id).then(onBack);
              }}
            >
              Dejar este reto
            </Btn>
          )}
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Cadenas de Tehilim ───────────────────────── */

function OrganizarCadena({ onCreated, onCancel }: { onCreated: (id: string) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function crear() {
    setBusy(true);
    setError('');
    try {
      const r = await organizarCadena(title.trim(), description.trim());
      onCreated(r.id);
    } catch (e) {
      setError(e instanceof TehilimError ? e.message : 'No se pudo organizar la cadena.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-lg text-ink">Organizar una cadena de Tehilim</h2>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
          Se abre un lugar para que hasta 150 personas se apunten a un capítulo, hasta terminar el Tehilim completo. Te da un enlace
          para invitar gente.
        </p>
      </div>
      <Field label="¿Para qué es esta cadena?" hint='Por ejemplo: "Por la refuá de Moshé ben Rivká"'>
        <input className={inputCls} value={title} maxLength={140} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      <Field label="Más detalle (opcional)">
        <textarea className={inputCls + ' min-h-[4rem]'} value={description} maxLength={500} onChange={(e) => setDescription(e.target.value)} />
      </Field>
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Btn disabled={busy || title.trim().length < 3} onClick={() => void crear()}>
          {busy ? 'Organizando…' : 'Organizar cadena'}
        </Btn>
        <Btn variant="quiet" onClick={onCancel}>
          Cancelar
        </Btn>
      </div>
    </Card>
  );
}

function CadenasTehilim({ onOpen }: { onOpen: (id: string) => void }) {
  const [list, setList] = useState<Cadena[] | null>(null);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');

  const load = () => listCadenas().then(setList).catch(() => setError('No se pudo cargar.'));
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (creando) return <OrganizarCadena onCreated={onOpen} onCancel={() => setCreando(false)} />;

  return (
    <div className="space-y-4">
      <button
        onClick={() => setCreando(true)}
        className="block w-full rounded-2xl border-2 border-gold bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-5 py-4 text-start transition-[filter] hover:brightness-110"
      >
        <span className="flex items-center gap-3">
          <span className="text-2xl leading-none">📖</span>
          <span className="min-w-0">
            <span className="block text-[17px] font-medium text-ink">Organizar cadena</span>
            <span className="block text-[13px] leading-snug text-ink-soft">
              Junta a hasta 150 personas para completar el Tehilim entero por un motivo.
            </span>
          </span>
        </span>
      </button>

      {error && <p className="text-[14px] text-ink-faint">{error}</p>}
      {!list ? (
        <p className="text-[13px] text-ink-faint">Cargando…</p>
      ) : list.length === 0 ? (
        <Card className="p-5 text-[14px] leading-relaxed text-ink-soft">Todavía no hay ninguna cadena. ¡Organiza la primera!</Card>
      ) : (
        <div className="space-y-3">
          {list.map((c) => (
            <button key={c.id} onClick={() => onOpen(c.id)} className="block w-full text-left">
              <Card className={`space-y-2 p-4 ${c.status === 'completa' ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-center gap-2">
                  {c.status === 'completa' ? (
                    <span className="rounded-md bg-gold px-1.5 py-0.5 text-[10px] font-medium text-[#1a140a]">Círculo completo ✓</span>
                  ) : (
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-[10px] text-ink-faint">{c.tomados} de 150</span>
                  )}
                  {c.mios > 0 && <span className="rounded-md border border-gold px-1.5 py-0.5 text-[10px] text-gold">Tomaste {c.mios}</span>}
                </div>
                <div className="text-[16px] text-ink">{c.title}</div>
                <div className="text-[12px] text-ink-faint">Organiza {c.organizador}</div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CadenaDetalle({ id, onBack }: { id: string; onBack: () => void }) {
  const [cadena, setCadena] = useState<Cadena | null | undefined>(undefined);
  const [capitulos, setCapitulos] = useState<Capitulo[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [eligiendo, setEligiendo] = useState<number | null>(null);
  const [anonimo, setAnonimo] = useState(false);

  const load = async () => {
    try {
      const [all, caps] = await Promise.all([listCadenas(), listCapitulos(id)]);
      setCadena(all.find((c) => c.id === id) ?? null);
      setCapitulos(caps);
    } catch {
      setError('No se pudo cargar la cadena.');
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (error) return <p className="text-[14px] text-ink-faint">{error}</p>;
  if (cadena === undefined) return <p className="text-[13px] text-ink-faint">Cargando…</p>;
  if (cadena === null) return <p className="text-[14px] text-ink-faint">Esa cadena ya no está disponible.</p>;

  async function tomar(perek: number) {
    setBusy(true);
    setError('');
    try {
      await tomarCapitulo(id, perek, anonimo);
      setEligiendo(null);
      setAnonimo(false);
      await load();
    } catch (e) {
      setError(e instanceof TehilimError ? e.message : 'No se pudo tomar ese capítulo.');
    } finally {
      setBusy(false);
    }
  }

  async function soltar(perek: number) {
    setBusy(true);
    try {
      await soltarCapitulo(id, perek);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleDicho(perek: number, actual: boolean) {
    setBusy(true);
    try {
      await marcarDicho(id, perek, !actual);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Btn variant="quiet" onClick={onBack}>
        ‹ Cadenas de Tehilim
      </Btn>

      <Card className="space-y-3 p-5">
        {cadena.status === 'completa' && (
          <p className="rounded-lg bg-gold px-3 py-2 text-center text-[14px] font-medium text-[#1a140a]">
            🎉 Círculo completo: se terminó el Tehilim entero por esto
          </p>
        )}
        <div className="text-[11px] uppercase tracking-[0.16em] text-gold">Cadena de Tehilim · organiza {cadena.organizador}</div>
        <h1 className="text-2xl text-ink">{cadena.title}</h1>
        {cadena.description && <p className="text-[14px] leading-relaxed text-ink-soft">{cadena.description}</p>}
        <p className="text-[13px] text-ink-faint">{cadena.tomados} de 150 capítulos tomados</p>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(cadena.tomados / 150) * 100}%` }} />
        </div>
        {cadena.status === 'activa' && (
          <ShareBtn url={tehilimLink(cadena.invite_code)} text={`Súmate a la cadena de Tehilim: ${cadena.title}`} label="Invitar gente" />
        )}
      </Card>

      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}

      <Card className="p-4">
        <div className="grid grid-cols-[repeat(10,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(15,minmax(0,1fr))]">
          {(capitulos ?? []).map((c) => {
            const libre = c.etiqueta === null;
            return (
              <button
                key={c.perek}
                disabled={busy || (!libre && !c.soy_yo) || (libre && cadena.status !== 'activa')}
                onClick={() => (libre ? setEligiendo(c.perek) : c.soy_yo ? void toggleDicho(c.perek, c.dicho) : undefined)}
                title={libre ? 'Libre' : c.etiqueta ?? ''}
                className={`aspect-square rounded-md text-[11px] font-medium transition-colors ${
                  libre
                    ? 'border border-dashed border-line text-ink-faint hover:border-gold'
                    : c.soy_yo
                      ? c.dicho
                        ? 'bg-[var(--success)] text-white'
                        : 'border-2 border-gold bg-[color-mix(in_srgb,var(--gold)_18%,transparent)] text-ink'
                      : 'bg-[var(--bg-sunken)] text-ink-faint'
                }`}
              >
                {c.perek}
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-ink-faint">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border border-dashed border-line" /> Libre
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm border-2 border-gold bg-[color-mix(in_srgb,var(--gold)_18%,transparent)]" /> Tuyo
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-[var(--success)]" /> Tuyo, ya dicho
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded-sm bg-[var(--bg-sunken)]" /> Tomado por alguien más
          </span>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">Toca un capítulo tuyo para marcarlo como dicho.</p>
      </Card>

      {eligiendo !== null && (
        <Card className="space-y-3 p-4">
          <p className="text-[15px] text-ink">Vas a tomar el capítulo {eligiendo}</p>
          <label className="flex items-center gap-2 text-[14px] text-ink-soft">
            <input type="checkbox" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} />
            Anónimo (no se ve tu nombre)
          </label>
          <div className="flex flex-wrap gap-2">
            <Btn disabled={busy} onClick={() => void tomar(eligiendo)}>
              Confirmar
            </Btn>
            <Btn variant="quiet" onClick={() => setEligiendo(null)}>
              Cancelar
            </Btn>
          </div>
        </Card>
      )}

      {capitulos?.some((c) => c.soy_yo) && (
        <details className="text-[13px] text-ink-faint">
          <summary className="cursor-pointer">Soltar un capítulo que tomé</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {capitulos
              .filter((c) => c.soy_yo)
              .map((c) => (
                <Btn key={c.perek} variant="ghost" disabled={busy} onClick={() => void soltar(c.perek)}>
                  Soltar el {c.perek}
                </Btn>
              ))}
          </div>
        </details>
      )}
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */

/**
 * Retos entre usuarios: como una kabalá, pero de dos o más personas. Privados (por invitación,
 * con o sin nombre según el género) o públicos (anónimos, con revisión de admin).
 */
export default function Retos() {
  const [params, setParams] = useSearchParams();
  const t = params.get('t');
  const tab = t === 'publicos' ? 'publicos' : t === 'crear' ? 'crear' : t === 'tehilim' ? 'tehilim' : 'mios';
  const ver = params.get('ver');
  const vt = params.get('vt'); // cadena de Tehilim en detalle

  if (!backendConfigured) {
    return (
      <Card className="p-5 text-[15px] text-ink-soft">
        Los retos necesitan el servidor. Configura VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.
      </Card>
    );
  }

  if (vt) {
    return <CadenaDetalle id={vt} onBack={() => setParams({ t: 'tehilim' })} />;
  }

  if (ver) {
    return <RetoDetalle id={ver} onBack={() => setParams({ t: tab })} />;
  }

  return (
    <div className="space-y-4">
      <SectionTitle es="Retos" he="אתגרים" />
      <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-raised p-1 text-[13px] sm:grid-cols-4">
        {(
          [
            ['mios', 'Mis retos'],
            ['publicos', 'Públicos'],
            ['tehilim', 'Cadenas de Tehilim'],
            ['crear', 'Crear'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setParams({ t: id })}
            className={`rounded-lg py-2 transition-colors ${tab === id ? 'bg-gold font-medium text-[#1a140a]' : 'text-ink-soft'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'mios' && <MisRetos onOpen={(id) => setParams({ ver: id })} />}
      {tab === 'publicos' && <RetosPublicos onJoined={(id) => setParams({ ver: id })} />}
      {tab === 'tehilim' && <CadenasTehilim onOpen={(id) => setParams({ t: 'tehilim', vt: id })} />}
      {tab === 'crear' && <CrearReto onCreated={(id) => setParams({ ver: id })} />}
    </div>
  );
}
