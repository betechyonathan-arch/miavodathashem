/*
  יומא דהילולא — yahrzeits de gedolei Yisrael, uno o varios por día del calendario
  hebreo. Le da vida al día: recuerda de quién es hoy la petirá.

  NO hay una API oficial de yahrzeits de rabanim (Hebcal solo hace yahrzeits
  personales). Esto es un DATASET CURADO, compilado de calendarios de hilulá
  ampliamente publicados (Chabad.org "this day", ArtScroll, comunidad de Hebcal,
  Wikipedia). El "sync al luaj" es real: el emparejamiento se hace contra la
  fecha hebrea que calcula @hebcal/core. Las fechas de la mayoría de los
  Ajaronim y modernos están bien documentadas; algunas de Rishonim son
  tradicionales o discutidas y van marcadas con `approx`.

  Para corregir o añadir: editar la lista de abajo. `m` = mes, `d` = día hebreo,
  `sec` = año secular de la petirá (opcional para figuras "tradicionales").
*/

export type HebMonthKey =
  | 'nisan' | 'iyyar' | 'sivan' | 'tamuz' | 'av' | 'elul'
  | 'tishrei' | 'cheshvan' | 'kislev' | 'tevet' | 'shvat'
  | 'adar' | 'adar1' | 'adar2';

export interface Yahrzeit {
  m: HebMonthKey;
  d: number;
  /** Año secular de la petirá. Ausente en figuras tradicionales (Tanaím, matriarcas). */
  sec?: number;
  /** Nombre común en español. */
  es: string;
  /** Nombre en hebreo. */
  he: string;
  /** Una línea: quién fue / su obra. */
  what: string;
  /** La fecha es tradicional o hay discrepancia entre fuentes. */
  approx?: boolean;
}

export const YAHRZEITS: Yahrzeit[] = [
  // ---------- Tishrei ----------
  { m: 'tishrei', d: 13, sec: 1837, es: 'Rav Akiva Eiger', he: 'רבי עקיבא איגר', what: 'Gadol haposkim de su generación; Gilyón haShas' },
  { m: 'tishrei', d: 14, sec: 1814, es: 'El Maguid de Kozhnitz', he: 'רבי ישראל הופשטיין', what: 'Avodat Yisrael; discípulo del Maguid de Mezritch', approx: true },
  { m: 'tishrei', d: 18, sec: 1810, es: 'Rav Najman de Breslev', he: 'רבי נחמן מברסלב', what: 'Fundó el jasidut Breslev; Likutei Moharán (Jol haMoed Sucot)' },
  { m: 'tishrei', d: 19, sec: 1797, es: 'El Gaón de Vilna', he: 'רבנו אליהו — הגר״א', what: 'El Gr״a; gigante del Talmud, la halajá y el musar' },
  { m: 'tishrei', d: 25, sec: 1809, es: 'Rav Levi Yitzjak de Berditchev', he: 'רבי לוי יצחק מברדיטשוב', what: 'Kedushat Levi; el "defensor de Israel"' },
  { m: 'tishrei', d: 25, sec: 1839, es: 'El Jatam Sofer', he: 'רבי משה סופר', what: 'Rav de Presburg; baluarte frente a la Reforma' },

  // ---------- Jeshván ----------
  { m: 'cheshvan', d: 3, sec: 1850, es: 'Rav Yisrael de Ruzhin', he: 'רבי ישראל מרוז׳ין', what: 'El "santo de Ruzhin"; fundó la dinastía', approx: true },
  { m: 'cheshvan', d: 3, sec: 2013, es: 'Rav Ovadia Yosef', he: 'רבי עובדיה יוסף', what: 'Yabía Omer; posek y líder del judaísmo sefaradí' },
  { m: 'cheshvan', d: 9, sec: 1939, es: 'Rav Shimon Shkop', he: 'רבי שמעון שקאפ', what: 'Sha’arei Yosher; rosh yeshivá de Grodno' },
  { m: 'cheshvan', d: 11, es: 'Rajel Imenu', he: 'רחל אמנו', what: 'La matriarca; "llora por sus hijos" (Yirmiyáhu 31)' },
  { m: 'cheshvan', d: 15, sec: 1953, es: 'El Jazón Ish', he: 'רבי אברהם ישעיהו קרליץ', what: 'Autoridad halájica de Bnei Brak' },
  { m: 'cheshvan', d: 16, sec: 2001, es: 'Rav Elazar Menajem Man Shaj', he: 'רבי אלעזר מנחם מן שך', what: 'Avi Ezri; líder del mundo de las yeshivot' },

  // ---------- Kislev ----------
  { m: 'kislev', d: 2, sec: 1962, es: 'Rav Aharón Kotler', he: 'רבי אהרן קוטלר', what: 'Fundó Bais Medrash Govoha (Lakewood)' },
  { m: 'kislev', d: 5, sec: 1939, es: 'Rav Baruj Ber Leibowitz', he: 'רבי ברוך בער ליבוביץ', what: 'Birkat Shmuel; rosh yeshivá de Kaminetz' },
  { m: 'kislev', d: 9, sec: 1827, es: 'El Mitteler Rebe', he: 'רבי דובער שניאורי', what: 'Segundo rebe de Jabad; nació y falleció el 9 de Kislev' },
  { m: 'kislev', d: 19, sec: 1772, es: 'El Maguid de Mezritch', he: 'רבי דב בער ממזריטש', what: 'Sucesor del Baal Shem Tov; formó a los grandes maestros jasídicos' },
  { m: 'kislev', d: 20, sec: 1980, es: 'Rav Yitzjak Hutner', he: 'רבי יצחק הוטנר', what: 'Pajad Yitzjak; rosh yeshivá de Jaim Berlin' },
  { m: 'kislev', d: 24, sec: 2017, es: 'Rav Aharón Leib Shteinman', he: 'רבי אהרן לייב שטיינמן', what: 'Ayelet haShajar; líder de la generación' },

  // ---------- Tevet ----------
  { m: 'tevet', d: 18, sec: 1841, es: 'Rav Tzvi Elimelej de Dinov', he: 'רבי צבי אלימלך מדינוב', what: 'Bnei Yissasjar' },
  { m: 'tevet', d: 20, sec: 1204, es: 'El Rambam', he: 'רבנו משה בן מימון', what: 'Mishné Torá y Moré Nevujim; "de Moshé a Moshé no hubo como Moshé"' },
  { m: 'tevet', d: 20, sec: 1880, es: 'Rav Yaakov Abujatzira', he: 'רבי יעקב אבוחצירא', what: 'El Abir Yaakov; tzadik de Marruecos, abuelo del Baba Sali' },
  { m: 'tevet', d: 24, sec: 1812, es: 'El Baal haTania', he: 'רבי שניאור זלמן מלאדי', what: 'Fundó Jabad; el Tania y el Shulján Aruj haRav' },
  { m: 'tevet', d: 24, sec: 1954, es: 'Rav Eliyahu Eliezer Dessler', he: 'רבי אליהו אליעזר דסלר', what: 'Mijtav meEliyahu; mashguíaj de Ponevezh' },
  { m: 'tevet', d: 27, sec: 1888, es: 'Rav Shimshón Rafael Hirsch', he: 'רבי שמשון רפאל הירש', what: 'Líder de la ortodoxia alemana; Torá im Dérej Éretz' },

  // ---------- Shvat ----------
  { m: 'shvat', d: 2, sec: 1800, es: 'Rav Zusha de Anipoli', he: 'רבי משולם זושא מאניפולי', what: 'Tzadik jasídico; hermano de Rav Elimelej de Lizhensk', approx: true },
  { m: 'shvat', d: 4, sec: 1984, es: 'El Baba Sali', he: 'רבי ישראל אבוחצירא', what: 'Tzadik y mekubal; nieto del Abir Yaakov' },
  { m: 'shvat', d: 5, sec: 1905, es: 'El Sfat Emet', he: 'רבי יהודה אריה ליב אלתר', what: 'Rebe de Gur; Sfat Emet sobre la Torá' },
  { m: 'shvat', d: 10, sec: 1950, es: 'Rav Yosef Yitzjak Schneersohn', he: 'רבי יוסף יצחק שניאורסאהן', what: 'Sexto rebe de Jabad (el Rayatz)' },
  { m: 'shvat', d: 22, sec: 1859, es: 'El Kotzker Rebe', he: 'רבי מנחם מנדל מקוצק', what: 'Buscó la verdad sin concesiones' },
  { m: 'shvat', d: 25, sec: 1883, es: 'Rav Yisrael Salanter', he: 'רבי ישראל ליפקין מסלנט', what: 'Fundador del movimiento de Musar' },
  { m: 'shvat', d: 29, sec: 1927, es: 'El Alter de Slabodka', he: 'רבי נתן צבי פינקל', what: 'Rav Natan Tzvi Finkel; "gadlut haadam"', approx: true },

  // ---------- Adar (en año bisiesto se observa en Adar Bet) ----------
  { m: 'adar', d: 1, sec: 1164, es: 'Rav Avraham ibn Ezra', he: 'רבי אברהם אבן עזרא', what: 'Comentarista de la Torá, gramático y poeta', approx: true },
  { m: 'adar', d: 7, es: 'Moshé Rabenu', he: 'משה רבנו', what: 'Nació y falleció el 7 de Adar; "nadie conoce su sepultura"' },
  { m: 'adar', d: 11, sec: 1806, es: 'El Jidá', he: 'רבי חיים יוסף דוד אזולאי', what: 'Shem haGuedolim; posek y bibliógrafo' },
  { m: 'adar', d: 11, sec: 1936, es: 'El Gaón de Rogatchov', he: 'רבי יוסף רוזין', what: 'Tzafnat Paanéaj; genio talmúdico único' },
  { m: 'adar', d: 13, sec: 1986, es: 'Rav Moshé Feinstein', he: 'רבי משה פיינשטיין', what: 'Igrot Moshé; posek de la generación en América' },
  { m: 'adar', d: 21, sec: 1787, es: 'Rav Elimelej de Lizhensk', he: 'רבי אלימלך מליז׳ענסק', what: 'Noam Elimelej' },

  // ---------- Adar Alef / Adar Bet (fechas propias de año bisiesto) ----------
  { m: 'adar1', d: 20, sec: 1995, es: 'Rav Shlomo Zalman Auerbach', he: 'רבי שלמה זלמן אוירבך', what: 'Minjat Shlomó; posek de Yerushalayim' },
  { m: 'adar1', d: 29, sec: 1986, es: 'Rav Yaakov Kamenetsky', he: 'רבי יעקב קמנצקי', what: 'Emet leYaakov; líder de Torá Vodaas' },
  { m: 'adar2', d: 13, sec: 2022, es: 'Rav Jaim Kanievsky', he: 'רבי חיים קנייבסקי', what: '"Sar haTorá"; autoridad halájica y masmid legendario' },

  // ---------- Nisán ----------
  { m: 'nisan', d: 13, sec: 1575, es: 'Rav Yosef Karo', he: 'רבי יוסף קארו', what: 'El Mejaber del Shulján Aruj; Beit Yosef' },
  { m: 'nisan', d: 17, sec: 2005, es: 'Rav Shlomó Wolbe', he: 'רבי שלמה וולבה', what: 'Alei Shur; gran maestro de musar de la generación' },
  { m: 'nisan', d: 18, sec: 1993, es: 'Rav Yosef Dov Soloveitchik', he: 'רבי יוסף דב סולובייצ׳יק', what: '"El Rav" de Boston; líder de la ortodoxia moderna' },
  { m: 'nisan', d: 25, sec: 1876, es: 'Rav Jaim Halberstam de Sanz', he: 'רבי חיים הלברשטם מצאנז', what: 'Divrei Jaim; fundó la dinastía de Sanz' },
  { m: 'nisan', d: 30, sec: 1620, es: 'Rav Jaim Vital', he: 'רבי חיים ויטאל', what: 'Principal discípulo del Arí; Etz Jaim', approx: true },

  // ---------- Iyar ----------
  { m: 'iyyar', d: 10, sec: 1103, es: 'El Rí״f', he: 'רבי יצחק אלפסי', what: 'Hiljot haRi״f; base del Shulján Aruj', approx: true },
  { m: 'iyyar', d: 14, es: 'Rav Meir Baal haNes', he: 'רבי מאיר בעל הנס', what: 'Tana; "Elokáh de Meir, respóndeme" (Pésaj Sheni)' },
  { m: 'iyyar', d: 17, sec: 1793, es: 'El Nodá biYehudá', he: 'רבי יחזקאל לנדא', what: 'Rav de Praga; Nodá biYehudá' },
  { m: 'iyyar', d: 18, es: 'Rashb״i', he: 'רבי שמעון בר יוחאי', what: 'Tana; el Zóhar. Lag baÓmer' },
  { m: 'iyyar', d: 18, sec: 1572, es: 'El Ramá', he: 'רבי משה איסרליש', what: 'La "mapá" del Shulján Aruj para ashkenazim' },

  // ---------- Siván ----------
  { m: 'sivan', d: 6, sec: 1760, es: 'El Baal Shem Tov', he: 'רבי ישראל בן אליעזר', what: 'Fundador del jasidut; falleció en Shavuot' },
  { m: 'sivan', d: 18, sec: 1936, es: 'Rav Yerujam Levovitz', he: 'רבי ירוחם ליבוביץ', what: 'El mashguíaj de Mir; Daat Jojmá uMusar', approx: true },

  // ---------- Tamuz ----------
  { m: 'tamuz', d: 3, sec: 1994, es: 'Rav Menajem Mendel Schneerson', he: 'רבי מנחם מענדל שניאורסון', what: 'El Rebe de Lubavitch; séptimo rebe de Jabad' },
  { m: 'tamuz', d: 4, sec: 1171, es: 'Rabenu Tam', he: 'רבנו יעקב בן מאיר', what: 'Nieto de Rashí; líder de los Baalei haTosafot', approx: true },
  { m: 'tamuz', d: 12, sec: 1941, es: 'Rav Eljanán Wasserman', he: 'רבי אלחנן וסרמן', what: 'Rosh yeshivá de Baranovich; Kovétz Shiurim (HY״D)' },
  { m: 'tamuz', d: 15, sec: 1743, es: 'El Or haJaim haKadosh', he: 'רבי חיים בן עטר', what: 'Or haJaim sobre la Torá' },
  { m: 'tamuz', d: 19, sec: 1998, es: 'Rav Ben Tzión Abba Shaul', he: 'רבי בן ציון אבא שאול', what: 'Or leTzión; rosh yeshivá de Porat Yosef' },
  { m: 'tamuz', d: 28, sec: 2012, es: 'Rav Yosef Shalom Elyashiv', he: 'רבי יוסף שלום אלישיב', what: 'Posek de la generación; líder del judaísmo jaredí' },
  { m: 'tamuz', d: 29, sec: 1105, es: 'Rashí', he: 'רבי שלמה יצחקי', what: 'El comentario indispensable de la Torá y el Talmud', approx: true },

  // ---------- Av ----------
  { m: 'av', d: 5, sec: 1572, es: 'El Arí haKadosh', he: 'רבי יצחק לוריא', what: 'El Arizal; padre de la Kabalá de Tzfat' },
  { m: 'av', d: 9, sec: 1815, es: 'El Jozé de Lublin', he: 'רבי יעקב יצחק הורוביץ', what: '"El vidente de Lublin" (Tishá beAv)', approx: true },
  { m: 'av', d: 20, sec: 1944, es: 'Rav Levi Yitzjak Schneerson', he: 'רבי לוי יצחק שניאורסון', what: 'Mekubal; padre del Rebe de Lubavitch' },
  { m: 'av', d: 21, sec: 1918, es: 'Rav Jaim Soloveitchik de Brisk', he: 'רבי חיים סולובייצ׳יק', what: 'Creó el "método de Brisk" en el estudio del Talmud' },
  { m: 'av', d: 23, sec: 1985, es: 'El Steipler', he: 'רבי יעקב ישראל קנייבסקי', what: 'Kehilot Yaakov; gigante de Torá de Bnei Brak' },
  { m: 'av', d: 26, sec: 1979, es: 'El Rebe de Satmar', he: 'רבי יואל טייטלבוים', what: 'Divrei Yoel; reconstruyó Satmar tras la Shoá' },
  { m: 'av', d: 28, sec: 1893, es: 'El Netziv', he: 'רבי נפתלי צבי יהודה ברלין', what: 'Rosh yeshivá de Volozhin; Haamek Davar' },

  // ---------- Elul ----------
  { m: 'elul', d: 3, sec: 1935, es: 'Rav Avraham Yitzjak haKohen Kook', he: 'רבי אברהם יצחק הכהן קוק', what: 'Primer rav jefe de Eretz Yisrael; Orot' },
  { m: 'elul', d: 4, sec: 1926, es: 'Rav Meir Simjá de Dvinsk', he: 'רבי מאיר שמחה מדווינסק', what: 'Or Saméaj y Méshej Jojmá' },
  { m: 'elul', d: 18, sec: 1609, es: 'El Maharal de Praga', he: 'רבי יהודה ליווא בן בצלאל', what: 'Gur Aryé; pensador, y la leyenda del Gólem' },
  { m: 'elul', d: 18, sec: 1654, es: 'El Tosafot Yom Tov', he: 'רבי יום טוב ליפמן הלר', what: 'Comentario clave a la Mishná', approx: true },
  { m: 'elul', d: 19, sec: 1932, es: 'Rav Yosef Jaim Sonnenfeld', he: 'רבי יוסף חיים זוננפלד', what: 'Líder del viejo yishuv de Yerushalayim' },
  { m: 'elul', d: 21, sec: 1764, es: 'Rav Yonatán Eybeschütz', he: 'רבי יהונתן אייבשיץ', what: 'Genio talmúdico; Urim veTumim', approx: true },
  { m: 'elul', d: 24, sec: 1933, es: 'El Jafétz Jaim', he: 'רבי ישראל מאיר הכהן', what: 'Jafétz Jaim (shmirat halashón) y Mishná Berurá' },
];

const MONTH_ALIASES: Record<string, HebMonthKey> = {
  nisan: 'nisan',
  iyar: 'iyyar', iyyar: 'iyyar',
  sivan: 'sivan',
  tamuz: 'tamuz', tammuz: 'tamuz',
  av: 'av',
  elul: 'elul',
  tishrei: 'tishrei', tishri: 'tishrei',
  cheshvan: 'cheshvan', marcheshvan: 'cheshvan', chesvan: 'cheshvan',
  kislev: 'kislev',
  tevet: 'tevet', teves: 'tevet',
  shvat: 'shvat', shevat: 'shvat',
  adar: 'adar',
  adari: 'adar1', adar1: 'adar1',
  adarii: 'adar2', adar2: 'adar2',
};

/** Normaliza el nombre de mes de @hebcal/core (p. ej. "Sh'vat", "Adar I") a una clave. */
export function normalizeHebMonth(name: string): HebMonthKey | null {
  const key = name.toLowerCase().replace(/[^a-z]/g, '');
  return MONTH_ALIASES[key] ?? null;
}

/**
 * Yahrzeits que caen hoy. `monthName` es el nombre del mes de @hebcal/core,
 * `day` el día hebreo, `isLeap` si el año hebreo actual es bisiesto.
 *
 * Regla para Adar: una petirá en "Adar" (año simple) se observa en Adar Bet en
 * año bisiesto. Adar Alef solo muestra las petirot fechadas explícitamente ahí.
 */
export function yahrzeitsForDay(monthName: string, day: number, isLeap: boolean): Yahrzeit[] {
  const m = normalizeHebMonth(monthName);
  if (!m) return [];

  const monthsToMatch: HebMonthKey[] = (() => {
    if (m === 'adar') return isLeap ? ['adar2'] : ['adar', 'adar1', 'adar2']; // año simple: reúne todo
    if (m === 'adar2') return ['adar', 'adar2'];
    if (m === 'adar1') return ['adar1'];
    return [m];
  })();

  return YAHRZEITS
    .filter((y) => y.d === day && monthsToMatch.includes(y.m))
    .sort((a, b) => (a.sec ?? 0) - (b.sec ?? 0));
}
