/*
  MÓDULO DE IA — configuración.

  Toda la app funciona SIN IA (reglas + estadística). La IA es un extra opcional:
   - clasificar texto, extraer categorías
   - generar el resumen del día
   - observar tendencias / correlaciones (nunca causalidad, nunca psak, nunca "Tikún")
  NO es un chatbot. Es principalmente invisible.

  La CLAVE de la API de Anthropic vive SOLO en localStorage de este dispositivo:
  nunca entra en la exportación ni se sube a la nube (sería un secreto filtrado).
*/
import type { Settings } from '../db/schema';

const KEY_LS = 'zury.aiKey';

export function getAiKey(): string {
  try {
    return localStorage.getItem(KEY_LS) ?? '';
  } catch {
    return '';
  }
}

export function setAiKey(k: string): void {
  try {
    if (k) localStorage.setItem(KEY_LS, k.trim());
    else localStorage.removeItem(KEY_LS);
  } catch {
    /* almacenamiento no disponible */
  }
}

export function aiReady(settings: Settings | null): boolean {
  return !!settings?.aiEnabled && getAiKey().length > 10;
}

/** Modelos ofrecidos en Ajustes. El primero es el predeterminado. */
export const AI_MODELS: { id: string; label: string; note: string }[] = [
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', note: 'El más barato — ideal para clasificar' },
  { id: 'claude-sonnet-5', label: 'Sonnet 5', note: 'Equilibrado' },
  { id: 'claude-opus-5', label: 'Opus 5', note: 'El más capaz — resúmenes y patrones más finos' },
];

/** Reglas del spec (§52) que van en TODOS los prompts del sistema. */
export const GUARDRAILS = [
  'Reglas estrictas:',
  '- Nunca modifiques ni reescribas el texto original del usuario.',
  '- Habla de "patrón observado", "tendencia" o "correlación". Nunca afirmes causalidad sin evidencia.',
  '- No inventes halajot. No des psak. No te declares Rav. No afirmes cuál es el Tikún del alma.',
  '- No juzgues al usuario. Sin sermones.',
  '- Responde SOLO con lo pedido, sin texto extra.',
].join('\n');
