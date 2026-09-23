/*
  Idioma de la app junto al hebreo: español (por defecto) o inglés. El hebreo NUNCA cambia — solo
  el texto latino que va al lado.

  Es un diccionario simple (texto en español → texto en inglés), no una librería de i18n: se
  traduce por búsqueda directa del string, sin claves inventadas. Un texto que todavía no está en
  el diccionario simplemente se queda en español — así se puede ir ampliando por partes (núcleo
  primero: navegación, Hoy, Retos; después Torá, musar, admin) sin romper nada mientras tanto.

  Uso: `const t = useT();` y envolver cada texto con `t('Texto en español')`.
*/
import { useCallback } from 'react';
import { useZury } from '../state/zury';

export type Lang = 'es' | 'en';

// ───────────────────────── Navegación y estructura de la app (AppShell) ─────────────────────────
const DICT: Record<string, string> = {
  // Barra de abajo y encabezado
  Hoy: 'Today',
  Retos: 'Challenges',
  '¿Cómo estoy?': 'How am I doing?',
  Torá: 'Torah',
  Historia: 'History',
  Menú: 'Menu',
  Registrar: 'Log',
  'Toque rápido': 'Quick tap',
  Misión: 'Mission',
  Calendario: 'Calendar',
  conectando: 'connecting',
  sincronizado: 'synced',
  guardando: 'saving',
  'sin conexión': 'offline',
  'error de sync': 'sync error',
  Idioma: 'Language',
  noche: 'evening',
  'Estado de la copia en la nube': 'Cloud backup status',

  // Dashboard (Hoy) — títulos de sección
  'Ser Yehudí': 'Being a Whole Jew',
  'Áreas de hoy': "Today's areas",
  '¿qué es cada una? →': 'what is each one? →',
  Actividad: 'Activity',
  'Metas activas': 'Active goals',
  'ver todas →': 'see all →',
  'Registros de hoy': "Today's entries",
  'ver día →': 'see day →',
  'Patrones observados (últimos 30 días)': 'Observed patterns (last 30 days)',
  'Inicio del día · ~60s': 'Start of day · ~60s',
  'Final del día': 'End of day',
  'Sin rodeos': 'No sugarcoating',
  'Empezar check-in →': 'Start check-in →',
  'Check-in': 'Check-in',
  Cheshbon: 'Cheshbon',
  'Ver el día': 'See the day',
  hecho: 'done',

  // Retos — pestañas y encabezados principales
  '📋 Mis retos': '📋 My challenges',
  '🌍 Públicos': '🌍 Public',
  '📖 Tehilim': '📖 Tehilim',
  '✨ Crear': '✨ Create',
  '🔥 Te retaron': '🔥 You got challenged',
  Activos: 'Active',
  'Ninguno todavía.': 'None yet.',
  'Retar a alguien a cuidar o hacer algo, sumarte a un reto público, u organizar una cadena de Tehilim entre todos.':
    'Challenge someone to keep or do something, join a public challenge, or organize a Tehilim chain together.',
  'Cargando…': 'Loading…',
  Aceptar: 'Accept',
  Rechazar: 'Decline',
  Cancelar: 'Cancel',
  Denunciar: 'Report',
  'Dejar este reto': 'Leave this challenge',
  '‹ Mis retos': '‹ My challenges',
  '‹ Cadenas de Tehilim': '‹ Tehilim chains',
  'Compartir enlace': 'Share link',
  'Invitar gente': 'Invite people',
  '➕ Invitar a más gente': '➕ Invite more people',
  Público: 'Public',
  Privado: 'Private',
  Anónimo: 'Anonymous',
  'Esperando aprobación': 'Awaiting approval',
  Suscribirme: 'Subscribe',
  'Uniendo…': 'Joining…',
  'Organizar cadena': 'Organize a chain',
  'Organizando…': 'Organizing…',
  Confirmar: 'Confirm',
  'Crear reto': 'Create challenge',
  'Creando…': 'Creating…',
  'Te retaron a esto. ¿Aceptas?': 'You were challenged to this. Do you accept?',
  '¿Dejar este reto?': 'Leave this challenge?',
};

/** Traduce un texto en español al idioma pedido. Si no está en el diccionario, se queda igual. */
export function translate(lang: Lang, es: string): string {
  if (lang !== 'en') return es;
  return DICT[es] ?? es;
}

/** Hook: `t('Texto en español')` según el idioma guardado en Ajustes. */
export function useT(): (es: string) => string {
  const lang = useZury((s) => (s.settings?.language === 'en' ? 'en' : 'es')) as Lang;
  return useCallback((es: string) => translate(lang, es), [lang]);
}

/** Hook: el idioma actual, para el botón de cambiarlo. */
export function useLang(): Lang {
  return useZury((s) => (s.settings?.language === 'en' ? 'en' : 'es')) as Lang;
}
