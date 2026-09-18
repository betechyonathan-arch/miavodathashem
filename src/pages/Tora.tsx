import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useZury } from '../state/zury';
import {
  getCalendar,
  search,
  SefariaError,
  type CalendarItem,
  type SearchHit,
} from '../lib/sefaria/api';
import { Btn, Card, SectionTitle, inputCls } from '../components/ui';
import SefariaReader from '../components/SefariaReader';
import Musar from './Musar';

/** Lo que Sefaria llama "hoy", en el orden en que interesa y con nombre en español. */
const TODAY: { match: string; es: string }[] = [
  { match: 'Parashat Hashavua', es: 'Parashá de la semana' },
  { match: 'Daf Yomi', es: 'Daf Yomi' },
  { match: 'Daily Mishnah', es: 'Mishná diaria' },
  { match: 'Halakhah Yomit', es: 'Halajá diaria (Shulján Aruj)' },
  { match: 'Daily Rambam', es: 'Rambam diario' },
  { match: 'Tanakh Yomi', es: 'Tanaj diario' },
  { match: 'Arukh HaShulchan Yomi', es: 'Arukh HaShulján diario' },
];

/** Estantes de la biblioteca: puertas de entrada a lo más usado. Todo lo demás, por el buscador. */
const SHELVES: { es: string; he: string; items: { es: string; ref: string }[] }[] = [
  {
    es: 'Torá y Tanaj',
    he: 'תנ״ך',
    items: [
      { es: 'Bereshit', ref: 'Genesis 1' },
      { es: 'Shemot', ref: 'Exodus 1' },
      { es: 'Vayikrá', ref: 'Leviticus 1' },
      { es: 'Bamidbar', ref: 'Numbers 1' },
      { es: 'Devarim', ref: 'Deuteronomy 1' },
      { es: 'Tehilim', ref: 'Psalms 1' },
      { es: 'Mishlé', ref: 'Proverbs 1' },
    ],
  },
  {
    es: 'Mishná y Pirkei Avot',
    he: 'משנה',
    items: [
      { es: 'Pirkei Avot 1', ref: 'Pirkei Avot 1' },
      { es: 'Pirkei Avot 2', ref: 'Pirkei Avot 2' },
      { es: 'Pirkei Avot 3', ref: 'Pirkei Avot 3' },
      { es: 'Pirkei Avot 4', ref: 'Pirkei Avot 4' },
      { es: 'Pirkei Avot 5', ref: 'Pirkei Avot 5' },
      { es: 'Pirkei Avot 6', ref: 'Pirkei Avot 6' },
      { es: 'Mishná Berajot', ref: 'Mishnah Berakhot 1' },
    ],
  },
  {
    es: 'Guemará',
    he: 'תלמוד',
    items: [{ es: 'Berajot 2a', ref: 'Berakhot 2a' }],
  },
  {
    es: 'Halajá',
    he: 'הלכה',
    items: [
      { es: 'Shulján Aruj — Oraj Jaím', ref: 'Shulchan Arukh, Orach Chayim 1' },
      { es: 'Kitzur Shulján Aruj', ref: 'Kitzur Shulchan Arukh 1' },
      { es: 'Rambam — Hiljot Deot', ref: 'Mishneh Torah, Human Dispositions 1' },
    ],
  },
  {
    es: 'Musar y Jasidut',
    he: 'מוסר',
    items: [
      { es: 'Mesilat Yesharim', ref: 'Mesilat Yesharim 1' },
      { es: 'Shaarei Teshuvá', ref: 'Shaarei Teshuvah 1' },
      { es: 'Orjot Tzadikim', ref: 'Orchot Tzadikim, The Gate of Pride 1' },
      { es: 'Sefer HaJinuj', ref: 'Sefer HaChinukh 1' },
      { es: 'Tania', ref: 'Tanya, Part I; Likkutei Amarim 1' },
    ],
  },
];

function TodayCards({ onOpen }: { onOpen: (ref: string) => void }) {
  const israel = useZury((s) => s.settings?.location.israel ?? false);
  const [items, setItems] = useState<CalendarItem[] | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    setError('');
    getCalendar(!israel).then(
      (r) => alive && setItems(r),
      (e) => alive && setError(e instanceof SefariaError ? e.message : 'No se pudo cargar.'),
    );
    return () => {
      alive = false;
    };
  }, [israel, tick]);

  if (error) {
    return (
      <Card className="space-y-2 p-4">
        <p className="text-[13px] text-[var(--danger)]">{error}</p>
        <Btn variant="ghost" onClick={() => setTick((t) => t + 1)}>
          Reintentar
        </Btn>
      </Card>
    );
  }
  if (!items) return <p className="text-[13px] text-ink-faint">Cargando lo de hoy…</p>;

  const rows = TODAY.flatMap((t) => {
    const it = items.find((i) => i.title === t.match && i.ref);
    return it ? [{ ...t, item: it }] : [];
  });

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(({ es, item }) => (
        <button key={es} onClick={() => onOpen(item.ref as string)} className="text-start">
          <Card className="h-full p-3 transition-colors hover:border-gold">
            <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">{es}</div>
            <div className="mt-0.5 text-[15px] text-ink">{item.value}</div>
            {item.titleHe && <div className="hebrew text-[13px] text-gold">{item.titleHe}</div>}
          </Card>
        </button>
      ))}
    </div>
  );
}

function Searcher({ onOpen }: { onOpen: (ref: string) => void }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true);
    setError('');
    setHits(null);
    try {
      const r = await search(q);
      if (r.kind === 'ref') onOpen(r.ref);
      else setHits(r.hits);
    } catch (err) {
      setError(err instanceof SefariaError ? err.message : 'No se pudo buscar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex gap-2">
        <input
          className={inputCls}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Un libro o cita: "Avot 2:5", "Rashi Genesis 1:1", "Rambam"'
          aria-label="Buscar en la biblioteca"
        />
        <Btn type="submit" disabled={busy}>
          {busy ? '…' : 'Buscar'}
        </Btn>
      </form>
      {error && <p className="text-[13px] text-[var(--danger)]">{error}</p>}
      {hits && hits.length === 0 && (
        <p className="text-[13px] text-ink-faint">
          Sin resultados. Prueba con el nombre en inglés o transliterado (por ejemplo "Pirkei Avot", "Mishneh Torah", "Ramban on Genesis").
        </p>
      )}
      {hits && hits.length > 0 && (
        <Card className="divide-y divide-line">
          {hits.slice(0, 12).map((h) => (
            <button
              key={h.ref}
              onClick={() => onOpen(h.ref)}
              className="block w-full px-4 py-2.5 text-start text-[14px] text-ink hover:bg-[var(--bg-sunken)]"
            >
              {h.title}
            </button>
          ))}
        </Card>
      )}
    </div>
  );
}

function Estudio() {
  const [params, setParams] = useSearchParams();
  const ref = params.get('ref');

  const open = (r: string | null) => {
    const next = new URLSearchParams(params);
    next.set('t', 'estudio');
    if (r) next.set('ref', r);
    else next.delete('ref');
    setParams(next);
  };

  if (ref) {
    return (
      <div className="space-y-4">
        <Btn variant="quiet" onClick={() => open(null)}>
          ‹ Biblioteca
        </Btn>
        <SefariaReader ref_={ref} onOpen={open} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Searcher onOpen={open} />

      <section>
        <SectionTitle es="Hoy en la Torá" he="היום" />
        <TodayCards onOpen={open} />
      </section>

      <section className="space-y-4">
        <SectionTitle es="Biblioteca" he="ספרייה" />
        {SHELVES.map((s) => (
          <div key={s.es}>
            <div className="mb-1.5 flex items-baseline gap-2">
              <span className="hebrew text-lg text-gold">{s.he}</span>
              <span className="text-[12px] uppercase tracking-[0.14em] text-ink-faint">{s.es}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.items.map((i) => (
                <button
                  key={i.ref}
                  onClick={() => open(i.ref)}
                  className="rounded-lg border border-line bg-raised px-3 py-1.5 text-[13px] text-ink hover:border-gold"
                >
                  {i.es}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <p className="text-[11px] leading-relaxed text-ink-faint">
        Textos y comentarios de la biblioteca abierta de Sefaria (sefaria.org): miles de pirushim enlazados a cada
        pasuk, mishná y halajá. Sefaria no ofrece traducción al español; se muestra el hebreo y, cuando existe, la
        traducción al inglés. Necesita conexión a internet.
      </p>
    </div>
  );
}

/**
 * Torá: estudio con la biblioteca de Sefaria, y Musar como segunda pestaña
 * (las frases y el seder de musar de siempre).
 */
export default function Tora() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('t') === 'musar' ? 'musar' : 'estudio';

  return (
    <div className="space-y-4">
      <SectionTitle es="Torá" he="תורה" />
      <div className="grid grid-cols-2 rounded-xl border border-line bg-raised p-1 text-[14px]">
        {(
          [
            ['estudio', 'Estudio'],
            ['musar', 'Musar'],
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
      {tab === 'estudio' ? <Estudio /> : <Musar />}
    </div>
  );
}
