import type { GoalLevel } from './db/schema';

/*
  Jerarquía de metas (FASE 4):
    MISIÓN DE VIDA  →  ETAPA  →  AÑO  →  MES  →  SEMANA  →  DÍA
  La misión es el texto raíz (settings.mission.lifeMission); las demás son filas `Goal`
  encadenadas por `parentId`. Las metas pueden cambiar; el pasado no se borra (se archiva).
*/
export const GOAL_LEVELS: { id: Exclude<GoalLevel, 'mission'>; es: string; he: string }[] = [
  { id: 'stage', es: 'Etapa', he: 'שלב' },
  { id: 'year', es: 'Año', he: 'שנה' },
  { id: 'month', es: 'Mes', he: 'חודש' },
  { id: 'week', es: 'Semana', he: 'שבוע' },
  { id: 'day', es: 'Día', he: 'יום' },
];

const ORDER: GoalLevel[] = ['mission', 'stage', 'year', 'month', 'week', 'day'];

export function parentLevel(l: GoalLevel): GoalLevel | null {
  const i = ORDER.indexOf(l);
  return i > 0 ? ORDER[i - 1] : null;
}
export function childLevel(l: GoalLevel): GoalLevel | null {
  const i = ORDER.indexOf(l);
  return i >= 0 && i < ORDER.length - 1 ? ORDER[i + 1] : null;
}

export function levelLabel(l: GoalLevel): string {
  return GOAL_LEVELS.find((x) => x.id === l)?.es ?? l;
}

export const STATUS_LABEL: Record<string, string> = {
  active: 'Activa',
  paused: 'En pausa',
  done: 'Cumplida',
  dropped: 'Abandonada',
};
