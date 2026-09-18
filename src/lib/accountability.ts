/*
  MODO EXIGENTE — rendición de cuentas.
  El sistema te confronta con tu conducta y tus datos, sin adular y sin suavizar.
  NUNCA te llama fracaso, NUNCA da psak, NUNCA habla de castigo (§60). La caída se
  responde con el regreso: ahora, no "mañana".
*/
import type { AreaId, DayRecord, Entry, Goal, Settings } from './db/schema';
import type { JewishDayInfo } from './jewishDay';
import { catLabel } from './categories';
import { WATCHED_FALLS_CATALOG } from './watchedFalls';
import { count } from './format';

export type Strictness = Settings['strictness'];

export interface Callout {
  id: string;
  text: string;
  severity: 'push' | 'warn' | 'hard';
}

interface Ctx {
  strictness: Strictness;
  today: JewishDayInfo;
  dayRecord: DayRecord | null;
  todayEntries: Entry[];
  recentEntries: Entry[]; // últimos ~14 días, sin hoy
  recentDays: DayRecord[]; // últimos ~14 días
  goals: Goal[];
  dayProgress: number; // 0..1
}

const inArea = (e: Entry, a: AreaId) => e.area === a || e.areasSecondary.includes(a);
const distinctDays = (es: Entry[]) => new Set(es.map((e) => e.dayId)).size;

/** Frase según nivel: [demanding, firm]. gentle no genera callouts. */
function phrase(s: Strictness, demanding: string, firm: string): string {
  return s === 'demanding' ? demanding : firm;
}

export function accountabilityCallouts(ctx: Ctx): Callout[] {
  const { strictness: s, today, dayRecord, todayEntries, recentEntries, recentDays, goals, dayProgress } = ctx;
  if (s === 'gentle') return [];
  const out: Callout[] = [];
  const shabbat = today.isShabbat || today.isYomTov;

  // 1. Medio día y cero registros
  if (!shabbat && todayEntries.length === 0 && dayProgress > 0.4) {
    out.push({
      id: 'empty-midday',
      severity: 'warn',
      text: phrase(
        s,
        `Medio día judío y ni un registro. ¿Estás viviendo el día o dejándolo pasar?`,
        `Ya va medio día y no hay registros. Cuéntale al sistema lo que llevas.`,
      ),
    });
  }

  // 2. Torá abandonada
  const recentDaysCount = new Set(recentEntries.map((e) => e.dayId)).size || 1;
  const torahDays = distinctDays(recentEntries.filter((e) => inArea(e, 'torah')));
  const torahToday = todayEntries.some((e) => inArea(e, 'torah'));
  const gapTorah = recentDaysCount - torahDays;
  if (!shabbat && gapTorah >= 2 && !torahToday && dayProgress > 0.35) {
    out.push({
      id: 'torah-gap',
      severity: gapTorah >= 4 ? 'hard' : 'push',
      text: phrase(
        s,
        `${gapTorah} de tus últimos días sin Torá. Eso no es un descuido: es una decisión que estás tomando. Cámbiala hoy.`,
        `Llevas varios días sin registrar Torá. ¿Cuándo estudias hoy?`,
      ),
    });
  }

  // 3. Lo que dijiste en el check-in vs. lo que hiciste
  const focus = dayRecord?.checkIn?.focusAreas ?? [];
  for (const a of focus) {
    if (dayProgress > 0.5 && !todayEntries.some((e) => inArea(e, a))) {
      out.push({
        id: `focus-${a}`,
        severity: 'warn',
        text: phrase(
          s,
          `Esta mañana dijiste que cuidarías ${catLabel(a)}. Cero registros. ¿Palabras o hechos?`,
          `En el check-in marcaste ${catLabel(a)} como foco. Aún no hay nada registrado ahí.`,
        ),
      });
      break;
    }
  }

  // 4. Metas estancadas
  const now = Date.now();
  const stalled = goals.find((g) => {
    if (g.archivedAt || g.status !== 'active' || g.progress >= 100) return false;
    const ageDays = (now - new Date(g.updatedAt).getTime()) / 86400000;
    return ageDays >= 6;
  });
  if (stalled) {
    const ageDays = Math.round((now - new Date(stalled.updatedAt).getTime()) / 86400000);
    out.push({
      id: 'goal-stalled',
      severity: 'push',
      text: phrase(
        s,
        `La meta "${stalled.title}" lleva ${ageDays} días en el mismo ${stalled.progress}%. O la mueves hoy, o admite que la dejaste.`,
        `La meta "${stalled.title}" no se ha movido en ${ageDays} días.`,
      ),
    });
  }

  // 5. Caídas: esta semana vs. la anterior
  const dayMs = 86400000;
  const w1 = recentEntries.filter((e) => Date.now() - new Date(e.createdAt).getTime() <= 7 * dayMs && e.valence === 'fall').length;
  const w2 = recentEntries.filter((e) => {
    const age = Date.now() - new Date(e.createdAt).getTime();
    return age > 7 * dayMs && age <= 14 * dayMs && e.valence === 'fall';
  }).length;
  if (w1 > w2 && w1 >= 2) {
    out.push({
      id: 'falls-up',
      severity: 'hard',
      text: phrase(
        s,
        `Más caídas esta semana (${w1}) que la anterior (${w2}). Míralo de frente, sin excusas. ¿Qué cambió y qué vas a hacer distinto hoy?`,
        `Van más caídas esta semana que la pasada (${w1} vs ${w2}). Vale la pena revisarlo.`,
      ),
    });
  }

  // 6. Días sin cerrar (חשבון הנפש)
  const daysWithCheshbon = recentDays.filter((d) => d.cheshbon).length;
  const gapCheshbon = Math.max(0, recentDays.length - daysWithCheshbon);
  if (gapCheshbon >= 3) {
    out.push({
      id: 'no-cheshbon',
      severity: 'push',
      text: phrase(
        s,
        `${gapCheshbon} días sin cerrar con חשבון הנפש. Un día sin jeshbón es un día del que no aprendiste nada.`,
        `Llevas ${gapCheshbon} días sin hacer el חשבון הנפש.`,
      ),
    });
  }

  // 7. Caída hoy sin recuperación
  const fallsToday = todayEntries.filter((e) => e.valence === 'fall').length;
  const recToday = todayEntries.some((e) => e.valence === 'recovery');
  if (fallsToday > 0 && !recToday && dayProgress > 0.4) {
    out.push({
      id: 'fall-no-return',
      severity: 'warn',
      text: phrase(
        s,
        `Caíste hoy. Ya está, no te flageles — eso no sirve. Pero contesta: ¿cuándo empiezas a volver? La respuesta correcta es "ahora".`,
        `Hubo una caída hoy. ¿Cómo vas a empezar a volver?`,
      ),
    });
  }

  // 7b. Caídas que vigilas (shmirat einaim, bitajón, aveira jamura, …)
  const WATCHED_IDS = new Set(WATCHED_FALLS_CATALOG.map((w) => w.id));
  const nameOf = (e: Entry) => {
    const id = e.tags.find((t) => WATCHED_IDS.has(t));
    return WATCHED_FALLS_CATALOG.find((w) => w.id === id)?.es ?? null;
  };
  const isWatched = (e: Entry) => e.valence !== 'victory' && e.tags.some((t) => WATCHED_IDS.has(t));
  const watchedToday = todayEntries.find(isWatched);
  const watchedRecent = watchedToday
    ? undefined
    : [...recentEntries]
        .reverse()
        .find((e) => isWatched(e) && Date.now() - new Date(e.createdAt).getTime() <= 3 * dayMs);
  if (watchedToday && nameOf(watchedToday)) {
    out.push({
      id: 'watched-today',
      severity: 'hard',
      text: phrase(
        s,
        `Hoy caíste en ${nameOf(watchedToday)}. No lo minimices y no te hundas — las dos cosas te paralizan. El regreso empieza ahora.`,
        `Hoy hubo una caída en ${nameOf(watchedToday)}. Regístrala y marca el regreso.`,
      ),
    });
  } else if (watchedRecent && nameOf(watchedRecent)) {
    const d = Math.max(1, Math.round((Date.now() - new Date(watchedRecent.createdAt).getTime()) / dayMs));
    out.push({
      id: 'watched-recent',
      severity: 'warn',
      text: phrase(
        s,
        `${nameOf(watchedRecent)}: hace ${count(d, 'día', 'días')}. Es justo cuando se repite. ¿Qué vas a hacer distinto hoy?`,
        `${nameOf(watchedRecent)} apareció hace ${count(d, 'día', 'días')}. Vale la pena vigilarlo estos días.`,
      ),
    });
  }

  // 8. Reconocimiento breve (solo demanding, para que no sea solo palo)
  if (s === 'demanding' && todayEntries.length >= 4 && fallsToday === 0 && out.length === 0) {
    out.push({
      id: 'good-day',
      severity: 'push',
      text: `Hoy sí estás en tu día. Bien. Que no sea la excepción: mañana igual.`,
    });
  }

  const order = { hard: 0, warn: 1, push: 2 };
  return out.sort((a, b) => order[a.severity] - order[b.severity]).slice(0, 5);
}

// ---- Tono para los prompts de IA y para los cierres del resumen ----

export function aiToneLine(s: Strictness): string {
  if (s === 'demanding')
    return [
      'Tono: directo y exigente. No adules, no suavices, no consueles de más. Estándar alto.',
      'Nombra la autoindulgencia y las excusas cuando las veas en los datos.',
      'PROHIBIDO: decir que la persona es un fracaso, dar psak, hablar de castigo divino.',
      'La caída se responde exigiendo el regreso ahora, no con culpa.',
    ].join(' ');
  if (s === 'firm') return 'Tono: honesto y claro, sin adular. Señala lo que no cuadra, con respeto.';
  return 'Tono: cálido y alentador.';
}

export function summaryClosing(s: Strictness): string {
  if (s === 'demanding')
    return 'Sin adornos: ¿te esforzaste de verdad hoy o te conformaste? Mañana el estándar sube, no baja.';
  if (s === 'firm') return 'Míralo con honestidad y decide una cosa concreta para mañana.';
  return '';
}
