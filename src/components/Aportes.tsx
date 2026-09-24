import { useCallback, useEffect, useState } from 'react';
import { getSession } from '../lib/auth/session';
import {
  AporteError,
  KIND_LABEL,
  deleteAporte,
  listMine,
  listPublic,
  submitAporte,
  type AporteKind,
  type AporteRow,
  type PublicAporte,
} from '../lib/aportes';
import { Btn, Card, Field, inputCls } from './ui';

const KINDS: AporteKind[] = ['dvar', 'pirush', 'musar'];

const dateEs = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });

/** Formulario para proponer un dvar Torá, un pirush o un musar. Lo revisa un admin antes de publicarse. */
export function AporteForm({ onSent, onCancel }: { onSent: () => void; onCancel?: () => void }) {
  const isAdmin = !!getSession()?.isAdmin;
  const [kind, setKind] = useState<AporteKind>('dvar');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [source, setSource] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await submitAporte({ kind, title: title.trim(), body: body.trim(), source: source.trim(), anonymous });
      setDone(isAdmin ? 'Listo: ya está publicado.' : 'Enviado. El admin lo revisará y, si lo aprueba, lo verán todos. Gracias.');
      setTitle('');
      setBody('');
      setSource('');
      onSent();
    } catch (err) {
      setError(err instanceof AporteError ? err.message : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <Card className="space-y-3 p-5">
        <p className="text-[15px] leading-relaxed text-ink">{done}</p>
        <div className="flex gap-2">
          <Btn variant="ghost" onClick={() => setDone('')}>
            Enviar otro
          </Btn>
          {onCancel && (
            <Btn variant="quiet" onClick={onCancel}>
              Cerrar
            </Btn>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-xl border px-2 py-2.5 text-[14px] transition-colors ${kind === k ? 'border-gold bg-gold font-medium text-[#1a140a]' : 'border-line bg-raised text-ink-soft hover:border-gold'}`}
            >
              {KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <Field label="Título (opcional)">
          <input className={inputCls} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Por ejemplo: La parashá de esta semana" />
        </Field>
        <Field label="Tu texto" hint={`${body.trim().length} / 6000 letras`}>
          <textarea
            className={inputCls + ' min-h-[9rem]'}
            value={body}
            maxLength={6000}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Escribe aquí tu dvar Torá, tu pirush o tu musar…"
            required
          />
        </Field>
        <Field label="Fuente (opcional)">
          <input className={inputCls} value={source} maxLength={160} onChange={(e) => setSource(e.target.value)} placeholder="Por ejemplo: Rashi, Bereshit 1:1" />
        </Field>
        <label className="flex items-start gap-3 text-[14px] leading-snug text-ink-soft">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          <span>
            Publicarlo como <strong className="text-ink">anónimo</strong>. Si no, saldrá con tu nombre. En cualquier caso, el admin sabe quién lo mandó para poder revisarlo.
          </span>
        </label>
        {!isAdmin && (
          <p className="text-[12px] leading-relaxed text-ink-faint">Antes de publicarse, un admin lo revisa. Solo si lo aprueba lo verán los demás.</p>
        )}
        {error && <p className="text-[14px] text-[var(--danger)]">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Btn type="submit" disabled={busy || body.trim().length < 10}>
            {busy ? 'Enviando…' : isAdmin ? 'Publicar' : 'Enviar a revisión'}
          </Btn>
          {onCancel && (
            <Btn variant="quiet" onClick={onCancel}>
              Cancelar
            </Btn>
          )}
        </div>
      </form>
    </Card>
  );
}

/** Botón grande y visible, arriba en la sección de Torá. */
export function PublishCta({ onSent }: { onSent: () => void }) {
  const [open, setOpen] = useState(false);
  if (open) return <AporteForm onSent={onSent} onCancel={() => setOpen(false)} />;
  return (
    <button
      onClick={() => setOpen(true)}
      className="block w-full rounded-2xl border-2 border-gold bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-5 py-4 text-start transition-[filter] hover:brightness-110"
    >
      <span className="flex items-center gap-3">
        <span className="text-2xl leading-none">✍️</span>
        <span className="min-w-0">
          <span className="block text-[17px] font-medium text-ink">Publicar un dvar Torá</span>
          <span className="block text-[13px] leading-snug text-ink-soft">
            Comparte un dvar Torá, un pirush o un musar con los demás (con tu nombre o anónimo).
          </span>
        </span>
      </span>
    </button>
  );
}

export function AporteCard({ a, footer }: { a: PublicAporte; footer?: React.ReactNode }) {
  return (
    <Card className="space-y-2 p-5">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        <span className="rounded-md border border-line px-2 py-0.5">{KIND_LABEL[a.kind]}</span>
        <span>{dateEs(a.created_at)}</span>
      </div>
      {a.title && <h3 className="text-[17px] text-ink">{a.title}</h3>}
      <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{a.body}</p>
      {a.source && <p className="text-[13px] text-ink-faint">Fuente: {a.source}</p>}
      <p className="text-[13px] text-gold">{a.author_name ? `— ${a.author_name}` : '— Anónimo'}</p>
      {footer}
    </Card>
  );
}

const STATUS_TEXT = { pendiente: 'Esperando revisión', aprobado: 'Publicado', rechazado: 'No se publicó' } as const;

/** Pestaña "Comunidad": lo aprobado por el admin, y lo que mandó esta persona con su estado. */
export function Comunidad({ refreshKey }: { refreshKey: number }) {
  const [pub, setPub] = useState<PublicAporte[] | null>(null);
  const [mine, setMine] = useState<AporteRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const me = getSession();
    setError('');
    try {
      const [p, m] = await Promise.all([listPublic(), me ? listMine(me.userId) : Promise.resolve([])]);
      setPub(p);
      setMine(m.filter((x) => x.status !== 'aprobado')); // lo aprobado ya sale en la lista de todos
    } catch {
      setError('Todavía no se pueden cargar. Intenta más tarde.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function remove(id: string) {
    if (!confirm('¿Borrar este aporte?')) return;
    try {
      await deleteAporte(id);
      await load();
    } catch {
      setError('No se pudo borrar.');
    }
  }

  if (error) return <p className="text-[14px] text-ink-faint">{error}</p>;
  if (!pub) return <p className="text-[13px] text-ink-faint">Cargando…</p>;

  return (
    <div className="space-y-5">
      {mine.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Lo que mandaste</h2>
          {mine.map((a) => (
            <AporteCard
              key={a.id}
              a={a}
              footer={
                <div className="flex items-center justify-between gap-2 border-t border-line pt-2">
                  <span className={`text-[13px] ${a.status === 'rechazado' ? 'text-[var(--danger)]' : 'text-ink-soft'}`}>
                    {STATUS_TEXT[a.status]}
                    {a.anonymous ? ' · anónimo' : ''}
                  </span>
                  <Btn variant="quiet" onClick={() => void remove(a.id)}>
                    Borrar
                  </Btn>
                </div>
              }
            />
          ))}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">Aportes de la comunidad</h2>
        {pub.length === 0 ? (
          <Card className="p-5 text-[14px] leading-relaxed text-ink-soft">
            Todavía no hay aportes publicados. Sé la primera persona: toca <strong className="text-ink">Publicar un dvar Torá</strong>, arriba.
          </Card>
        ) : (
          pub.map((a) => <AporteCard key={a.id} a={a} />)
        )}
      </section>
    </div>
  );
}
