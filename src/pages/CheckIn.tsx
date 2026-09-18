import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { db } from '../lib/db/db';
import { getDay, listEntries, patchDay } from '../lib/db/repo';
import { buildCheckInQuestions, type AskItem } from '../lib/adaptiveEngine';
import { civilDateKey, keyToNoon } from '../lib/jewishDay';
import type { AreaId, Entry } from '../lib/db/schema';
import { Btn, Card, SectionTitle, inputCls } from '../components/ui';
import { pickMusar } from '../lib/musar';
import { baseMusarContext } from '../lib/musar/context';

export default function CheckIn() {
  const { day, settings, reloadDayRecord } = useZury();
  const navigate = useNavigate();
  const [items, setItems] = useState<AskItem[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!day || !settings) return;
      const todayEntries = await listEntries({ dayId: day.dayId });
      const from = new Date(Date.now() - 14 * 864e5).toISOString();
      const recentRaw = await db.entries.where('createdAt').aboveOrEqual(from).toArray();
      const recentEntries = recentRaw.filter((r) => !r.deletedAt && r.dayId !== day.dayId) as Entry[];
      const yKey = civilDateKey(new Date(keyToNoon(day.dayId).getTime() - 864e5));
      const yesterday = await getDay(yKey);
      setItems(
        buildCheckInQuestions({ today: day, todayEntries, recentEntries, settings, yesterday: yesterday ?? undefined }),
      );
    })();
  }, [day, settings]);

  const focusAreas = useMemo(() => {
    if (!items) return [] as AreaId[];
    return items
      .filter((i) => i.area && (answers[i.id] ?? '').trim())
      .map((i) => i.area!)
      .filter((v, idx, arr) => arr.indexOf(v) === idx);
  }, [items, answers]);

  async function submit() {
    if (!day || !items) return;
    setSaving(true);
    await patchDay(day.dayId, {
      checkIn: {
        at: new Date().toISOString(),
        answers: items.map((i) => ({ q: i.q, a: (answers[i.id] ?? '').trim() })).filter((x) => x.a),
        focusAreas,
      },
    });
    await reloadDayRecord();
    setSaving(false);
    navigate('/');
  }

  if (!items) return <p className="text-center text-ink-faint">Preparando tu check-in…</p>;

  const showMusar = (settings?.musar?.density ?? 'clave') !== 'pie';
  const musar = showMusar
    ? pickMusar({ ...baseMusarContext(settings, day), preferred: ['exigencia'] }, 'checkin')
    : null;

  return (
    <div className="space-y-4">
      <SectionTitle es="Inicio del día judío · ~60 segundos" he="כוונה ליום" />
      {musar && (
        <Card className="p-4 text-center">
          {musar.he && (
            <p className="hebrew text-[15px] leading-relaxed text-gold" dir="rtl">
              {musar.he}
            </p>
          )}
          <p className={`text-[12px] italic leading-relaxed text-ink-soft ${musar.he ? 'mt-1' : ''}`}>
            {musar.es}
          </p>
          {musar.sourceEs && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-ink-faint">{musar.sourceEs}</p>
          )}
        </Card>
      )}
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
              placeholder="Escribe libremente…"
            />
          )}
          <p className="mt-1.5 text-[11px] text-ink-faint">· {it.why}</p>
        </Card>
      ))}

      <div className="flex gap-2 pt-1">
        <Btn variant="ghost" className="flex-1" onClick={() => navigate('/')}>
          Ahora no
        </Btn>
        <Btn className="flex-1" onClick={submit} disabled={saving}>
          {saving ? 'Guardando…' : 'Entrar al día'}
        </Btn>
      </div>
    </div>
  );
}
