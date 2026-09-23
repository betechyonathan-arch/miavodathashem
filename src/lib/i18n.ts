/*
  Idioma de la app: español (por defecto), inglés, o hebreo. El gran texto hebreo decorativo
  (títulos, לוח, שליחות, etc.) NUNCA cambia — este diccionario es para el texto de apoyo que va a
  su lado (botones, títulos de sección, párrafos), que normalmente está en español.

  Es un diccionario simple (texto en español → { en, he }), no una librería de i18n: se traduce
  por búsqueda directa del string, sin claves inventadas. Un texto que todavía no está en el
  diccionario simplemente se queda en español — así se puede ir ampliando por partes (núcleo
  primero: navegación, Hoy, Retos, Auth; después Torá, musar, admin) sin romper nada mientras
  tanto.

  Nota de alcance: en modo hebreo el texto se traduce, pero NO se cambia la alineación/dirección
  del layout (dir="ltr" en toda la app) — para frases cortas (botones, títulos) se lee bien igual;
  párrafos largos en hebreo podrían beneficiarse de dir="rtl" explícito en una pasada futura.

  Uso: `const t = useT();` y envolver cada texto con `t('Texto en español')`.
*/
import { useCallback } from 'react';
import { useZury } from '../state/zury';

export type Lang = 'es' | 'en' | 'he';

interface Entry {
  en: string;
  he: string;
}

// ───────────────────────── Navegación y estructura de la app (AppShell) ─────────────────────────
const DICT: Record<string, Entry> = {
  // Barra de abajo y encabezado
  Hoy: { en: 'Today', he: 'היום' },
  Retos: { en: 'Challenges', he: 'אתגרים' },
  '¿Cómo estoy?': { en: 'How am I doing?', he: 'איך אני?' },
  Torá: { en: 'Torah', he: 'תורה' },
  Historia: { en: 'History', he: 'היסטוריה' },
  Menú: { en: 'Menu', he: 'תפריט' },
  Registrar: { en: 'Log', he: 'רישום' },
  'Toque rápido': { en: 'Quick tap', he: 'הקשה מהירה' },
  Misión: { en: 'Mission', he: 'שליחות' },
  Calendario: { en: 'Calendar', he: 'לוח' },
  conectando: { en: 'connecting', he: 'מתחבר' },
  sincronizado: { en: 'synced', he: 'מסונכרן' },
  guardando: { en: 'saving', he: 'שומר' },
  'sin conexión': { en: 'offline', he: 'לא מקוון' },
  'error de sync': { en: 'sync error', he: 'שגיאת סנכרון' },
  Idioma: { en: 'Language', he: 'שפה' },
  noche: { en: 'evening', he: 'ערב' },
  'Estado de la copia en la nube': { en: 'Cloud backup status', he: 'מצב הגיבוי בענן' },

  // Dashboard (Hoy) — títulos de sección
  'Ser Yehudí': { en: 'Being a Whole Jew', he: 'להיות יהודי שלם' },
  'Áreas de hoy': { en: "Today's areas", he: 'תחומי היום' },
  '¿qué es cada una? →': { en: 'what is each one? →', he: '← מה זה כל אחד' },
  Actividad: { en: 'Activity', he: 'פעילות' },
  'Metas activas': { en: 'Active goals', he: 'מטרות פעילות' },
  'ver todas →': { en: 'see all →', he: '← צפה בהכול' },
  'Registros de hoy': { en: "Today's entries", he: 'הרישומים של היום' },
  'ver día →': { en: 'see day →', he: '← צפה ביום' },
  'Patrones observados (últimos 30 días)': { en: 'Observed patterns (last 30 days)', he: 'דפוסים שנצפו (30 הימים האחרונים)' },
  'Inicio del día · ~60s': { en: 'Start of day · ~60s', he: 'תחילת היום · כ-60 שניות' },
  'Final del día': { en: 'End of day', he: 'סוף היום' },
  'Sin rodeos': { en: 'No sugarcoating', he: 'ללא כחל ושרק' },
  'Empezar check-in →': { en: 'Start check-in →', he: "← התחל צ'ק-אין" },
  'Check-in': { en: 'Check-in', he: "צ'ק-אין" },
  Cheshbon: { en: 'Cheshbon', he: 'חשבון' },
  'Ver el día': { en: 'See the day', he: 'צפה ביום' },
  hecho: { en: 'done', he: 'בוצע' },

  // Retos — pestañas y encabezados principales
  '📋 Mis retos': { en: '📋 My challenges', he: '📋 האתגרים שלי' },
  '🌍 Públicos': { en: '🌍 Public', he: '🌍 ציבוריים' },
  '📖 Tehilim': { en: '📖 Tehilim', he: '📖 תהלים' },
  '✨ Crear': { en: '✨ Create', he: '✨ צור' },
  '🔥 Te retaron': { en: '🔥 You got challenged', he: '🔥 קיבלת אתגר' },
  Activos: { en: 'Active', he: 'פעילים' },
  'Ninguno todavía.': { en: 'None yet.', he: 'אף אחד עדיין.' },
  'Retar a alguien a cuidar o hacer algo, sumarte a un reto público, u organizar una cadena de Tehilim entre todos.': {
    en: 'Challenge someone to keep or do something, join a public challenge, or organize a Tehilim chain together.',
    he: 'אתגר מישהו לשמור או לעשות משהו, הצטרף לאתגר ציבורי, או ארגן שרשרת תהלים יחד עם כולם.',
  },
  'Cargando…': { en: 'Loading…', he: 'טוען…' },
  Aceptar: { en: 'Accept', he: 'קבל' },
  Rechazar: { en: 'Decline', he: 'דחה' },
  Cancelar: { en: 'Cancel', he: 'בטל' },
  Denunciar: { en: 'Report', he: 'דווח' },
  'Dejar este reto': { en: 'Leave this challenge', he: 'עזוב את האתגר הזה' },
  '‹ Mis retos': { en: '‹ My challenges', he: '‹ האתגרים שלי' },
  '‹ Cadenas de Tehilim': { en: '‹ Tehilim chains', he: '‹ שרשראות תהלים' },
  'Compartir enlace': { en: 'Share link', he: 'שתף קישור' },
  'Invitar gente': { en: 'Invite people', he: 'הזמן אנשים' },
  '➕ Invitar a más gente': { en: '➕ Invite more people', he: '➕ הזמן עוד אנשים' },
  Público: { en: 'Public', he: 'ציבורי' },
  Privado: { en: 'Private', he: 'פרטי' },
  Anónimo: { en: 'Anonymous', he: 'אנונימי' },
  'Esperando aprobación': { en: 'Awaiting approval', he: 'ממתין לאישור' },
  Suscribirme: { en: 'Subscribe', he: 'הרשם' },
  'Uniendo…': { en: 'Joining…', he: 'מצטרף…' },
  'Organizar cadena': { en: 'Organize a chain', he: 'ארגן שרשרת' },
  'Organizando…': { en: 'Organizing…', he: 'מארגן…' },
  Confirmar: { en: 'Confirm', he: 'אשר' },
  'Crear reto': { en: 'Create challenge', he: 'צור אתגר' },
  'Creando…': { en: 'Creating…', he: 'יוצר…' },
  'Te retaron a esto. ¿Aceptas?': { en: 'You were challenged to this. Do you accept?', he: 'קיבלת אתגר לזה. מסכים?' },
  '¿Dejar este reto?': { en: 'Leave this challenge?', he: 'לעזוב את האתגר הזה?' },

  // Auth (entrar / crear cuenta)
  'Tu información es privada': { en: 'Your information is private', he: 'המידע שלך פרטי' },
  'Tus registros, caídas, metas y kabalot se guardan': {
    en: 'Your entries, falls, goals and commitments are stored',
    he: 'הרישומים, הנפילות, המטרות והקבלות שלך נשמרים',
  },
  'solo en tu dispositivo': { en: 'only on your device', he: 'רק במכשיר שלך' },
  '. Solo tú puedes verlos: nadie más, ni los administradores de la app ni quien la creó.': {
    en: '. Only you can see them: no one else — not the app’s admins, not even whoever built it.',
    he: '. רק אתה יכול לראות אותם: אף אחד אחר — לא מנהלי האפליקציה ואפילו לא מי שבנה אותה.',
  },
  'Al servidor solo van tu nombre, tu correo, tu género, cuándo entras a la app y que registraste algo (para saber cuánta gente la usa). Nunca lo que registras.': {
    en: 'Only your name, email, gender, when you open the app, and that you logged something (to know how many people use it) go to the server. Never what you log.',
    he: 'לשרת עוברים רק השם שלך, האימייל, המגדר, מתי אתה נכנס לאפליקציה, ושרשמת משהו (כדי לדעת כמה אנשים משתמשים בה). לעולם לא מה שאתה רושם.',
  },
  'Modo de prueba: nada sale de este dispositivo.': { en: 'Test mode: nothing leaves this device.', he: 'מצב ניסיון: שום דבר לא יוצא מהמכשיר הזה.' },
  'La IA es opcional y viene apagada; solo si tú la activas, el texto que elijas analizar se envía a Anthropic.': {
    en: 'AI is optional and off by default; only if you turn it on, the text you choose to analyze is sent to Anthropic.',
    he: 'הבינה המלאכותית היא אופציונלית וכבויה כברירת מחדל; רק אם אתה מפעיל אותה, הטקסט שתבחר לנתח נשלח ל-Anthropic.',
  },
  'Crear cuenta': { en: 'Create account', he: 'צור חשבון' },
  Entrar: { en: 'Log in', he: 'התחבר' },
  Nombre: { en: 'Name', he: 'שם' },
  Eres: { en: 'You are', he: 'את/ה' },
  Hombre: { en: 'Man', he: 'גבר' },
  Mujer: { en: 'Woman', he: 'אישה' },
  'Según la halajá, las mitzvot y las preguntas que verás son distintas para hombres y mujeres.': {
    en: 'By halacha, the mitzvot and questions you’ll see are different for men and women.',
    he: 'לפי ההלכה, המצוות והשאלות שתראה שונות לגברים ולנשים.',
  },
  Correo: { en: 'Email', he: 'אימייל' },
  Contraseña: { en: 'Password', he: 'סיסמה' },
  '¿Olvidaste tu contraseña?': { en: 'Forgot your password?', he: 'שכחת את הסיסמה?' },
  'Escribe tu correo y te mandamos un enlace para crear una contraseña nueva.': {
    en: 'Write your email and we’ll send you a link to set a new password.',
    he: 'כתוב את האימייל שלך ונשלח לך קישור ליצירת סיסמה חדשה.',
  },
  'Crear mi cuenta': { en: 'Create my account', he: 'צור את החשבון שלי' },
  'Enviar enlace': { en: 'Send link', he: 'שלח קישור' },
  '¿Ya tienes cuenta?': { en: 'Already have an account?', he: 'כבר יש לך חשבון?' },
  'Olvidé mi contraseña': { en: 'I forgot my password', he: 'שכחתי את הסיסמה שלי' },
  '‹ Volver a entrar': { en: '‹ Back to log in', he: '‹ חזרה להתחברות' },
  'Puedes entrar a tu cuenta desde cualquier dispositivo, pero tus registros viven solo en el que los creó: expórtalos seguido desde Ajustes.': {
    en: 'You can log into your account from any device, but your entries only live on the one that created them: export them often from Settings.',
    he: 'אתה יכול להיכנס לחשבון שלך מכל מכשיר, אבל הרישומים שלך חיים רק במכשיר שיצר אותם: ייצא אותם לעיתים קרובות מההגדרות.',
  },
  'Modo de prueba: tu cuenta y tus registros se guardan solo en este dispositivo.': {
    en: 'Test mode: your account and entries are stored only on this device.',
    he: 'מצב ניסיון: החשבון והרישומים שלך נשמרים רק במכשיר הזה.',
  },
  Mínimo: { en: 'Minimum', he: 'מינימום' },
  'caracteres.': { en: 'characters.', he: 'תווים.' },
  Espera: { en: 'Wait', he: 'המתן' },
};

const CYCLE: Lang[] = ['es', 'en', 'he'];

/** El siguiente idioma en el ciclo ES → EN → HE → ES, para el botón de cambiarlo. */
export function nextLang(lang: Lang): Lang {
  return CYCLE[(CYCLE.indexOf(lang) + 1) % CYCLE.length];
}

/** Lo que muestra el botón de idioma (código corto) y su tooltip (a dónde cambia al tocarlo). */
export const LANG_LABEL: Record<Lang, string> = { es: 'ES', en: 'EN', he: 'עב' };
export function langSwitchTitle(lang: Lang): string {
  return `${LANG_LABEL[lang]} → ${LANG_LABEL[nextLang(lang)]}`;
}

/** Traduce un texto en español al idioma pedido. Si no está en el diccionario, se queda igual. */
export function translate(lang: Lang, es: string): string {
  if (lang === 'es') return es;
  return DICT[es]?.[lang] ?? es;
}

function currentLang(raw: string | undefined): Lang {
  return raw === 'en' || raw === 'he' ? raw : 'es';
}

/** Hook: `t('Texto en español')` según el idioma guardado en Ajustes. */
export function useT(): (es: string) => string {
  const lang = useZury((s) => currentLang(s.settings?.language));
  return useCallback((es: string) => translate(lang, es), [lang]);
}

/** Hook: el idioma actual, para el botón de cambiarlo. */
export function useLang(): Lang {
  return useZury((s) => currentLang(s.settings?.language));
}
