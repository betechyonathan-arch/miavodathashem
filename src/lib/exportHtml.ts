/*
  Exportar a un documento imprimible / PDF (§57).
  Genera HTML autónomo y lo abre en una pestaña nueva con un botón "Guardar PDF".
  En iPhone: la pestaña se abre en Safari → Compartir → Imprimir → Guardar como PDF.
*/
import type { DayRecord, Entry, PeriodBoleta } from './db/schema';
import { catLabel } from './categories';
import { computeDayStats } from './adaptiveEngine';
import { hebrewDateEs, timeHM } from './format';

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const SHELL = (title: string, body: string) => `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Iowan Old Style','Palatino Linotype',Georgia,serif; color:#2b2417; background:#f4efe4; }
  .wrap { max-width: 720px; margin: 0 auto; padding: 28px 20px 80px; }
  h1 { font-size: 22px; margin: 0 0 2px; color:#6b5320; }
  h2 { font-size: 15px; text-transform: uppercase; letter-spacing:.12em; color:#9a8c6f; margin: 22px 0 8px; border-bottom:1px solid #ddd0b4; padding-bottom:4px; }
  .he { direction: rtl; font-size: 18px; color:#9a7b33; }
  .meta { color:#6b5f48; font-size: 13px; }
  .entry { border:1px solid #ddd0b4; border-radius:10px; padding:10px 12px; margin:8px 0; background:#fbf7ee; }
  .entry .top { font-size:12px; color:#6b5f48; }
  .entry .txt { margin-top:3px; white-space:pre-wrap; }
  .tags { margin-top:4px; }
  .tag { display:inline-block; border:1px solid #ddd0b4; border-radius:5px; padding:0 5px; font-size:11px; color:#6b5f48; margin-right:4px; }
  .v-victory { border-left:3px solid #4f6b45; }
  .v-fall { border-left:3px solid #9b3d33; }
  .v-recovery { border-left:3px solid #9a7b33; }
  .kv { font-size:13px; }
  .kv b { color:#6b5f48; font-weight:600; }
  pre.summary { white-space:pre-wrap; font-family:inherit; background:#fbf7ee; border:1px solid #ddd0b4; border-radius:10px; padding:12px; font-size:13px; }
  .bar { display:flex; align-items:flex-end; gap:3px; height:70px; }
  .bar > div { flex:1; background:#9a7b33; border-radius:3px 3px 0 0; }
  #print { position: fixed; right:16px; bottom:16px; background:#9a7b33; color:#1a140a; border:none;
    border-radius:999px; padding:12px 20px; font:600 15px/1 system-ui; box-shadow:0 6px 20px rgba(0,0,0,.25); }
  @media print { #print { display:none; } body { background:#fff; } .entry,.bar>div,pre.summary { background:#fff; } }
</style></head><body><div class="wrap">${body}</div>
<button id="print" onclick="window.print()">Guardar PDF / Imprimir</button></body></html>`;

function entryHtml(e: Entry): string {
  const fields = Object.entries(e.fields)
    .filter(([k, v]) => k !== '_ai' && v !== '' && v != null && !(Array.isArray(v) && v.length === 0))
    .map(([k, v]) => `<span class="tag">${esc(k)}: ${esc(Array.isArray(v) ? v.join(', ') : v)}</span>`)
    .join('');
  return `<div class="entry v-${e.valence}">
    <div class="top">${esc(catLabel(e.area))} · ${esc(timeHM(e.createdAt))}${e.valence !== 'neutral' ? ' · ' + esc(e.valence) : ''}</div>
    <div class="txt">${esc(e.text)}</div>
    <div class="tags">${e.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}${fields}</div>
  </div>`;
}

export function dayHtml(day: DayRecord, entries: Entry[]): string {
  const s = computeDayStats(entries.filter((e) => !e.deletedAt));
  const body = `
    <h1>${esc(hebrewDateEs(day.hebrewDate))}</h1>
    <div class="he">${esc(day.hebrewDateHe)}</div>
    <div class="meta">${esc(day.civilAnchor)}${day.isShabbat ? ' · שבת' : ''}${day.isYomTov ? ' · יום טוב' : ''}${
      day.holidays.length ? ' · ' + esc(day.holidays.join(', ')) : ''
    }</div>
    <div class="meta">Registros: ${s.totalEntries} · Victorias: ${s.victories} · Caídas: ${s.falls}${
      s.torahMinutes ? ' · Torá: ' + s.torahMinutes + ' min' : ''
    }</div>
    ${day.checkIn ? `<h2>Check-in</h2>${day.checkIn.answers.map((a) => `<div class="kv"><b>${esc(a.q)}</b><br>${esc(a.a)}</div>`).join('')}` : ''}
    ${day.autoSummary ? `<h2>Resumen del día</h2><pre class="summary">${esc(day.autoSummary.text)}</pre>` : ''}
    ${day.cheshbon ? `<h2>חשבון הנפש</h2>${day.cheshbon.answers.map((a) => `<div class="kv"><b>${esc(a.q)}</b><br>${esc(a.a)}</div>`).join('')}` : ''}
    <h2>Registros (${entries.length})</h2>
    ${entries.map(entryHtml).join('') || '<div class="meta">Sin registros.</div>'}
  `;
  return SHELL(`Zury Avodah — ${day.hebrewDate}`, body);
}

export function periodHtml(opts: {
  title: string;
  labelHe: string;
  rangeText: string;
  metrics: { title: string; rows: { label: string; value: string }[] }[];
  evolution?: { label: string; n: number }[];
  learnings?: { day: string; text: string }[];
  assessment?: { comoVoy: string; dondeFalle: string; queCorregir: string; enUnaFrase?: string };
}): string {
  const maxE = Math.max(1, ...(opts.evolution ?? []).map((e) => e.n));
  const a = opts.assessment;
  const assessmentBlock = a
    ? `
    ${a.enUnaFrase ? `<div class="he" style="font-size:15px;direction:ltr;color:#6b5320;font-style:italic;margin:6px 0 2px">« ${esc(a.enUnaFrase)} »</div>` : ''}
    <h2>Cómo voy</h2>
    <pre class="summary">${esc(a.comoVoy)}</pre>
    <h2>Dónde fallé</h2>
    <pre class="summary">${esc(a.dondeFalle)}</pre>
    <h2>Qué corregir</h2>
    <pre class="summary">${esc(a.queCorregir)}</pre>
    <div class="meta">Lectura escrita por la IA a partir de tus datos. Es una opinión sobre lo observado, no un veredicto ni un psak.</div>
  `
    : '';
  const body = `
    <h1>${esc(opts.title)}</h1>
    <div class="he">${esc(opts.labelHe)}</div>
    <div class="meta">${esc(opts.rangeText)}</div>
    ${assessmentBlock}
    ${opts.metrics
      .map(
        (g) => `<h2>${esc(g.title)}</h2>${g.rows
          .map((r) => `<div class="kv"><b>${esc(r.label)}:</b> ${esc(r.value)}</div>`)
          .join('')}`,
      )
      .join('')}
    ${
      opts.evolution?.length
        ? `<h2>Evolución</h2><div class="bar">${opts.evolution
            .map((e) => `<div title="${esc(e.label)}: ${e.n}" style="height:${Math.max(3, (e.n / maxE) * 100)}%"></div>`)
            .join('')}</div>`
        : ''
    }
    ${
      opts.learnings?.length
        ? `<h2>Qué aprendí</h2>${opts.learnings
            .map((l) => `<div class="kv"><b>${esc(l.day)}:</b> ${esc(l.text)}</div>`)
            .join('')}`
        : ''
    }
  `;
  return SHELL(`Zury Avodah — ${opts.title}`, body);
}

const KIND_LABEL = { week: 'Boleta semanal', month: 'Boleta mensual', year: 'Boleta anual' } as const;

export function boletaHtml(b: PeriodBoleta): string {
  const s = b.stats;
  const body = `
    <h1>${esc(KIND_LABEL[b.kind])}</h1>
    <div class="he">תְּעוּדָה</div>
    <div class="meta">${esc(b.label)} · ${esc(b.fromKey)} – ${esc(b.toKey)} · ${b.by === 'ai' ? 'con IA' : 'por reglas'}</div>
    <div class="meta">${s.entries} registros · ${s.victories} victorias · ${s.falls} caídas${
      s.watchedFalls > 0 ? ` (${s.watchedFalls} de vigilancia)` : ''
    } · Torá ${s.torahDays}/${s.totalDays} · Cheshbon ${s.cheshbonDays}/${s.totalDays}</div>
    <h2>Dónde estuviste bien</h2>
    <pre class="summary">${esc(b.bien)}</pre>
    <h2>Dónde estuviste mal</h2>
    <pre class="summary">${esc(b.mal)}</pre>
    <h2>El refuerzo</h2>
    <pre class="summary">${esc(b.refuerzo)}</pre>
    ${
      b.detalle
        ? `<h2>Detalle del año</h2><pre class="summary">${esc(b.detalle)}</pre>`
        : ''
    }
    <h2>Musar</h2>
    ${b.musar.he ? `<div class="he">${esc(b.musar.he)}</div>` : ''}
    <div class="kv">${esc(b.musar.es)}</div>
    ${b.musar.sourceEs ? `<div class="meta">${esc(b.musar.sourceEs)}</div>` : ''}
  `;
  return SHELL(`Zury Avodah — ${KIND_LABEL[b.kind]} · ${b.label}`, body);
}

export function openPrintable(html: string): void {
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, '_blank');
  if (!w) {
    // fallback: descarga
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zury-avodah.html';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
