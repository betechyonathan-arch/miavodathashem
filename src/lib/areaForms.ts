/*
  FASE 2 — Formularios detallados por área.

  Cada área tiene un esquema declarativo de campos. En `+ REGISTRAR`, al elegir una
  categoría, aparece (plegable, opcional) su formulario. Lo que se rellena se guarda en
  `entry.fields`. El registro rápido por texto sigue funcionando sin tocar nada de esto.

  Los `key` son estables (se guardan en la base). Los rótulos pueden cambiar.
*/
import type { AreaId } from './db/schema';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'multiselect'
  | 'scale' // 0..10
  | 'bool'
  | 'chips' // etiquetas libres
  | 'time'; // HH:MM

export interface FieldDef {
  key: string;
  label: string;
  he?: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  min?: number;
  max?: number;
  unit?: string;
  hint?: string;
  group?: string; // encabezado visual (p. ej. Cantidad / Calidad / Esfuerzo)
}

// Reutilizables
const scale = (key: string, label: string, he?: string, hint?: string, group?: string): FieldDef => ({
  key,
  label,
  he,
  type: 'scale',
  min: 0,
  max: 10,
  hint,
  group,
});
const yesno = (key: string, label: string, he?: string, group?: string): FieldDef => ({
  key,
  label,
  he,
  type: 'bool',
  group,
});
const note = (key = 'notes', label = 'Notas'): FieldDef => ({ key, label, type: 'textarea' });

export const AREA_FORMS: Partial<Record<AreaId, FieldDef[]>> = {
  // ---------------- 14. TORÁ ----------------
  torah: [
    { key: 'kind', label: 'Tipo de estudio', he: 'סוג לימוד', type: 'select', group: 'Cantidad', options: ['Guemará', 'Mishná', 'Jumash', 'Halajá', 'Musar', 'Tanaj', 'Jok LeIsrael', 'Otro'] },
    { key: 'sefer', label: 'Sefer', he: 'ספר', type: 'text', group: 'Cantidad', placeholder: 'Ej. Bava Metzía, Mesilat Yesharim…' },
    { key: 'masejet', label: 'Masejet / Perek', he: 'מסכת', type: 'text', group: 'Cantidad' },
    { key: 'daf', label: 'Daf / Amud / lugar', he: 'דף', type: 'text', group: 'Cantidad' },
    { key: 'minutes', label: 'Duración', type: 'number', unit: 'min', min: 0, group: 'Cantidad' },
    { key: 'topic', label: 'Tema', he: 'נושא', type: 'text', group: 'Cantidad' },
    { key: 'seder', label: 'Seder', he: 'סדר', type: 'select', group: 'Cantidad', options: ['Seder Boker', 'Seder Tzohoraim', 'Seder Erev', 'Fuera de seder', 'Shiur'] },
    scale('concentration', 'Concentración', 'ריכוז', undefined, 'Calidad'),
    scale('understanding', 'Comprensión', 'הבנה', undefined, 'Calidad'),
    scale('quality', 'Calidad general', 'איכות', undefined, 'Calidad'),
    scale('effort', 'Esfuerzo (aunque no quisiera)', 'עמל', 'Cuánto me costó y aun así estudié', 'Esfuerzo'),
    yesno('review', '¿Fue repaso (jazará)?', 'חזרה', 'Extra'),
    yesno('chidushFlag', '¿Tuve un chidush?', 'חידוש', 'Extra'),
    { key: 'chidush', label: 'Chidush / idea', type: 'textarea', group: 'Extra' },
    note(),
  ],

  // ---------------- 15. TEFILÁ ----------------
  tefillah: [
    { key: 'which', label: 'Tefilá', he: 'תפילה', type: 'select', options: ['Shajarit', 'Minjá', 'Arvit', 'Musaf', 'Tikún Jatzot', 'Otra'] },
    yesno('done', '¿La recé?', 'התפללתי'),
    { key: 'withMinyan', label: 'Marco', he: 'מסגרת', type: 'select', options: ['Con minyán', 'Solo', 'Parte con minyán'] },
    { key: 'punctuality', label: 'Puntualidad', he: 'זמן', type: 'select', options: ['A tiempo / zman', 'Un poco tarde', 'Tarde', 'Fuera de zman'] },
    scale('kavana', 'Kavaná', 'כוונה'),
    scale('concentration', 'Concentración (poca distracción)', 'ריכוז'),
    scale('connection', 'Conexión sentida', 'חיבור'),
    { key: 'present', label: '¿Realmente estuve presente delante de Hashem?', type: 'textarea' },
    note(),
  ],

  // ---------------- 16. HASHEM ----------------
  hashem: [
    yesno('thoughtOfHim', 'Pensé en Hashem durante el día', 'חשבתי עליו'),
    yesno('thanked', 'Le agradecí', 'הודיתי'),
    yesno('askedHelp', 'Le pedí ayuda', 'ביקשתי עזרה'),
    yesno('feltClose', 'Sentí cercanía', 'קרבה'),
    yesno('feltDistance', 'Sentí distancia', 'ריחוק'),
    scale('awareness', 'Conciencia de Hashem durante el día', 'שיוויתי'),
    scale('connection', 'Conexión con Hashem', 'חיבור', '0 = nada · 10 = muy presente'),
    { key: 'special', label: 'Momento especial con Hashem', type: 'textarea' },
    note(),
  ],

  // ---------------- 17. EMUNÁ ----------------
  emunah: [
    { key: 'situation', label: 'Situación', he: 'מצב', type: 'textarea' },
    { key: 'thought', label: 'Qué pensé', he: 'מחשבה', type: 'textarea' },
    { key: 'emotion', label: 'Qué sentí', he: 'רגש', type: 'text' },
    { key: 'reaction', label: 'Cómo reaccioné', he: 'תגובה', type: 'textarea' },
    yesno('rememberedHashem', 'Recordé que todo es de Hashem'),
    scale('level', 'Nivel de Emuná en ese momento', 'רמת אמונה'),
    { key: 'learned', label: 'Qué aprendí', he: 'מה למדתי', type: 'textarea' },
  ],

  // ---------------- 18. BITAJÓN (hishtadlut vs. resultado) ----------------
  bitachon: [
    { key: 'situation', label: 'Situación', he: 'מצב', type: 'textarea', group: 'Situación' },
    { key: 'onMe', label: 'Qué dependía de mí (hishtadlut)', he: 'מה תלוי בי', type: 'textarea', group: 'Hishtadlut' },
    { key: 'didDo', label: 'Qué hice', he: 'מה עשיתי', type: 'textarea', group: 'Hishtadlut' },
    { key: 'notOnMe', label: 'Qué NO dependía de mí', he: 'מה לא תלוי בי', type: 'textarea', group: 'Resultado' },
    { key: 'triedControl', label: 'Qué intenté controlar de más', he: 'מה ניסיתי לשלוט', type: 'textarea', group: 'Resultado' },
    { key: 'outcome', label: 'Resultado', he: 'תוצאה', type: 'textarea', group: 'Resultado' },
    { key: 'reacted', label: 'Cómo reaccioné al resultado', he: 'איך הגבתי', type: 'textarea', group: 'Resultado' },
    scale('trust', 'Nivel de Bitajón', 'רמת ביטחון'),
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 19. MIDOT ----------------
  middot: [
    { key: 'middah', label: 'Midá', he: 'מידה', type: 'select', options: ['Kaas', 'Savlanut', 'Anavá', 'Gaavá', 'Kiná', 'Hakarat Hatov', 'Simjá', 'Chesed', 'Kavod', 'Neemanut', 'Zerizut', 'Atzlut', 'Emet', 'Shmirat HaLashon', 'Otra'] },
    { key: 'middahOther', label: 'Otra midá (si aplica)', type: 'text' },
    { key: 'situation', label: 'Situación', he: 'מצב', type: 'textarea' },
    { key: 'result', label: '¿Cómo salió?', type: 'select', options: ['Victoria — la vencí', 'Caída — me dominó', 'A medias', 'Normal / neutral'] },
    { key: 'reaction', label: 'Qué hice / dije', type: 'textarea' },
    scale('intensity', 'Intensidad de la prueba', 'עוצמה'),
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 20. KEDUSHÁ ----------------
  kedushah: [
    { key: 'context', label: 'Contexto', he: 'הקשר', type: 'textarea' },
    { key: 'trigger', label: 'Trigger / detonante', he: 'טריגר', type: 'textarea' },
    { key: 'thought', label: 'Pensamiento', type: 'text' },
    { key: 'emotion', label: 'Emoción', type: 'text' },
    { key: 'action', label: 'Qué hice', type: 'textarea' },
    { key: 'result', label: 'Resultado', type: 'select', options: ['Victoria', 'Caída', 'Normal'] },
    { key: 'durationMin', label: 'Duración (aprox.)', type: 'number', unit: 'min' },
    { key: 'recovery', label: 'Cómo me recuperé', he: 'התאוששות', type: 'textarea' },
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 21. SHMIRAT HALASHON (habla) ----------------
  speech: [
    { key: 'kind', label: 'Qué pasó', he: 'מה קרה', type: 'multiselect', options: ['Lashón Hará', 'Rechilut', 'Mentira', 'Exageración', 'Herí con palabras', 'Groserías', 'Hablé de más / innecesario', 'Guardé silencio', 'Frené una respuesta', 'Hablé bien de alguien', 'Defendí a alguien', 'Pedí perdón'] },
    { key: 'context', label: 'Contexto', type: 'textarea' },
    yesno('couldButHeld', '“Pude decirlo y me callé”', 'יכולתי ושתקתי'),
    { key: 'result', label: 'Balance', type: 'select', options: ['Victoria', 'Caída', 'Mixto', 'Neutral'] },
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 22. BEN ADAM LECHAVERO ----------------
  ben_adam: [
    { key: 'kind', label: 'Qué hice', type: 'multiselect', options: ['Chesed / ayuda', 'Respeto (Kavod)', 'Paciencia', 'Perdoné', 'Pedí perdón', 'Cumplí mi palabra', 'Traté bien a alguien', 'Escuché de verdad', 'Di el beneficio de la duda'] },
    { key: 'who', label: 'Con quién', he: 'עם מי', type: 'text', hint: 'Solo lo necesario; no guardar de más sobre terceros' },
    { key: 'what', label: 'Qué pasó', type: 'textarea' },
    yesno('gainedNothing', 'Era alguien que no necesitaba nada de mí'),
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 23. YERUSHALAYIM / GEULÁ ----------------
  yerushalayim: [
    { key: 'kind', label: 'Qué recordé / hice', type: 'multiselect', options: ['Recordé Yerushalayim', 'Recordé el Beit HaMikdash', 'Recordé a Mashíaj', 'Pensé en la Geulá', 'Pedí por la Geulá', 'Sentí געגוע (añoranza)'] },
    { key: 'when', label: 'Cuándo / a raíz de qué', type: 'textarea' },
    scale('longing', 'Intensidad de la añoranza', 'געגוע'),
    { key: 'note', label: '¿Viví hoy desde el recuerdo de Yerushalayim?', type: 'textarea' },
  ],

  // ---------------- 24. MITZVOT ----------------
  mitzvot: [
    { key: 'mitzvot', label: 'Mitzvot del día', he: 'מצוות', type: 'chips', hint: 'Comportamiento, no puntuación. Ej. Tefilín, Netilat Yadaim, Tzedaká, Berajot…' },
    { key: 'missed', label: 'Alguna que quería y no hice', type: 'text' },
    { key: 'note', label: 'Notas', type: 'textarea' },
  ],

  // ---------------- 25. MUSAR ----------------
  musar: [
    { key: 'sefer', label: 'Sefer', he: 'ספר', type: 'text' },
    { key: 'topic', label: 'Tema', he: 'נושא', type: 'text' },
    { key: 'idea', label: 'La idea', he: 'הרעיון', type: 'textarea' },
    yesno('applied', '¿Lo apliqué hoy?'),
    { key: 'changed', label: 'Qué cambió en mí', type: 'textarea' },
  ],

  // ---------------- 26. MÚSICA ----------------
  music: [
    { key: 'category', label: 'Categoría (tu criterio)', type: 'select', options: ['Kasher / contenido judío', 'Jilonim', 'Goim / artistas no judíos', 'Otra / no sé'] },
    { key: 'song', label: 'Canción', type: 'text' },
    { key: 'artist', label: 'Artista', type: 'text' },
    { key: 'minutes', label: 'Duración', type: 'number', unit: 'min' },
    { key: 'moment', label: 'Momento / contexto', type: 'text' },
    { key: 'reason', label: 'Por qué la puse', type: 'text' },
    { key: 'before', label: 'Cómo me sentí antes', type: 'text' },
    { key: 'after', label: 'Cómo me sentí después', type: 'text' },
    { key: 'effect', label: 'Efecto en mí (percepción)', type: 'select', options: ['Me acercó', 'Me alejó', 'Neutral'] },
  ],

  // ---------------- 27. VESTIMENTA ----------------
  clothing: [
    { key: 'outfit', label: 'Vestimenta', type: 'select', options: ['Camisa + pantalón', 'Playera + pantalón', 'Playera + pants', 'Ropa de casa', 'Ropa formal', 'Ropa de Shabat', 'Otro'] },
    { key: 'feeling', label: '¿Cómo me sentí?', type: 'select', options: ['Arreglado', 'Normal', 'Descuidado', 'Cómodo'] },
    { key: 'note', label: 'Notas', type: 'text' },
  ],

  // ---------------- 28. SUEÑO Y TIEMPO ----------------
  sleep: [
    { key: 'sleepTime', label: 'Hora de dormir', type: 'time' },
    { key: 'wakeTime', label: 'Hora de despertar', type: 'time' },
    { key: 'hours', label: 'Horas dormidas', type: 'number', unit: 'h', min: 0, max: 24 },
    scale('quality', 'Calidad del sueño', 'איכות'),
    scale('energy', 'Energía al despertar', 'אנרגיה'),
    { key: 'strongHours', label: 'Mis horas fuertes hoy', type: 'text' },
    { key: 'weakHours', label: 'Mis horas débiles hoy', type: 'text' },
    { key: 'wastedMin', label: 'Tiempo perdido (aprox.)', type: 'number', unit: 'min' },
  ],

  // ---------------- 29. TELÉFONO ----------------
  phone: [
    { key: 'screenMin', label: 'Tiempo de pantalla', type: 'number', unit: 'min' },
    { key: 'apps', label: 'Apps principales', type: 'chips' },
    scale('unnecessary', 'Uso innecesario (0 = nada, 10 = mucho)', undefined),
    { key: 'control', label: 'Momentos de control', type: 'textarea' },
    { key: 'loss', label: 'Momentos de pérdida de tiempo', type: 'textarea' },
  ],

  // ---------------- 30. EJERCICIO / NATURALEZA ----------------
  exercise: [
    { key: 'activity', label: 'Actividad', type: 'text' },
    { key: 'minutes', label: 'Duración', type: 'number', unit: 'min' },
    yesno('outdoors', 'Al aire libre'),
    scale('energyAfter', 'Energía después', 'אנרגיה'),
    { key: 'note', label: 'Notas', type: 'text' },
  ],
  nature: [
    { key: 'kind', label: 'Qué hice', type: 'multiselect', options: ['Caminé', 'Estuve al aire libre', 'Parque / campo', 'Montaña', 'Mar / agua', 'Miré el cielo'] },
    { key: 'minutes', label: 'Duración', type: 'number', unit: 'min' },
    { key: 'note', label: 'Cómo me sentí', type: 'textarea' },
  ],

  // ---------------- 31. TRABAJO ----------------
  work: [
    { key: 'hours', label: 'Horas de trabajo', type: 'number', unit: 'h', min: 0, max: 24 },
    scale('stress', 'Nivel de estrés', 'לחץ'),
    scale('energy', 'Energía', 'אנרגיה'),
    scale('frustration', 'Frustración', undefined),
    scale('satisfaction', 'Satisfacción', undefined),
    { key: 'conflicts', label: 'Conflictos', type: 'textarea' },
    { key: 'wins', label: 'Victorias en el trabajo', type: 'textarea' },
    { key: 'impact', label: 'Impacto percibido sobre mi Avodá', type: 'select', options: ['La ayudó', 'Neutral', 'La dificultó'] },
  ],

  // ---------------- 32. EMOCIONES ----------------
  emotion: [
    { key: 'emotions', label: 'Emociones', type: 'multiselect', options: ['Alegría', 'Tristeza', 'Enojo', 'Preocupación', 'Soledad', 'Tranquilidad', 'Energía', 'Frustración', 'Satisfacción', 'Conexión', 'Miedo', 'Gratitud'] },
    { key: 'extra', label: 'Otra emoción', type: 'text' },
    { key: 'trigger', label: 'A raíz de qué', type: 'textarea' },
    scale('intensity', 'Intensidad', 'עוצמה'),
  ],

  // ---------------- 33. PENSAMIENTOS ----------------
  thought: [
    { key: 'kind', label: 'Tipo', type: 'select', options: ['Recurrente', 'Preocupación', 'Deseo', 'Tentación', 'De Emuná', 'Positivo', 'Negativo'] },
    { key: 'thought', label: 'El pensamiento', type: 'textarea' },
    { key: 'occupied', label: 'Qué ocupó más mi mente hoy', type: 'text' },
    { key: 'didWith', label: 'Qué hice con él', type: 'textarea' },
  ],

  // ---------------- 34. PRUEBAS ----------------
  test: [
    { key: 'situation', label: 'Situación', type: 'textarea' },
    { key: 'whatTested', label: 'Qué se puso a prueba', type: 'text' },
    { key: 'felt', label: 'Qué sentí', type: 'text' },
    { key: 'did', label: 'Qué hice', type: 'textarea' },
    { key: 'result', label: 'Resultado', type: 'select', options: ['Victoria', 'Caída', 'A medias'] },
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 35. DECISIONES ----------------
  decision: [
    { key: 'decision', label: 'La decisión', type: 'textarea' },
    { key: 'options', label: 'Opciones que tenía', type: 'textarea' },
    { key: 'chose', label: 'Qué elegí', type: 'text' },
    { key: 'why', label: 'Por qué', type: 'textarea' },
    { key: 'outcome', label: 'Resultado', type: 'textarea' },
    yesno('again', '¿Volvería a elegir igual?'),
  ],

  // ---------------- 36. CAÍDAS ----------------
  fall: [
    { key: 'context', label: 'Contexto', type: 'textarea' },
    { key: 'trigger', label: 'Trigger', type: 'textarea' },
    { key: 'time', label: 'Hora (aprox.)', type: 'time' },
    { key: 'emotion', label: 'Emoción antes', type: 'text' },
    { key: 'thought', label: 'Pensamiento antes', type: 'text' },
    { key: 'action', label: 'Qué hice', type: 'textarea' },
    { key: 'durationMin', label: 'Duración', type: 'number', unit: 'min' },
    { key: 'areasAffected', label: 'Áreas afectadas', type: 'chips' },
    { key: 'learned', label: 'Qué aprendí (sin juicio)', type: 'textarea' },
  ],

  // ---------------- 37. VICTORIAS ----------------
  victory: [
    { key: 'kind', label: 'Tipo de victoria', type: 'select', options: ['Vencí una tentación', 'Controlé el Kaas', 'Estudié aunque no quería', 'Tefilá buena', 'Bitajón', 'Chesed', 'Recordé a Hashem', 'Guardé silencio', 'Regresé tras una caída', 'Otra'] },
    { key: 'what', label: 'Qué pasó', type: 'textarea' },
    { key: 'helped', label: 'Qué me ayudó a lograrlo', type: 'textarea' },
  ],

  // ---------------- 38. RECUPERACIÓN ----------------
  recovery: [
    { key: 'fromWhat', label: 'Tras qué caída / bajón', type: 'textarea' },
    { key: 'startedAt', label: 'Cuándo empezó el regreso', type: 'text' },
    { key: 'whatHelped', label: 'Qué ayudó', type: 'textarea' },
    { key: 'strategy', label: 'Estrategia que usé', type: 'textarea' },
    { key: 'durationHours', label: 'Cuánto tardé en volver', type: 'number', unit: 'h' },
    { key: 'learned', label: 'Qué aprendí', type: 'textarea' },
  ],

  // ---------------- 39. GRATITUD / SIMJÁ ----------------
  gratitude: [
    { key: 'forWhat', label: 'Algo bueno / que agradezco', type: 'textarea' },
    { key: 'fromHashem', label: 'Algo que Hashem me dio hoy', type: 'textarea' },
    scale('simcha', 'Nivel de Simjá', 'שמחה'),
    scale('satisfaction', 'Satisfacción con el día', undefined),
  ],
};

export function hasForm(area: AreaId): boolean {
  return !!AREA_FORMS[area]?.length;
}
