import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import { addEntry, listEntries, patchDay } from '../lib/db/repo';
import {
  buildCheshbonQuestions,
  computeDayStats,
  generateDaySummary,
  type AskItem,
} from '../lib/adaptiveEngine';
import type { Entry } from '../lib/db/schema';
import { aiReady } from '../lib/ai/config';
import { aiDaySummary } from '../lib/ai/tasks';
import { aiToneLine, summaryClosing } from '../lib/accountability';
import { Btn, Card, SectionTitle, inputCls } from '../components/ui';
import { pickMusar } from '../lib/musar';
import { baseMusarContext } from '../lib/musar/context';

export default function Cheshbon() {
  const { day, settings, reloadDayRecord } = useZury();
  const navigate = useNavigate();
  const [items, setItems] = useState<AskItem[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string | null>(null);
  const [summaryBy, setSummaryBy] = useState<'rules' | 'ai'>('rules');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!day || !settings) return;
      const todayEntries = await listEntries({ dayId: day.dayId });
      const from = new Date(Date.now() - 14 * 864e5).toISOString();
      const recentRaw = await db.entries.where('createdAt').aboveOrEqual(from).toArray();
      const recentEntries = recentRaw.filter((r) => !r.deletedAt && r.dayId !== day.dayId) as Entry[];
      setItems(buildCheshbonQuestions({ today: day, todayEntries, recentEntries, settings }));
    })();
  }, [day, settings]);

  async function finish() {
    if (!day || !items) return;
    setSaving(true);

    // Cada respuesta de área se guarda como registro (source: cheshbon), sin perder nada.
    for (const it of items) {
      const a = (answers[it.id] ?? '').trim();
      if (!a || !it.area) continue;
      await addEntry({
        dayId: day.dayId,
        hebrewDate: day.hebrewDate,
        area: it.area,
        text: a,
        source: 'cheshbon',
        valence:
          it.area === 'victory' ? 'victory' : it.area === 'recovery' ? 'recovery' : 'neutral',
      });
    }

    const learned = (answers['learned'] ?? '').trim() || undefined;
    const doDifferent = (answers['do-different'] ?? '').trim() || undefined;
    const moodEnd = answers['mood-end'] ? Number(answers['mood-end']) : null;

    await patchDay(day.dayId, {
      cheshbon: {
        at: new Date().toISOString(),
        answers: items
          .map((i) => ({ q: i.q, a: (answers[i.id] ?? '').trim(), area: i.area }))
          .filter((x) => x.a),
        learned,
        doDifferent,
      },
      moodEnd,
    });

    const entries = await listEntries({ dayId: day.dayId });
    const cheshbonForSummary = { at: new Date().toISOString(), answers: [], learned, doDifferent };
    const strictness = settings!.strictness;
    let text = generateDaySummary(day, entries, cheshbonForSummary, summaryClosing(strictness));
    let by: 'rules' | 'ai' = 'rules';
    if (aiReady(settings) && settings!.aiAutoSummary) {
      const aiText = await aiDaySummary(day, entries, cheshbonForSummary, settings!.aiModel, aiToneLine(strictness));
      if (aiText) {
        text = aiText;
        by = 'ai';
      }
    }
    await patchDay(day.dayId, {
      autoSummary: { at: new Date().toISOString(), text, by, stats: computeDayStats(entries) as unknown as Record<string, unknown> },
    });

    await reloadDayRecord();
    setSaving(false);
    setSummaryBy(by);
    setSummary(text);
  }

  if (summary !== null) {
    return (
      <div className="space-y-4">
        <SectionTitle es="Resumen del día" he="📜 סיכום היום" />
        <Card className="whitespace-pre-wrap p-4 text-[14px] leading-relaxed text-ink">{summary}</Card>
        {summaryBy === 'ai' && (
          <p className="-mt-2 text-right text-[11px] text-ink-faint">✦ redactado con IA a partir de tus registros</p>
        )}
        <p className="text-center text-[12px] text-ink-faint hebrew">
          לרשום את האמת · ללמוד ממנה · לקום שוב · להמשיך אל ה׳
        </p>
        {(settings?.musar?.density ?? 'clave') !== 'pie' &&
          (() => {
            const m = pickMusar({ ...baseMusarContext(settings, day), slot: 'evening' }, 'cheshbon');
            return (
              <Card className="p-4 text-center">
                {m.he && (
                  <p className="hebrew text-[15px] leading-relaxed text-gold" dir="rtl">
                    {m.he}
                  </p>
                )}
                <p className={`text-[12px] italic leading-relaxed text-ink-soft ${m.he ? 'mt-1' : ''}`}>{m.es}</p>
                {m.sourceEs && (
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">{m.sourceEs}</p>
                )}
              </Card>
            );
          })()}
        <Btn className="w-full" onClick={() => navigate('/')}>
          Guardar y cerrar el día
        </Btn>
      </div>
    );
  }

  if (!items) return <p className="text-center text-ink-faint">Revisando lo que registraste hoy…</p>;

  return (
    <div className="space-y-4">
      <SectionTitle es="Final del día judío" he="חשבון הנפש" />
      <p className="-mt-2 text-[12px] text-ink-faint">
        El sistema ya leyó tus registros de hoy. Solo pregunta lo que falta.
      </p>
      {items.map((it) => (
        <Card key={it.id} className="p-4">
          <p className="mb-2 text-[15px] text-ink">{it.q}</p>
          {it.kind === 'scale' ? (
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 11 }, (_, n) => (
                <button
                  key={n}
                  onClick={() => setAnswers((a) => ({ ...a, [it.id]: String(n) }))}
                  className={`h-9 w-9 rounded-lg border text-sm ${
                    answers[it.id] === String(n) ? 'border-gold bg-gold text-[#1a140a]' : 'border-line text-ink-soft'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          ) : (
            <textarea
              className={inputCls + ' resize-none'}
              rows={2}
              value={answers[it.id] ?? ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [it.id]: e.target.value }))}
              placeholder="Escribe libremente… (puedes dejarlo vacío)"
            />
          )}
          <p className="mt-1.5 text-[11px] text-ink-faint">· {it.why}</p>
        </Card>
      ))}
      <div className="flex gap-2 pt-1">
        <Btn variant="ghost" className="flex-1" onClick={() => navigate('/')}>
          Ahora no
        </Btn>
        <Btn className="flex-1" onClick={finish} disabled={saving}>
          {saving ? 'Generando resumen…' : 'Cerrar el día'}
        </Btn>
      </div>
    </div>
  );
}
