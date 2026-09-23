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

  // Menú (todo lo que hay)
  'Todo lo que hay': { en: 'Everything there is', he: 'כל מה שיש' },
  'Cada pantalla y cada opción de la app, en un solo lugar. Toca para ir directo.': {
    en: 'Every screen and every option in the app, in one place. Tap to jump right there.',
    he: 'כל מסך וכל אפשרות באפליקציה, במקום אחד. גע כדי לעבור ישירות.',
  },
  'El día': { en: 'The day', he: 'היום' },
  'Ver mi avodá': { en: 'See my avodah', he: 'לראות את העבודה שלי' },
  'Mi camino': { en: 'My path', he: 'הדרך שלי' },
  Ajustes: { en: 'Settings', he: 'הגדרות' },

  'Cómo usar la app': { en: 'How to use the app', he: 'איך להשתמש באפליקציה' },
  'Una guía corta de lo más importante y de cómo registrar.': {
    en: 'A short guide to the most important things and how to log.',
    he: 'מדריך קצר לדברים החשובים ביותר ואיך לרשום.',
  },
  'Registrar algo': { en: 'Log something', he: 'לרשום משהו' },
  'Texto, voz o campos por área. El sistema lo clasifica.': {
    en: 'Text, voice, or fields by area. The system classifies it.',
    he: 'טקסט, קול או שדות לפי תחום. המערכת מסווגת את זה.',
  },
  'Elige victoria/caída una vez y toca cada área — sin formulario, sin texto.': {
    en: 'Pick victory/fall once and tap each area — no form, no text.',
    he: 'בחר ניצחון/נפילה פעם אחת ותקש על כל תחום — בלי טופס, בלי טקסט.',
  },
  'Check-in de la mañana': { en: 'Morning check-in', he: "צ'ק-אין של הבוקר" },
  '4 preguntas cortas para entrar al día con un punto claro.': {
    en: '4 short questions to start the day with a clear point.',
    he: '4 שאלות קצרות כדי להיכנס ליום עם נקודה ברורה.',
  },
  'Cierre del día: solo te pregunta lo que falta.': {
    en: 'End of day: it only asks what’s missing.',
    he: 'סגירת היום: שואל רק מה חסר.',
  },
  'Ver el día de hoy': { en: 'See today', he: 'לראות את היום' },
  'Todos los registros de hoy, en orden.': { en: 'All of today’s entries, in order.', he: 'כל הרישומים של היום, בסדר.' },
  'Ahora, semana, mes y año. Cada número explica su “¿por qué?”.': {
    en: 'Now, week, month and year. Every number explains its “why”.',
    he: 'עכשיו, שבוע, חודש ושנה. כל מספר מסביר את ה"למה" שלו.',
  },
  Boletas: { en: 'Report cards', he: 'תעודות' },
  'Semanal, mensual y anual (en Rosh Hashaná): dónde estuviste bien y mal a detalle, un refuerzo y un musar. Exportables a PDF.': {
    en: 'Weekly, monthly and yearly (on Rosh Hashanah): where you did well and poorly in detail, a boost and a musar. Exportable to PDF.',
    he: 'שבועי, חודשי ושנתי (בראש השנה): איפה היית טוב ורע בפירוט, חיזוק ומוסר. ניתן לייצא ל-PDF.',
  },
  'Historia y búsqueda': { en: 'History and search', he: 'היסטוריה וחיפוש' },
  'Recorre y busca en todo tu historial, día por día.': {
    en: 'Browse and search your whole history, day by day.',
    he: 'עיין וחפש בכל ההיסטוריה שלך, יום אחר יום.',
  },
  'Comparar con antes': { en: 'Compare with before', he: 'להשוות עם קודם' },
  'Hoy vs. 7 / 30 / 90 días y años atrás; línea de vida.': {
    en: 'Today vs. 7 / 30 / 90 days and years back; life timeline.',
    he: 'היום מול 7 / 30 / 90 ימים ושנים אחורה; ציר חיים.',
  },
  'Calendario hebreo': { en: 'Hebrew calendar', he: 'לוח שנה עברי' },
  'Zmanim, parashá, cuentas regresivas, omer y yahrzeits.': {
    en: 'Zmanim, parasha, countdowns, omer and yahrzeits.',
    he: 'זמנים, פרשה, ספירות לאחור, ספירת העומר ויארצייטים.',
  },
  'Las 27 áreas': { en: 'The 27 areas', he: '27-ה תחומים' },
  'Qué es cada área, su fuente y qué contar en ella.': {
    en: 'What each area is, its source, and what to count in it.',
    he: 'מה זה כל תחום, המקור שלו ומה לספור בו.',
  },
  'Torá — biblioteca de Sefaria': { en: 'Torah — Sefaria library', he: 'תורה — ספריית ספריא' },
  'Parashá, Pirkei Avot, Mishná, Guemará y Halajá con miles de pirushim enlazados. Lo de hoy y buscador.': {
    en: 'Parasha, Pirkei Avot, Mishnah, Gemara and Halacha with thousands of linked commentaries. Today’s reading and a search.',
    he: 'פרשה, פרקי אבות, משנה, גמרא והלכה עם אלפי פירושים מקושרים. הקריאה של היום וחיפוש.',
  },
  Musar: { en: 'Musar', he: 'מוסר' },
  'Frases al hueso elegidas por el día de hoy, con su fuente. Temas, favoritas y seder breve.': {
    en: 'Straight-to-the-point lines picked for today, with their source. Themes, favorites and a short seder.',
    he: 'משפטים ישירים שנבחרו להיום, עם המקור שלהם. נושאים, מועדפים וסדר קצר.',
  },
  'Ser Yehudí — el círculo': { en: 'Being a Whole Jew — the circle', he: 'להיות יהודי שלם — המעגל' },
  'El círculo exacto: catálogo de halajot y jumrot + constancia de por vida − caídas. Kabalot de crecimiento.': {
    en: 'The exact circle: catalog of halachot and jumrot + lifetime consistency − falls. Growth commitments.',
    he: 'המעגל המדויק: קטלוג הלכות וחומרות + עקביות לכל החיים פחות נפילות. קבלות לצמיחה.',
  },
  'Retar a alguien (privado) o unirte a uno público. Con o sin nombre, según el género de quienes participan.': {
    en: 'Challenge someone (private) or join a public one. With or without a name, depending on the gender of who’s taking part.',
    he: 'לאתגר מישהו (פרטי) או להצטרף לאתגר ציבורי. עם או בלי שם, לפי המגדר של המשתתפים.',
  },
  'Cadenas de Tehilim': { en: 'Tehilim chains', he: 'שרשראות תהלים' },
  'Organiza o súmate: entre todos se completan los 150 capítulos por un motivo.': {
    en: 'Organize or join: together you complete all 150 chapters for a reason.',
    he: 'ארגן או הצטרף: יחד משלימים את 150 הפרקים למען מטרה.',
  },
  'Cómo usar Retos': { en: 'How to use Challenges', he: 'איך להשתמש באתגרים' },
  'Privacidad, cómo invitar y cómo funciona ver los nombres solo si ambos aceptan.': {
    en: 'Privacy, how to invite, and how seeing names only if both agree works.',
    he: 'פרטיות, איך להזמין, ואיך עובד לראות שמות רק אם שניהם מסכימים.',
  },
  'Mis kabalot': { en: 'My commitments', he: 'הקבלות שלי' },
  'Crea tus compromisos con fecha: qué cuidar o hacer, y cuántos días. Con sugerencias para ti. Bli neder.': {
    en: 'Create your dated commitments: what to keep or do, and for how many days. With suggestions for you. Bli neder.',
    he: 'צור את ההתחייבויות שלך עם תאריך: מה לשמור או לעשות, ולכמה ימים. עם הצעות בשבילך. בלי נדר.',
  },
  'Misión de vida': { en: 'Life mission', he: 'שליחות החיים' },
  'Tu identidad, tu para qué, tu midá principal.': {
    en: 'Your identity, your purpose, your main midah.',
    he: 'הזהות שלך, המטרה שלך, המידה העיקרית שלך.',
  },
  'Etapas de vida': { en: 'Life stages', he: 'שלבי חיים' },
  'Define y compara las etapas por las que vas pasando.': {
    en: 'Define and compare the stages you’re going through.',
    he: 'הגדר והשווה את השלבים שאתה עובר.',
  },
  Metas: { en: 'Goals', he: 'מטרות' },
  'Del día a la semana, al mes, al año, a la misión.': {
    en: 'From the day to the week, the month, the year, the mission.',
    he: 'מהיום לשבוע, לחודש, לשנה, לשליחות.',
  },
  'Mitzvot de la mujer': { en: 'Women’s mitzvot', he: 'מצוות הנשים' },
  'Jalá, velas, taharat hamishpajá, kisui rosh, tu cocina, tu casa y tu oración: las tuyas, explicadas.': {
    en: 'Challah, candles, taharat hamishpacha, kisui rosh, your kitchen, your home and your prayer: yours, explained.',
    he: 'חלה, נרות, טהרת המשפחה, כיסוי ראש, המטבח שלך, הבית שלך והתפילה שלך: שלך, מוסברות.',
  },
  'Mitzvot que sigo': { en: 'Mitzvot I keep', he: 'מצוות שאני שומר' },
  'El catálogo que eliges seguir cada día.': { en: 'The catalog you choose to follow every day.', he: 'הקטלוג שאתה בוחר לעקוב אחריו כל יום.' },
  'Caídas que vigilo': { en: 'Falls I track', he: 'נפילות שאני עוקב אחריהן' },
  'Lo que le pides al sistema que cuente y te confronte.': {
    en: 'What you ask the system to count and confront you on.',
    he: 'מה שאתה מבקש מהמערכת לספור ולהתעמת איתך עליו.',
  },
  Ubicación: { en: 'Location', he: 'מיקום' },
  'Coordenadas para zmanim y el límite del día.': {
    en: 'Coordinates for zmanim and the day boundary.',
    he: 'קואורדינטות לזמנים ולגבול היום.',
  },
  'Límite del día judío': { en: 'Jewish day boundary', he: 'גבול היום היהודי' },
  'Shkiá o tzet, ángulo, y corrección manual de hoy.': {
    en: 'Sunset or nightfall, angle, and a manual correction for today.',
    he: 'שקיעה או צאת הכוכבים, זווית, ותיקון ידני להיום.',
  },
  Ambiente: { en: 'Appearance', he: 'מראה' },
  'Tema día / noche y modo Shabat.': { en: 'Day/night theme and Shabbat mode.', he: 'ערכת נושא יום/לילה ומצב שבת.' },
  'Exigencia del sistema': { en: 'System strictness', he: 'רמת הדרישה של המערכת' },
  'Suave, firme o exigente. Nunca te condena.': {
    en: 'Gentle, firm, or demanding. It never condemns you.',
    he: 'רך, תקיף או תובעני. הוא לעולם לא מרשיע אותך.',
  },
  '3 avisos al día a las horas que elijas.': { en: '3 alerts a day at the times you choose.', he: '3 התראות ביום בשעות שתבחר.' },
  'Instalar la app': { en: 'Install the app', he: 'התקן את האפליקציה' },
  'Ábrela como una app en tu teléfono y protege mejor tus datos. Android, iPhone y computadora.': {
    en: 'Open it like an app on your phone and better protect your data. Android, iPhone and computer.',
    he: 'פתח אותה כאפליקציה בטלפון שלך והגן טוב יותר על הנתונים שלך. אנדרואיד, אייפון ומחשב.',
  },
  'Módulo de IA': { en: 'AI module', he: 'מודול בינה מלאכותית' },
  'Opcional, invisible: clasifica y resume. Sin chatbot.': {
    en: 'Optional, invisible: classifies and summarizes. No chatbot.',
    he: 'אופציונלי, בלתי נראה: מסווג ומסכם. בלי צ׳אטבוט.',
  },
  'Copia en la nube': { en: 'Cloud backup', he: 'גיבוי בענן' },
  'Respaldo y puente entre tus dispositivos.': { en: 'Backup and a bridge between your devices.', he: 'גיבוי וגשר בין המכשירים שלך.' },
  Administración: { en: 'Administration', he: 'ניהול' },
  'Cuentas, actividad y aportes por aprobar. Nunca muestra lo que cada persona registra.': {
    en: 'Accounts, activity, and submissions to approve. Never shows what each person logs.',
    he: 'חשבונות, פעילות ותרומות לאישור. לעולם לא מציג מה כל אחד רושם.',
  },
  'Exportar, importar, borrar': { en: 'Export, import, delete', he: 'ייצוא, ייבוא, מחיקה' },
  'Tus datos son tuyos. Expórtalos seguido.': { en: 'Your data is yours. Export it often.', he: 'הנתונים שלך שייכים לך. ייצא אותם לעיתים קרובות.' },

  // Ajustes (Settings)
  'Día judío': { en: 'Jewish day', he: 'יום יהודי' },
  IA: { en: 'AI', he: 'בינה' },
  Nube: { en: 'Cloud', he: 'ענן' },
  Cuenta: { en: 'Account', he: 'חשבון' },
  Datos: { en: 'Data', he: 'נתונים' },
  Instalar: { en: 'Install', he: 'התקנה' },
  'Ubicación (cálculos halájicos)': { en: 'Location (halachic calculations)', he: 'מיקום (חישובים הלכתיים)' },
  'Usar mi ubicación actual': { en: 'Use my current location', he: 'השתמש במיקום הנוכחי שלי' },
  'Musar — frases al hueso': { en: 'Musar — straight to the point', he: 'מוסר — ישר לעניין' },
  'Sincronizar ahora': { en: 'Sync now', he: 'סנכרן עכשיו' },
  'Tu cuenta': { en: 'Your account', he: 'החשבון שלך' },
  'Abrir el panel de administración ›': { en: 'Open the admin panel ›', he: '‹ פתח את פאנל הניהול' },
  'Cerrar sesión': { en: 'Log out', he: 'התנתק' },
  'Tus datos': { en: 'Your data', he: 'הנתונים שלך' },
  'Exportar todo (JSON)': { en: 'Export everything (JSON)', he: '(ייצוא הכול (JSON' },
  Importar: { en: 'Import', he: 'ייבוא' },
  Fusionar: { en: 'Merge', he: 'מיזוג' },
  Reemplazar: { en: 'Replace', he: 'החלפה' },
  'Borrar todo': { en: 'Delete everything', he: 'מחק הכול' },
  'Nombre para mostrar (privado, solo en tu dispositivo)': {
    en: 'Display name (private, only on your device)',
    he: 'שם לתצוגה (פרטי, רק במכשיר שלך)',
  },
  Etiqueta: { en: 'Label', he: 'תווית' },
  Latitud: { en: 'Latitude', he: 'קו רוחב' },
  Longitud: { en: 'Longitude', he: 'קו אורך' },
  'Zona horaria (tzid)': { en: 'Time zone (tzid)', he: '(אזור זמן (tzid' },
  'Elevación (m)': { en: 'Elevation (m)', he: '(גובה (מ' },
  'Estoy en Eretz Israel (afecta Yom Tov de un día vs. dos)': {
    en: 'I’m in Eretz Israel (affects one-day vs. two-day Yom Tov)',
    he: '(אני בארץ ישראל (משפיע על יום טוב של יום אחד מול יומיים',
  },
  'Tema día / noche': { en: 'Day / night theme', he: 'ערכת נושא יום / לילה' },
  'Modo Shabat: la app no pide nada en Shabat/Yom Tov': {
    en: 'Shabbat mode: the app asks nothing on Shabbat/Yom Tov',
    he: 'מצב שבת: האפליקציה לא מבקשת כלום בשבת/יום טוב',
  },
  '¿Qué tan duro contigo?': { en: 'How hard on yourself?', he: '?כמה קשה כלפי עצמך' },
  '¿Cuánta presencia?': { en: 'How much presence?', he: '?כמה נוכחות' },

  // Misión (Mission)
  'Mi misión': { en: 'My mission', he: 'השליחות שלי' },
  Identidad: { en: 'Identity', he: 'זהות' },
  Etapas: { en: 'Stages', he: 'שלבים' },
  '¿En quién me estoy intentando convertir?': { en: 'Who am I trying to become?', he: '?למי אני מנסה להפוך' },
  Visión: { en: 'Vision', he: 'חזון' },
  Valores: { en: 'Values', he: 'ערכים' },
  'Objetivos espirituales generales': { en: 'General spiritual goals', he: 'מטרות רוחניות כלליות' },
  'Midá principal (etapa actual)': { en: 'Main midah (current stage)', he: '(מידה עיקרית (שלב נוכחי' },
  'Mitzvot que quiero seguir': { en: 'Mitzvot I want to keep', he: 'מצוות שאני רוצה לשמור' },
  'Añadir otra mitzvá…': { en: 'Add another mitzvah…', he: '…הוסף מצווה נוספת' },
  'Se registra comportamiento, no una puntuación.': { en: 'It logs behavior, not a score.', he: 'זה רושם התנהגות, לא ניקוד.' },
  'Caídas que quiero vigilar': { en: 'Falls I want to watch', he: 'נפילות שאני רוצה לעקוב אחריהן' },
  'Añadir otra caída a vigilar…': { en: 'Add another fall to watch…', he: '…הוסף נפילה נוספת לעקוב אחריה' },
  'El sistema las cuenta y te pide el regreso. Nunca te juzga ni da psak (§60).': {
    en: 'The system counts them and asks you to return. It never judges you or gives a psak (§60).',
    he: 'המערכת סופרת אותן ומבקשת ממך לחזור. היא לעולם לא שופטת אותך ולא פוסקת הלכה (§60).',
  },
  'Guardado ✓': { en: 'Saved ✓', he: 'נשמר ✓' },
  Guardar: { en: 'Save', he: 'שמור' },
  'Las 27 áreas de la avodá': { en: 'The 27 areas of avodah', he: 'עשרים ושבעה תחומי העבודה' },
  'Qué es cada área, su fuente (pasuk / Chazal / Rambam) y qué cuenta como registro. →': {
    en: 'What each area is, its source (pasuk / Chazal / Rambam) and what counts as an entry. →',
    he: '(מה זה כל תחום, המקור שלו (פסוק / חז"ל / רמב"ם) ומה נחשב לרישום. ←',
  },
  'La jerarquía completa está en las pestañas': { en: 'The full hierarchy is in the', he: 'ההיררכיה המלאה נמצאת בלשוניות' },

  // Historia (History)
  'Tu historia': { en: 'Your history', he: 'ההיסטוריה שלך' },
  Días: { en: 'Days', he: 'ימים' },
  Comparar: { en: 'Compare', he: 'השוואה' },
  'Buscar en todo: Bitajón, Kaas, Yerushalayim, una frase…': {
    en: 'Search everything: Bitajon, Kaas, Yerushalayim, a phrase…',
    he: '…חפש בהכול: ביטחון, כעס, ירושלים, משפט',
  },
  'Todas las áreas': { en: 'All areas', he: 'כל התחומים' },
  Todo: { en: 'All', he: 'הכול' },
  '🟢 Victorias': { en: '🟢 Victories', he: '🟢 ניצחונות' },
  '🔴 Caídas': { en: '🔴 Falls', he: '🔴 נפילות' },
  '🔄 Recuperación': { en: '🔄 Recovery', he: '🔄 התאוששות' },
  'reg.': { en: 'entries', he: 'רש׳' },
  'Todavía no hay días registrados. Empieza hoy.': { en: 'No days logged yet. Start today.', he: 'עדיין אין ימים רשומים. התחל היום.' },
  'Hoy vs. el pasado': { en: 'Today vs. the past', he: 'היום מול העבר' },
  'Aún no hay historial para comparar. Con el tiempo verás hoy junto a hace 1 mes, 1 año, 5 años…': {
    en: 'There’s no history to compare yet. Over time you’ll see today next to 1 month, 1 year, 5 years ago…',
    he: 'עדיין אין היסטוריה להשוואה. עם הזמן תראה את היום לצד לפני חודש, שנה, 5 שנים…',
  },
  registros: { en: 'entries', he: 'רישומים' },
  'min Torá': { en: 'min Torah', he: 'דק׳ תורה' },
  ánimo: { en: 'mood', he: 'מצב רוח' },
  'ver ese día →': { en: 'see that day →', he: '← ראה את היום ההוא' },
  'Línea de vida': { en: 'Life timeline', he: 'קו החיים' },
  'Registros por mes en todo tu historial.': { en: 'Entries per month across your whole history.', he: 'רישומים לחודש בכל ההיסטוריה שלך.' },

  // Mujer (Women's mitzvot)
  'Esta sección es para las mujeres. Si tu cuenta tiene el género mal puesto, cámbialo en': {
    en: 'This section is for women. If your account has the wrong gender set, change it in',
    he: 'הקטע הזה מיועד לנשים. אם המגדר בחשבון שלך שגוי, שנה אותו ב',
  },
  'La Torá y los Sabios le confían a la mujer mitzvot muy especiales, y su vida diaria (la casa, la cocina, la familia, la espera, la oración desde el corazón) está llena de avodat Hashem. Aquí están; suma a tu lista de hoy las que sientas tuyas.': {
    en: 'The Torah and the Sages entrust women with very special mitzvot, and her daily life (the home, the kitchen, the family, waiting, prayer from the heart) is full of avodat Hashem. Here they are; add to your list for today the ones you feel are yours.',
    he: 'התורה והחכמים מפקידים בידי האישה מצוות מיוחדות מאוד, וחיי היומיום שלה (הבית, המטבח, המשפחה, ההמתנה, התפילה מהלב) מלאים בעבודת ה׳. הנה הן; הוסיפי לרשימה של היום את אלה שמרגישות לך שייכות.',
  },
  '✓ En mi lista de hoy': { en: '✓ On my list for today', he: '✓ ברשימה שלי להיום' },
  'Sumar a mi lista de hoy': { en: 'Add to my list for today', he: 'הוסף לרשימה שלי להיום' },
  'Es una guía general basada en el Shulján Aruj. En lo que aplica a tu vida y a las costumbres de tu comunidad (kisui rosh, taharat hamishpajá, tzniut), consulta siempre a tu rav.': {
    en: 'This is a general guide based on the Shulchan Aruch. For what applies to your life and your community’s customs (kisui rosh, taharat hamishpacha, tzniut), always consult your rav.',
    he: 'זהו מדריך כללי המבוסס על השולחן ערוך. במה שנוגע לחייך ולמנהגי הקהילה שלך (כיסוי ראש, טהרת המשפחה, צניעות), תמיד התייעצי עם הרב שלך.',
  },

  // Ser Yehudí (Yehudi)
  Sí: { en: 'Yes', he: 'כן' },
  'A veces': { en: 'Sometimes', he: 'לפעמים' },
  'Todavía no': { en: 'Not yet', he: 'עדיין לא' },
  halajá: { en: 'halacha', he: 'הלכה' },
  jumrá: { en: 'chumra', he: 'חומרה' },
  hiddur: { en: 'hiddur', he: 'הידור' },
  'Ser Yehudí — punto de partida': { en: 'Being a Whole Jew — starting point', he: 'להיות יהודי שלם — נקודת ההתחלה' },
  'El círculo «ser Yehudí al 100%» mide, con exactitud y sin adornos, cuánto de la vara sostienes: todas las halajot y las jumrot, con actividad real, menos las caídas recientes. No es un veredicto sobre tu alma; es el camino y lo que sigue. Primero dime qué cuidas hoy — de ahí partimos.': {
    en: 'The "being a Whole Jew at 100%" circle measures, exactly and without embellishment, how much of the bar you hold: every halacha and chumra, with real activity, minus recent falls. It is not a verdict on your soul; it is the road and what comes next. First tell me what you keep today — that is where we start.',
    he: 'המעגל של "להיות יהודי שלם ב-100%" מודד, בדיוק וללא ייפוי, כמה מהרף אתה מחזיק: כל ההלכות והחומרות, עם פעילות אמיתית, פחות הנפילות האחרונות. זה לא פסק דין על נשמתך; זה הדרך ומה שבא אחריה. קודם ספר לי במה אתה שומר היום — משם מתחילים.',
  },
  'Guardar y ver mi círculo': { en: 'Save and see my circle', he: 'שמור וראה את המעגל שלי' },
  'Lo que dejes sin marcar cuenta como «todavía no». Puedes ajustarlo cuando quieras.': {
    en: 'Whatever you leave unmarked counts as "not yet". You can adjust it whenever you want.',
    he: 'מה שתשאיר לא מסומן נחשב כ"עדיין לא". תוכל להתאים זאת מתי שתרצה.',
  },
  'Revisar el catálogo': { en: 'Review the catalog', he: 'סקור את הקטלוג' },
  'Marca honestamente. «Sí» solo cuenta pleno si además hay actividad reciente en esa área.': {
    en: 'Mark honestly. "Yes" only counts in full if there is also recent activity in that area.',
    he: 'סמן ביושר. "כן" נחשב במלואו רק אם יש גם פעילות אחרונה בתחום הזה.',
  },
  Listo: { en: 'Done', he: 'סיימתי' },
  'Ser Yehudí — el círculo exacto': { en: 'Being a Whole Jew — the exact circle', he: 'להיות יהודי שלם — המעגל המדויק' },
  'El camino recorrido': { en: 'The road so far', he: 'הדרך שעברתי' },
  'El 100% es todas las halajot y las jumrot, sostenidas con actividad real, sin caídas. Es una vara alta a propósito. No es un juicio sobre ti: es lo que falta del camino.': {
    en: 'The 100% is every halacha and chumra, kept with real activity, with no falls. It is a high bar on purpose. It is not a judgment on you: it is what remains of the road.',
    he: 'ה-100% הם כל ההלכות והחומרות, מוחזקות בפעילות אמיתית, ללא נפילות. זהו רף גבוה בכוונה. זה לא שיפוט עליך: זה מה שנותר מהדרך.',
  },
  '¿Por qué ese número?': { en: 'Why that number?', he: 'למה המספר הזה?' },
  ocultar: { en: 'hide', he: 'הסתר' },
  ver: { en: 'show', he: 'הצג' },
  Total: { en: 'Total', he: 'סה"כ' },
  'Catálogo hasta +88 · constancia de por vida hasta +12 (meta 600 registros) · las caídas de 30 días recortan el avance hasta un 30%, nunca a cero. Cuenta más el principio del camino, para que se mueva desde el primer paso. La caída se responde con el regreso, no con culpa (§60).': {
    en: 'Catalog up to +88 · lifetime consistency up to +12 (goal: 600 entries) · falls in the last 30 days trim progress by up to 30%, never to zero. The start of the road counts for more, so it moves from the very first step. A fall is answered with the return, not with guilt (§60).',
    he: 'קטלוג עד +88 · עקביות לכל החיים עד +12 (יעד 600 רישומים) · נפילות של 30 יום מקצצות מההתקדמות עד 30%, לעולם לא לאפס. תחילת הדרך נחשבת יותר, כדי שהתנועה תתחיל מהצעד הראשון. לנפילה עונים בחזרה, לא באשמה (§60).',
  },
  'Kabalot de crecimiento': { en: 'Growth commitments', he: 'קבלות לצמיחה' },
  'El sistema te propone (de tu área más floja, lo más alcanzable):': {
    en: 'The system suggests (from your weakest area, the most reachable):',
    he: 'המערכת מציעה (מהתחום החלש ביותר שלך, הבר-השגה ביותר):',
  },
  'Tu propia kabalá': { en: 'Your own commitment', he: 'הקבלה שלך' },
  'Algo concreto que aceptas sostener…': { en: 'Something concrete you commit to keep…', he: 'משהו קונקרטי שאתה מתחייב לשמור…' },
  '(sin área)': { en: '(no area)', he: '(ללא תחום)' },
  Agregar: { en: 'Add', he: 'הוסף' },
  sostenida: { en: 'kept', he: 'נשמרה' },
  'se rompió': { en: 'broken', he: 'נשברה' },
  aceptada: { en: 'accepted', he: 'התקבלה' },
  ' · propia': { en: ' · own', he: ' · שלי' },
  'La sostengo': { en: 'I keep it', he: 'אני שומר' },
  'Se rompió': { en: 'It broke', he: 'היא נשברה' },
  Archivar: { en: 'Archive', he: 'העבר לארכיון' },
  'Aún no aceptas ninguna kabalá. Acepta una propuesta o escribe la tuya.': {
    en: 'You haven’t accepted any commitment yet. Accept a suggestion or write your own.',
    he: 'עדיין לא קיבלת אף קבלה. קבל הצעה או כתוב משלך.',
  },
  'Registro de toda la app': { en: 'Whole-app record', he: 'רישום כל האפליקציה' },
  Registros: { en: 'Entries', he: 'רישומים' },
  'Días registrados': { en: 'Days logged', he: 'ימים שנרשמו' },
  Victorias: { en: 'Victories', he: 'ניצחונות' },
  Caídas: { en: 'Falls', he: 'נפילות' },
  Recuperaciones: { en: 'Recoveries', he: 'התאוששויות' },
  'Minutos de Torá': { en: 'Minutes of Torah', he: 'דקות תורה' },
  'Kabalot sostenidas': { en: 'Commitments kept', he: 'קבלות שנשמרו' },
  '% del catálogo': { en: '% of catalog', he: '% מהקטלוג' },
  'Revisar el catálogo de halajot y jumrot': { en: 'Review the catalog of halachot and chumrot', he: 'סקור את הקטלוג של ההלכות והחומרות' },
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
