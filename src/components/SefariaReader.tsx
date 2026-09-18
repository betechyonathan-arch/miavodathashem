import { useEffect, useMemo, useState } from 'react';
import {
  getLinks,
  getText,
  sefariaUrl,
  SefariaError,
  type SefariaLink,
  type SefariaText,
  type TextVersion,
} from '../lib/sefaria/api';
import { cleanHtml } from '../lib/sefaria/clean';
import { Btn, Card } from './ui';

/** Categorías de Sefaria en el orden en que se muestran, con su nombre en español. */
const CATEGORY_ORDER: [string, string][] = [
  ['Commentary', 'Pirushim (comentarios)'],
  ['Halakhah', 'Halajá'],
  ['Midrash', 'Midrash'],
  ['Talmud', 'Guemará'],
  ['Mishnah', 'Mishná'],
  ['Musar', 'Musar'],
  ['Chasidut', 'Jasidut'],
  ['Jewish Thought', 'Filosofía judía'],
  ['Kabbalah', 'Kabalá'],
  ['Responsa', 'Responsa'],
  ['Tanakh', 'Tanaj'],
  ['Quoting Commentary', 'Comentarios que lo citan'],
  ['Reference', 'Referencias'],
  ['Liturgy', 'Liturgia'],
];

function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    load().then(
      (data) => alive && setState({ data, loading: false }),
      (e) => alive && setState({ error: e instanceof SefariaError ? e.message : 'No se pudo cargar.', loading: false }),
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, retry: () => setTick((t) => t + 1) };
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Card className="space-y-2 p-4">
      <p className="text-[13px] text-[var(--danger)]">{message}</p>
      <Btn variant="ghost" onClick={onRetry}>
        Reintentar
      </Btn>
    </Card>
  );
}

function Attribution({ v }: { v: TextVersion }) {
  return (
    <p className="mt-2 text-[10px] leading-relaxed text-ink-faint">
      {v.title}
      {v.license ? ` · ${v.license}` : ''} · vía Sefaria
    </p>
  );
}

/** Un texto: hebreo (y traducción al inglés si se pide), segmento por segmento. */
function TextBody({ text, showEn }: { text: SefariaText; showEn: boolean }) {
  const en = showEn ? text.en : null;
  const n = Math.max(text.he?.segments.length ?? 0, en?.segments.length ?? 0);
  if (n === 0) {
    return <p className="text-[13px] text-ink-faint">Este texto no tiene contenido propio; abre una sección más específica.</p>;
  }
  const numbered = text.firstNumber != null && n > 1;
  return (
    <div className="space-y-4">
      {Array.from({ length: n }, (_, i) => {
        const he = text.he?.segments[i];
        const tr = en?.segments[i];
        return (
          <div key={i} className="flex gap-3">
            {numbered && (
              <span className="mt-1.5 w-6 shrink-0 text-end text-[11px] tabular-nums text-ink-faint">
                {(text.firstNumber as number) + i}
              </span>
            )}
            <div className="min-w-0 flex-1 space-y-1.5">
              {he && (
                <p
                  dir="rtl"
                  className="hebrew text-[19px] leading-[1.9] text-ink"
                  dangerouslySetInnerHTML={{ __html: cleanHtml(he) }}
                />
              )}
              {tr && (
                <p
                  className="text-[13.5px] leading-relaxed text-ink-soft"
                  dangerouslySetInnerHTML={{ __html: cleanHtml(tr) }}
                />
              )}
            </div>
          </div>
        );
      })}
      {text.he && <Attribution v={text.he} />}
      {en && <Attribution v={en} />}
    </div>
  );
}

/** Los pasajes de un comentarista sobre el texto abierto. Se cargan al desplegar. */
function AuthorPassages({ refs, showEn }: { refs: string[]; showEn: boolean }) {
  const { data, error, loading, retry } = useAsync(() => Promise.all(refs.slice(0, 8).map(getText)), [refs.join('|')]);
  if (loading) return <p className="py-2 text-[12px] text-ink-faint">Cargando…</p>;
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar.'} onRetry={retry} />;
  return (
    <div className="space-y-5 border-s-2 border-line ps-3">
      {data.map((t) => (
        <div key={t.ref}>
          <div className="mb-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-faint">{t.ref}</div>
          <TextBody text={{ ...t, firstNumber: null }} showEn={showEn} />
        </div>
      ))}
      {refs.length > 8 && (
        <p className="text-[11px] text-ink-faint">Mostrando 8 de {refs.length} pasajes. Ábrelos completos en Sefaria.</p>
      )}
    </div>
  );
}

function Sources({ ref_, showEn }: { ref_: string; showEn: boolean }) {
  const { data, error, loading, retry } = useAsync(() => getLinks(ref_), [ref_]);
  const [openCat, setOpenCat] = useState<string | null>('Commentary');
  const [openAuthor, setOpenAuthor] = useState<string | null>(null);

  const groups = useMemo(() => {
    const byCat = new Map<string, Map<string, { he: string; refs: SefariaLink[] }>>();
    for (const l of data ?? []) {
      const authors = byCat.get(l.category) ?? new Map();
      const a = authors.get(l.author) ?? { he: l.authorHe, refs: [] };
      a.refs.push(l);
      authors.set(l.author, a);
      byCat.set(l.category, authors);
    }
    return byCat;
  }, [data]);

  if (loading) return <p className="text-[12px] text-ink-faint">Buscando pirushim y fuentes…</p>;
  if (error) return <ErrorBox message={error} onRetry={retry} />;
  if (!data?.length) return <p className="text-[13px] text-ink-faint">Sefaria no tiene fuentes enlazadas a este pasaje.</p>;

  const total = data.length;
  const known = new Set(CATEGORY_ORDER.map(([c]) => c));
  const extra = [...groups.keys()].filter((c) => !known.has(c)).map((c) => [c, c] as [string, string]);

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-ink-faint">
        {total} fuentes enlazadas a este pasaje. Toca una categoría y luego un autor para leerlo aquí mismo.
      </p>
      {[...CATEGORY_ORDER, ...extra]
        .filter(([c]) => groups.has(c))
        .map(([cat, label]) => {
          const authors = groups.get(cat)!;
          const open = openCat === cat;
          return (
            <Card key={cat} className="overflow-hidden">
              <button
                onClick={() => setOpenCat(open ? null : cat)}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start"
                aria-expanded={open}
              >
                <span className="text-[14px] font-medium text-ink">{label}</span>
                <span className="text-[12px] text-ink-faint">
                  {authors.size} {authors.size === 1 ? 'autor' : 'autores'} {open ? '▴' : '▾'}
                </span>
              </button>
              {open && (
                <div className="space-y-1 border-t border-line px-3 py-2">
                  {[...authors.entries()]
                    .sort((a, b) => b[1].refs.length - a[1].refs.length)
                    .map(([author, info]) => {
                      const key = `${cat}|${author}`;
                      const aOpen = openAuthor === key;
                      return (
                        <div key={key}>
                          <button
                            onClick={() => setOpenAuthor(aOpen ? null : key)}
                            className="flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-2 text-start hover:bg-[var(--bg-sunken)]"
                            aria-expanded={aOpen}
                          >
                            <span className="text-[14px] text-ink">
                              {author}
                              {info.he && <span className="hebrew ms-2 text-[13px] text-gold">{info.he}</span>}
                            </span>
                            <span className="shrink-0 text-[11px] text-ink-faint">
                              {info.refs.length} {aOpen ? '▴' : '▾'}
                            </span>
                          </button>
                          {aOpen && (
                            <div className="px-2 pb-3 pt-1">
                              <AuthorPassages refs={info.refs.map((r) => r.ref)} showEn={showEn} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </Card>
          );
        })}
    </div>
  );
}

/**
 * Lector de un texto de Sefaria con navegación (anterior / siguiente) y todos sus
 * pirushim y fuentes enlazadas debajo.
 */
export default function SefariaReader({ ref_, onOpen }: { ref_: string; onOpen: (ref: string) => void }) {
  const { data, error, loading, retry } = useAsync(() => getText(ref_), [ref_]);
  const [showEn, setShowEn] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [ref_]);

  if (loading) return <p className="py-8 text-center text-[13px] text-ink-faint">Abriendo {ref_}…</p>;
  if (error || !data) return <ErrorBox message={error ?? 'No se pudo cargar.'} onRetry={retry} />;

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="hebrew text-2xl leading-tight text-gold">{data.heRef}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-[0.16em] text-ink-faint">{data.ref}</div>
          </div>
          <a
            href={sefariaUrl(data.ref)}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-[12px] text-gold"
          >
            Sefaria ↗
          </a>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="ghost" disabled={!data.prev} onClick={() => data.prev && onOpen(data.prev)}>
            ‹ Anterior
          </Btn>
          <Btn variant="ghost" disabled={!data.next} onClick={() => data.next && onOpen(data.next)}>
            Siguiente ›
          </Btn>
          {data.en && (
            <label className="ms-auto flex items-center gap-2 text-[12px] text-ink-soft">
              <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} />
              Traducción al inglés
            </label>
          )}
        </div>

        <TextBody text={data} showEn={showEn} />
        {!data.en && data.he && (
          <p className="text-[11px] text-ink-faint">Sefaria no tiene traducción al inglés de este texto.</p>
        )}
      </Card>

      <Sources ref_={data.ref} showEn={showEn} />
    </div>
  );
}
