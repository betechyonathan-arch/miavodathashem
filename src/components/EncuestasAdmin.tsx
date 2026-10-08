/*
  Panel de admin → pestaña Encuestas: crear, editar, abrir/cerrar, borrar, avisar con notificación
  y ver resultados. Cada encuesta puede tener varias preguntas de distintos tipos, ser para todos,
  solo hombres, solo mujeres o una sola persona, y ser anónima (ni el admin ve quién respondió qué).
*/
import { useEffect, useMemo, useState } from 'react';
import type { AdminUser } from '../lib/admin';
import {
  AUDIENCIAS,
  EncuestaError,
  TIPOS,
  aInput,
  deleteEncuesta,
  guardarEncuesta,
  listRespuestas,
  respondida,
  type Audiencia,
  type EncuestaInput,
  type Pregunta,
  type PublicEncuesta,
  type Respuesta,
  type TipoPregunta,
  type Valor,
} from '../lib/encuestas';
import { sendPushEncuesta } from '../lib/pushAdmin';
import { Btn, Card, Field, inputCls } from './ui';

const nuevaPregunta = (tipo: TipoPregunta = 'escala'): Pregunta => ({
  id: 'p' + Math.random().toString(36).slice(2, 9),
  tipo,
  texto: '',
  obligatoria: true,
  ...(tipo === 'escala' ? { min: 1, max: 10 } : {}),
  ...(tipo === 'opcion' || tipo === 'multiple' ? { opciones: ['', ''] } : {}),
});

const vacia = (): EncuestaInput => ({
  title: '',
  description: '',
  audiencia: 'todos',
  target_user: null,
  anonima: false,
  preguntas: [nuevaPregunta()],
  active: true,
});

const audienciaLabel = (a: Audiencia | null) => AUDIENCIAS.find((x) => x.value === (a ?? 'todos'))?.label ?? 'Todos';

function Badge({ children, tone }: { children: React.ReactNode; tone: 'gold' | 'green' | 'muted' }) {
  const cls = {
    gold: 'border-gold/60 text-gold',
    green: 'border-[var(--success)] text-[var(--success)]',
    muted: 'border-line text-ink-faint',
  }[tone];
  return <span className={`rounded-full border px-2.5 py-0.5 text-[12px] ${cls}`}>{children}</span>;
}

/** Texto legible de una respuesta. */
function mostrar(p: Pregunta, v: Valor | undefined): string {
  if (!respondida(v)) return '—';
  if (Array.isArray(v)) return v.join(', ');
  if (p.tipo === 'sino') return v === 'si' ? 'Sí' : 'No';
  return String(v);
}

function Barra({ label, n, total }: { label: string; n: number; total: number }) {
  const pct = total ? Math.round((n / total) * 100) : 0;
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between gap-3 text-[13px]">
        <span className="min-w-0 text-ink-soft">{label}</span>
        <span className="shrink-0 tabular-nums text-ink">
          {n} <span className="text-ink-faint">· {pct}%</span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Resumen de una pregunta con todas las respuestas juntas. */
function ResumenPregunta({ p, rows, anonima }: { p: Pregunta; rows: Respuesta[]; anonima: boolean }) {
  const con = rows.filter((r) => respondida(r.valores[p.id]));
  const total = con.length;

  let cuerpo: React.ReactNode;
  if (total === 0) {
    cuerpo = <p className="text-[13px] text-ink-faint">Sin respuestas todavía.</p>;
  } else if (p.tipo === 'escala') {
    const nums = con.map((r) => r.valores[p.id] as number);
    const prom = Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10;
    const min = p.min ?? 1;
    const max = p.max ?? 10;
    cuerpo = (
      <div className="space-y-1.5">
        <p className="text-[14px] text-ink">
          Promedio <strong className="text-gold">{prom}</strong>
        </p>
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((n) => (
          <Barra key={n} label={String(n)} n={nums.filter((x) => x === n).length} total={total} />
        ))}
      </div>
    );
  } else if (p.tipo === 'texto') {
    cuerpo = (
      <ul className="space-y-1.5">
        {con.map((r, i) => (
          <li key={i} className="rounded-lg bg-raised px-3 py-2 text-[13px] leading-relaxed text-ink">
            <span className="whitespace-pre-line">{String(r.valores[p.id])}</span>
            {!anonima && <span className="mt-0.5 block text-[11px] text-ink-faint">{r.full_name || r.email}</span>}
          </li>
        ))}
      </ul>
    );
  } else {
    const opciones = p.tipo === 'sino' ? ['si', 'no'] : p.opciones ?? [];
    const cuenta = (o: string) =>
      con.filter((r) => {
        const v = r.valores[p.id];
        return Array.isArray(v) ? v.includes(o) : v === o;
      }).length;
    cuerpo = (
      <div className="space-y-1.5">
        {opciones.map((o) => (
          <Barra key={o} label={p.tipo === 'sino' ? (o === 'si' ? 'Sí' : 'No') : o} n={cuenta(o)} total={total} />
        ))}
        {p.tipo === 'multiple' && <p className="text-[11px] text-ink-faint">Cada persona podía elegir varias: los % no suman 100.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[15px] text-ink">{p.texto || 'Respuesta'}</p>
        <span className="text-[12px] text-ink-faint">
          {total} {total === 1 ? 'respuesta' : 'respuestas'}
        </span>
      </div>
      {cuerpo}
    </div>
  );
}

/** Solo admin: resultados de una encuesta (y, si no es anónima, quién respondió qué). */
function Resultados({ e }: { e: PublicEncuesta }) {
  const [rows, setRows] = useState<Respuesta[] | null>(null);
  const [error, setError] = useState('');
  const [porPersona, setPorPersona] = useState(false);

  useEffect(() => {
    let alive = true;
    listRespuestas(e.id)
      .then((r) => alive && setRows(r))
      .catch((err) => alive && setError(err instanceof EncuestaError ? err.message : 'No se pudo cargar.'));
    return () => {
      alive = false;
    };
  }, [e.id]);

  if (error) return <p className="border-t border-line pt-3 text-[13px] text-[var(--danger)]">{error}</p>;
  if (!rows) return <p className="border-t border-line pt-3 text-[13px] text-ink-faint">Cargando resultados…</p>;
  if (rows.length === 0) return <p className="border-t border-line pt-3 text-[13px] text-ink-faint">Nadie ha respondido todavía.</p>;

  return (
    <div className="space-y-5 border-t border-line pt-4">
      {e.anonima && (
        <p className="text-[12px] text-ink-faint">Anónima: ves los resultados juntos, sin saber quién respondió qué.</p>
      )}
      {e.preguntas.map((p) => (
        <ResumenPregunta key={p.id} p={p} rows={rows} anonima={e.anonima} />
      ))}

      {!e.anonima && (
        <div className="space-y-2 border-t border-line pt-3">
          <button className="text-[13px] text-gold underline underline-offset-2" onClick={() => setPorPersona(!porPersona)}>
            {porPersona ? 'Ocultar respuestas por persona' : `Ver respuestas por persona (${rows.length})`}
          </button>
          {porPersona &&
            rows.map((r) => (
              <div key={r.user_id ?? r.email ?? r.full_name} className="space-y-1 rounded-lg bg-raised px-3 py-2">
                <p className="text-[13px] font-medium text-ink">{r.full_name || r.email}</p>
                {e.preguntas.map((p) => (
                  <p key={p.id} className="text-[13px] leading-relaxed text-ink-soft">
                    {e.preguntas.length > 1 && <span className="text-ink-faint">{p.texto}: </span>}
                    <span className="whitespace-pre-line text-ink">{mostrar(p, r.valores[p.id])}</span>
                  </p>
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

/** Una pregunta dentro del editor. */
function EditorPregunta({
  p,
  i,
  total,
  onChange,
  onMove,
  onRemove,
}: {
  p: Pregunta;
  i: number;
  total: number;
  onChange: (p: Pregunta) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  function cambiarTipo(tipo: TipoPregunta) {
    const base = nuevaPregunta(tipo);
    onChange({
      ...base,
      id: p.id,
      texto: p.texto,
      obligatoria: p.obligatoria,
      ...(tipo === 'opcion' || tipo === 'multiple' ? { opciones: p.opciones?.length ? p.opciones : base.opciones } : {}),
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-ink-faint">Pregunta {i + 1}</span>
        <div className="flex gap-1">
          <Btn variant="quiet" disabled={i === 0} onClick={() => onMove(-1)}>
            ↑
          </Btn>
          <Btn variant="quiet" disabled={i === total - 1} onClick={() => onMove(1)}>
            ↓
          </Btn>
          <Btn variant="quiet" disabled={total === 1} onClick={onRemove}>
            Quitar
          </Btn>
        </div>
      </div>
      <Field label={total === 1 ? 'Texto de la pregunta (opcional si el título ya es la pregunta)' : 'Texto de la pregunta'}>
        <input className={inputCls} value={p.texto} maxLength={500} onChange={(ev) => onChange({ ...p, texto: ev.target.value })} placeholder="Por ejemplo: ¿Cuántas veces rezaste Shajarit esta semana?" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Tipo">
          <select className={inputCls} value={p.tipo} onChange={(ev) => cambiarTipo(ev.target.value as TipoPregunta)}>
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        {p.tipo === 'escala' && (
          <>
            <Field label="Del número">
              <input type="number" className={inputCls} value={p.min ?? 1} onChange={(ev) => onChange({ ...p, min: Number(ev.target.value) })} />
            </Field>
            <Field label="Al número">
              <input type="number" className={inputCls} value={p.max ?? 10} onChange={(ev) => onChange({ ...p, max: Number(ev.target.value) })} />
            </Field>
          </>
        )}
      </div>
      {(p.tipo === 'opcion' || p.tipo === 'multiple') && (
        <Field label="Opciones" hint="Una por renglón. Mínimo 2, máximo 20.">
          <textarea
            className={inputCls + ' min-h-[6rem]'}
            value={(p.opciones ?? []).join('\n')}
            onChange={(ev) => onChange({ ...p, opciones: ev.target.value.split('\n') })}
            placeholder={'Siempre\nA veces\nNunca'}
          />
        </Field>
      )}
      <label className="flex items-center gap-2 text-[14px] text-ink-soft">
        <input type="checkbox" checked={p.obligatoria} onChange={(ev) => onChange({ ...p, obligatoria: ev.target.checked })} />
        Obligatoria
      </label>
    </div>
  );
}

/** Elegir a la persona que recibe una encuesta personal. */
function ElegirPersona({ users, value, onChange }: { users: AdminUser[]; value: string | null; onChange: (id: string | null) => void }) {
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

export default function EncuestasAdmin({
  encuestas,
  users,
  busy,
  run,
}: {
  encuestas: PublicEncuesta[];
  users: AdminUser[];
  busy: boolean;
  run: (action: () => Promise<void>, ok: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState<EncuestaInput>(vacia);
  const [notificar, setNotificar] = useState(true);
  const [verResultados, setVerResultados] = useState<string | null>(null);
  const editando = !!draft.id;
  const yaTieneRespuestas = editando && (encuestas.find((e) => e.id === draft.id)?.respuestas ?? 0) > 0;
  const nombre = (id: string | null) => {
    const u = users.find((x) => x.id === id);
    return u ? u.full_name || u.email : 'una persona';
  };

  const setPregunta = (i: number, p: Pregunta) => setDraft((d) => ({ ...d, preguntas: d.preguntas.map((x, j) => (j === i ? p : x)) }));
  const moverPregunta = (i: number, dir: -1 | 1) =>
    setDraft((d) => {
      const ps = [...d.preguntas];
      [ps[i], ps[i + dir]] = [ps[i + dir], ps[i]];
      return { ...d, preguntas: ps };
    });

  const listo =
    draft.title.trim().length >= 3 &&
    draft.preguntas.length > 0 &&
    (draft.audiencia !== 'persona' || !!draft.target_user) &&
    draft.preguntas.every(
      (p) =>
        (draft.preguntas.length === 1 || p.texto.trim().length >= 2) &&
        (p.tipo !== 'opcion' && p.tipo !== 'multiple' ? true : (p.opciones ?? []).filter((o) => o.trim()).length >= 2),
    );

  function publicar() {
    const d = draft;
    const avisar = notificar;
    void run(async () => {
      const id = await guardarEncuesta({ ...d, active: true });
      setDraft(vacia());
      setNotificar(true);
      if (avisar) {
        try {
          await sendPushEncuesta(id);
        } catch (err) {
          throw new Error(`La encuesta se guardó, pero la notificación no se pudo mandar: ${err instanceof Error ? err.message : 'error desconocido'}.`);
        }
      }
    }, (editando ? 'Encuesta actualizada' : 'Encuesta publicada') + (avisar ? ' y notificación enviada.' : '.'));
  }

  return (
    <div className="space-y-6">
      <Card className="space-y-5 p-5">
        <div>
          <h2 className="text-xl text-ink">{editando ? 'Editar encuesta' : 'Nueva encuesta'}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-faint">
            Sale al entrar a la app y en «Hoy», solo para quien elijas. Puede tener todas las preguntas que quieras.
          </p>
        </div>

        <Field label="Título">
          <input className={inputCls + ' !py-3'} value={draft.title} maxLength={200} onChange={(ev) => setDraft({ ...draft, title: ev.target.value })} placeholder="Por ejemplo: ¿Cómo va tu tefilá?" />
        </Field>
        <Field label="Explicación (opcional)">
          <textarea className={inputCls + ' min-h-[5rem]'} value={draft.description} maxLength={2000} onChange={(ev) => setDraft({ ...draft, description: ev.target.value })} />
        </Field>

        <div className="space-y-3 rounded-xl border border-line p-4">
          <Field label="¿Para quién es?">
            <select
              className={inputCls}
              value={draft.audiencia}
              onChange={(ev) => {
                const a = ev.target.value as Audiencia;
                setDraft({ ...draft, audiencia: a, anonima: a === 'persona' ? false : draft.anonima });
              }}
            >
              {AUDIENCIAS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          {draft.audiencia === 'persona' && (
            <>
              <ElegirPersona users={users} value={draft.target_user} onChange={(id) => setDraft({ ...draft, target_user: id })} />
              <p className="text-[12px] leading-relaxed text-ink-faint">
                Esa persona la ve igual que cualquier otra encuesta: no sabe que es solo para ella. Nadie más la ve.
              </p>
            </>
          )}
          {(draft.audiencia === 'hombres' || draft.audiencia === 'mujeres') && (
            <p className="text-[12px] leading-relaxed text-ink-faint">
              Solo la ven las cuentas registradas como {draft.audiencia === 'hombres' ? 'hombre' : 'mujer'}.
            </p>
          )}
          <label className={`flex items-start gap-2 text-[14px] ${draft.audiencia === 'persona' ? 'text-ink-faint' : 'text-ink-soft'}`}>
            <input
              type="checkbox"
              className="mt-1"
              disabled={draft.audiencia === 'persona'}
              checked={draft.anonima}
              onChange={(ev) => setDraft({ ...draft, anonima: ev.target.checked })}
            />
            <span>
              Anónima: ni tú vas a ver quién respondió qué, solo los resultados juntos.
              {draft.audiencia === 'persona' && ' (Una encuesta personal no puede ser anónima.)'}
              {draft.anonima && yaTieneRespuestas && ' Ya tiene respuestas: no se puede volver con nombre.'}
            </span>
          </label>
        </div>

        <div className="space-y-3">
          <h3 className="text-[15px] font-medium text-ink">Preguntas ({draft.preguntas.length})</h3>
          {draft.preguntas.map((p, i) => (
            <EditorPregunta
              key={p.id}
              p={p}
              i={i}
              total={draft.preguntas.length}
              onChange={(np) => setPregunta(i, np)}
              onMove={(dir) => moverPregunta(i, dir)}
              onRemove={() => setDraft((d) => ({ ...d, preguntas: d.preguntas.filter((_, j) => j !== i) }))}
            />
          ))}
          <Btn variant="ghost" disabled={draft.preguntas.length >= 50} onClick={() => setDraft((d) => ({ ...d, preguntas: [...d.preguntas, nuevaPregunta('opcion')] }))}>
            + Agregar pregunta
          </Btn>
          {yaTieneRespuestas && (
            <p className="text-[12px] leading-relaxed text-ink-faint">
              Esta encuesta ya tiene respuestas. Si quitas una pregunta, sus respuestas dejan de salir en los resultados.
            </p>
          )}
        </div>

        <label className="flex items-start gap-2 text-[14px] text-ink-soft">
          <input type="checkbox" className="mt-1" checked={notificar} onChange={(ev) => setNotificar(ev.target.checked)} />
          <span>🔔 Mandar notificación de encuesta (solo le llega a quien le toca)</span>
        </label>

        <div className="flex flex-wrap gap-2">
          <Btn disabled={busy || !listo} onClick={publicar}>
            {editando ? 'Guardar cambios' : 'Publicar encuesta'}
          </Btn>
          {editando && (
            <Btn
              variant="quiet"
              onClick={() => {
                setDraft(vacia());
                setNotificar(true);
              }}
            >
              Cancelar
            </Btn>
          )}
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-xl text-ink">Encuestas ({encuestas.length})</h2>
        {encuestas.length === 0 && <Card className="p-5 text-[15px] text-ink-faint">Todavía no hay encuestas.</Card>}
        {encuestas.map((e) => (
          <Card key={e.id} className={`space-y-3 p-5 ${e.active ? 'border-gold' : 'opacity-70'}`}>
            <div className="flex flex-wrap items-center gap-2">
              {e.active ? <Badge tone="green">Abierta</Badge> : <Badge tone="muted">Cerrada</Badge>}
              <Badge tone="gold">{e.audiencia === 'persona' ? `Personal: ${nombre(e.target_user)}` : audienciaLabel(e.audiencia)}</Badge>
              {e.anonima && <Badge tone="muted">Anónima</Badge>}
              <Badge tone="muted">
                {e.preguntas.length} {e.preguntas.length === 1 ? 'pregunta' : 'preguntas'}
              </Badge>
              <span className="text-[13px] text-ink-faint">
                {e.respuestas ?? 0} {e.respuestas === 1 ? 'respuesta' : 'respuestas'}
                {e.promedio != null ? ` · promedio ${e.promedio}` : ''}
              </span>
            </div>
            <h3 className="text-[18px] text-ink">{e.title}</h3>
            {e.description && <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">{e.description}</p>}
            <div className="flex flex-wrap gap-2 border-t border-line pt-3">
              <Btn variant="ghost" disabled={busy} onClick={() => setVerResultados(verResultados === e.id ? null : e.id)}>
                {verResultados === e.id ? 'Ocultar resultados' : 'Ver resultados'}
              </Btn>
              <Btn
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setDraft(aInput(e));
                  setNotificar(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                Editar
              </Btn>
              <Btn
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await guardarEncuesta({ ...aInput(e), active: !e.active });
                  }, e.active ? 'Encuesta cerrada.' : 'Encuesta abierta otra vez.')
                }
              >
                {e.active ? 'Cerrar' : 'Abrir'}
              </Btn>
              {e.active && (
                <Btn variant="ghost" disabled={busy} onClick={() => void run(async () => void (await sendPushEncuesta(e.id)), 'Notificación de encuesta enviada.')}>
                  🔔 Avisar otra vez
                </Btn>
              )}
              <Btn
                variant="danger"
                disabled={busy}
                onClick={() => {
                  if (confirm('¿Borrar esta encuesta? También se borran todas las respuestas.')) void run(() => deleteEncuesta(e.id), 'Encuesta borrada.');
                }}
              >
                Borrar
              </Btn>
            </div>
            {verResultados === e.id && <Resultados key={(e.respuestas ?? 0) + e.id} e={e} />}
          </Card>
        ))}
      </section>
    </div>
  );
}
