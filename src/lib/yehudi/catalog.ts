/*
  יהודי שלם — catálogo de halajot y jumrot.

  Es la base del círculo "ser Yehudí al 100%". Cada ítem es algo concreto que se
  cuida o no se cuida; el círculo mide cuánto del catálogo sostienes de verdad
  (con actividad reciente en su área), más tu constancia de por vida, menos las
  caídas recientes.

  `level`:
   - halacha : din, obligatorio
   - jumra   : estringencia aceptada (más exigente)
   - hiddur  : embellecimiento de la mitzvá
  `weight`: cuánto pesa en el círculo (halacha pesa más; el 100% pide TODO).
  `area`: para agrupar y para el decaimiento por falta de actividad reciente.

  No es una lista cerrada de "lo que hace a un judío"; es una vara alta y
  explícita que el usuario mismo va calibrando. Nunca es un veredicto (§60).
*/
import type { AreaId } from '../db/schema';
import { forGender, type GenderTagged } from '../gender';

export type YehudiLevel = 'halacha' | 'jumra' | 'hiddur';

export interface YehudiItem extends GenderTagged {
  id: string;
  area: AreaId;
  he: string;
  es: string;
  level: YehudiLevel;
  weight: number;
  source?: string;
  sourceEs?: string;
}

export const YEHUDI_GROUPS: { area: AreaId; he: string; es: string }[] = [
  { area: 'tefillah', he: 'תְּפִלָּה וּבְרָכוֹת', es: 'Tefilá y berajot' },
  { area: 'torah', he: 'תַּלְמוּד תּוֹרָה', es: 'Torá' },
  { area: 'mitzvot', he: 'שַׁבָּת', es: 'Shabat' },
  { area: 'kedushah', he: 'כַּשְׁרוּת וּקְדֻשַּׁת הַגּוּף', es: 'Kashrut y kedushá del cuerpo' },
  { area: 'speech', he: 'שְׁמִירַת הַלָּשׁוֹן', es: 'Shmirat haLashón' },
  { area: 'ben_adam', he: 'בֵּין אָדָם לַחֲבֵרוֹ', es: 'Ben adam lajaveró' },
  { area: 'middot', he: 'מִדּוֹת', es: 'Midot' },
  { area: 'emunah', he: 'אֱמוּנָה וּבִטָּחוֹן', es: 'Emuná y bitajón' },
  { area: 'hashem', he: 'יִרְאַת שָׁמַיִם', es: 'Irat Shamáyim' },
  { area: 'yerushalayim', he: 'אֶרֶץ יִשְׂרָאֵל וְהַגְּאֻלָּה', es: 'Éretz Israel y la Gueulá' },
];

const ALL_YEHUDI: YehudiItem[] = [
  // ───────────── Tefilá y berajot ─────────────
  { id: 't-shema-shajarit', for: 'hombre', area: 'tefillah', he: 'קְרִיאַת שְׁמַע שַׁחֲרִית בִּזְמַנָּהּ', es: 'Leer el Shemá de la mañana dentro de su tiempo (sof zman kriat Shemá).', level: 'halacha', weight: 3, source: 'שו״ע או״ח נ״ח', sourceEs: 'Shulján Aruj, OJ 58' },
  { id: 't-shema-arvit', for: 'hombre', area: 'tefillah', he: 'קְרִיאַת שְׁמַע שֶׁל עַרְבִית', es: 'Leer el Shemá de la noche con sus berajot.', level: 'halacha', weight: 3, source: 'שו״ע או״ח רל״ה', sourceEs: 'Shulján Aruj, OJ 235' },
  { id: 't-shajarit', area: 'tefillah', he: 'תְּפִלַּת שַׁחֲרִית בִּזְמַנָּהּ', es: 'Rezar Shajarit dentro de su tiempo.', level: 'halacha', weight: 3, source: 'שו״ע או״ח פ״ט', sourceEs: 'Shulján Aruj, OJ 89' },
  { id: 't-minja', area: 'tefillah', he: 'תְּפִלַּת מִנְחָה', es: 'Rezar Minjá todos los días.', level: 'halacha', weight: 3, source: 'שו״ע או״ח רל״ב', sourceEs: 'Shulján Aruj, OJ 232' },
  { id: 't-arvit', area: 'tefillah', he: 'תְּפִלַּת עַרְבִית', es: 'Rezar Arvit todos los días.', level: 'halacha', weight: 2, source: 'שו״ע או״ח רל״ה', sourceEs: 'Shulján Aruj, OJ 235' },
  { id: 't-minyan', for: 'hombre', area: 'tefillah', he: 'שָׁלֹשׁ תְּפִלּוֹת בְּמִנְיָן', es: 'Las tres tefilot con minyán.', level: 'jumra', weight: 2, source: 'שו״ע או״ח צ׳', sourceEs: 'Shulján Aruj, OJ 90' },
  { id: 't-birkat-hamazon', area: 'tefillah', he: 'בִּרְכַּת הַמָּזוֹן מִתּוֹךְ סִדּוּר בְּכַוָּנָה', es: 'Bircat haMazón de un sidur, con kavaná, tras cada comida con pan.', level: 'halacha', weight: 3, source: 'שו״ע או״ח קפ״ה', sourceEs: 'Shulján Aruj, OJ 185' },
  { id: 't-berajot', area: 'tefillah', he: 'בְּרָכָה רִאשׁוֹנָה וְאַחֲרוֹנָה עַל כָּל אֲכִילָה', es: 'Berajá antes y después de todo lo que como y bebo.', level: 'halacha', weight: 2, source: 'שו״ע או״ח ר״י', sourceEs: 'Shulján Aruj, OJ 210' },
  { id: 't-asher-yatzar', area: 'tefillah', he: 'אֲשֶׁר יָצַר אַחֲרֵי בֵּית הַכִּסֵּא', es: 'Decir Asher Yatzar después de cada vez.', level: 'halacha', weight: 2 },
  { id: 't-modeh-ani', area: 'tefillah', he: 'מוֹדֶה אֲנִי וּנְטִילַת יָדַיִם מִיָּד בַּבֹּקֶר', es: 'Modé Aní y netilat yadáyim al despertar.', level: 'halacha', weight: 2 },
  { id: 't-kavana-amida', area: 'tefillah', he: 'כַּוָּנָה בְּבִרְכַּת אָבוֹת לְכָל הַפָּחוֹת', es: 'Kavaná al menos en la primera berajá de la Amidá.', level: 'jumra', weight: 2, source: 'שו״ע או״ח ק״א', sourceEs: 'Shulján Aruj, OJ 101' },
  { id: 't-tejinot', area: 'tefillah', he: 'בַּקָּשָׁה אִישִׁית בְּ"שׁוֹמֵעַ תְּפִלָּה"', es: 'Pedido personal, con mis palabras, en "Shoméa Tefilá".', level: 'hiddur', weight: 1 },
  { id: 't-tefillin', for: 'hombre', area: 'tefillah', he: 'תְּפִלִּין כְּשֵׁרוֹת נִבְדָּקוֹת, כָּל יוֹם', es: 'Tefilín kasher (revisadas), puestas cada día de semana.', level: 'halacha', weight: 3, source: 'שו״ע או״ח כ״ה', sourceEs: 'Shulján Aruj, OJ 25' },
  { id: 't-tzitzit', for: 'hombre', area: 'tefillah', he: 'טַלִּית קָטָן עִם צִיצִית כָּל הַיּוֹם', es: 'Talit katán con tzitzit puesto todo el día.', level: 'jumra', weight: 2, source: 'שו״ע או״ח כ״ד', sourceEs: 'Shulján Aruj, OJ 24' },

  // ───────────── Torá ─────────────
  { id: 'to-seder-boker', for: 'hombre', area: 'torah', he: 'סֵדֶר לִמּוּד קָבוּעַ בַּבֹּקֶר', es: 'Un seder de estudio fijo por la mañana.', level: 'halacha', weight: 3, source: 'שו״ע או״ח קנ״ה', sourceEs: 'Shulján Aruj, OJ 155' },
  { id: 'to-seder-erev', for: 'hombre', area: 'torah', he: 'סֵדֶר לִמּוּד קָבוּעַ בָּעֶרֶב', es: 'Un seder de estudio fijo por la noche.', level: 'jumra', weight: 2, source: 'שו״ע יו״ד רמ״ו', sourceEs: 'Shulján Aruj, YD 246' },
  { id: 'to-shnayim-mikra', for: 'hombre', area: 'torah', he: 'שְׁנַיִם מִקְרָא וְאֶחָד תַּרְגּוּם כָּל שָׁבוּעַ', es: 'Shnáyim mikrá ve-ejad Targúm de la parashá cada semana.', level: 'halacha', weight: 2, source: 'שו״ע או״ח רפ״ה', sourceEs: 'Shulján Aruj, OJ 285' },
  { id: 'to-halacha-yomit', area: 'torah', he: 'הֲלָכָה לְמַעֲשֶׂה כָּל יוֹם', es: 'Aprender halajá práctica todos los días.', level: 'jumra', weight: 2 },
  { id: 'to-musar-yomi', area: 'torah', he: 'לִמּוּד מוּסָר כָּל יוֹם', es: 'Un poco de musar todos los días.', level: 'jumra', weight: 2, source: 'ר׳ יִשְׂרָאֵל סָלַנְטֶר', sourceEs: 'Rabí Israel Salanter' },
  { id: 'to-parasha-rashi', area: 'torah', he: 'פָּרָשָׁה עִם רַשִׁ״י', es: 'La parashá con Rashí cada semana.', level: 'hiddur', weight: 1 },
  { id: 'to-tehilim', area: 'torah', he: 'פֶּרֶק תְּהִלִּים כָּל יוֹם', es: 'Al menos un capítulo de Tehilim cada día.', level: 'hiddur', weight: 1 },
  { id: 'to-kviut-chavruta', area: 'torah', he: 'חַבְרוּתָא קְבוּעָה', es: 'Una javrutá fija.', level: 'hiddur', weight: 1 },

  // ───────────── Shabat ─────────────
  { id: 's-hadlaka', area: 'mitzvot', he: 'הַדְלָקַת נֵרוֹת בִּזְמַן', es: 'Encender las velas antes de la puesta del sol, sin apurar el límite.', level: 'halacha', weight: 3, source: 'שו״ע או״ח רס״ג', sourceEs: 'Shulján Aruj, OJ 263' },
  { id: 's-tosefet', area: 'mitzvot', he: 'תּוֹסֶפֶת שַׁבָּת מִלְּפָנֶיהָ וּלְאַחֲרֶיהָ', es: 'Agregar tiempo antes y después del Shabat (toséfet Shabat).', level: 'jumra', weight: 2, source: 'שו״ע או״ח רס״א', sourceEs: 'Shulján Aruj, OJ 261' },
  { id: 's-melajot', area: 'mitzvot', he: 'שְׁמִירַת ל״ט מְלָאכוֹת בְּדִקְדּוּק', es: 'Cuidar las 39 melajot con precisión, incluidas las de-rabanán.', level: 'halacha', weight: 3, source: 'שו״ע או״ח רמ״ב–שמ״ד', sourceEs: 'Shulján Aruj, OJ 242–344' },
  { id: 's-muktze', area: 'mitzvot', he: 'הַרְחָקָה מִמֻּקְצֶה', es: 'Cuidar el muktzé.', level: 'halacha', weight: 2, source: 'שו״ע או״ח ש״ח', sourceEs: 'Shulján Aruj, OJ 308' },
  { id: 's-seudot', area: 'mitzvot', he: 'שָׁלֹשׁ סְעֻדּוֹת', es: 'Las tres seudot del Shabat.', level: 'halacha', weight: 2, source: 'שו״ע או״ח רצ״א', sourceEs: 'Shulján Aruj, OJ 291' },
  { id: 's-divrei-torah', area: 'mitzvot', he: 'דִּבְרֵי תוֹרָה עַל הַשֻּׁלְחָן', es: 'Divré Torá en la mesa de Shabat.', level: 'hiddur', weight: 1, source: 'אָבוֹת ג׳:ג׳', sourceEs: 'Pirkei Avot 3:3' },
  { id: 's-lo-medaber-chol', area: 'mitzvot', he: 'הִמָּנְעוּת מִשִּׂיחַת חֻלִּין וְעֵסֶק בְּעִנְיְנֵי חֹל', es: 'Evitar hablar de negocios y de temas de jol en Shabat.', level: 'jumra', weight: 1, source: 'שו״ע או״ח ש״ז', sourceEs: 'Shulján Aruj, OJ 307' },
  { id: 's-kriat-hatorah', for: 'hombre', area: 'mitzvot', he: 'קְרִיאַת הַתּוֹרָה בְּצִבּוּר', es: 'Escuchar la lectura de la Torá con la kehilá.', level: 'halacha', weight: 2 },
  { id: 's-yom-tov', area: 'mitzvot', he: 'שְׁמִירַת יוֹם טוֹב כְּהִלְכָתוֹ', es: 'Cuidar Yom Tov con todas sus halajot (incl. eruv tavshilin).', level: 'halacha', weight: 2 },

  // ───────────── Kashrut y kedushá del cuerpo ─────────────
  { id: 'k-hejsherim', area: 'kedushah', he: 'אֲכִילָה רַק בְּהֶכְשֵׁר מְהֵימָן', es: 'Comer solo con un hejsher confiable.', level: 'halacha', weight: 3, source: 'שו״ע יו״ד', sourceEs: 'Shulján Aruj, Yoré Deá' },
  { id: 'k-basar-jalak', area: 'kedushah', he: 'בָּשָׂר חָלָק בֵּית יוֹסֵף', es: 'Carne "jalak" (Bet Yosef).', level: 'jumra', weight: 2, source: 'שו״ע יו״ד ל״ט', sourceEs: 'Shulján Aruj, YD 39' },
  { id: 'k-pat-yisrael', area: 'kedushah', he: 'פַּת יִשְׂרָאֵל', es: 'Pas Yisrael.', level: 'jumra', weight: 1, source: 'שו״ע יו״ד קס״ח', sourceEs: 'Shulján Aruj, YD 168' },
  { id: 'k-bishul-yisrael', area: 'kedushah', he: 'בִּישּׁוּל יִשְׂרָאֵל', es: 'Bishul Yisrael.', level: 'jumra', weight: 1, source: 'שו״ע יו״ד קי״ג', sourceEs: 'Shulján Aruj, YD 113' },
  { id: 'k-jalav-yisrael', area: 'kedushah', he: 'חָלָב יִשְׂרָאֵל', es: 'Jalav Yisrael.', level: 'jumra', weight: 1, source: 'שו״ע יו״ד קט״ו', sourceEs: 'Shulján Aruj, YD 115' },
  { id: 'k-hamtana', area: 'kedushah', he: 'הַמְתָּנָה שֵׁשׁ שָׁעוֹת בֵּין בָּשָׂר לְחָלָב', es: 'Esperar seis horas entre carne y leche.', level: 'jumra', weight: 2, source: 'שו״ע יו״ד פ״ט', sourceEs: 'Shulján Aruj, YD 89' },
  { id: 'k-tevilat-kelim', area: 'kedushah', he: 'טְבִילַת כֵּלִים', es: 'Tevilat kelim para utensilios nuevos.', level: 'halacha', weight: 2, source: 'שו״ע יו״ד ק״כ', sourceEs: 'Shulján Aruj, YD 120' },
  { id: 'k-netilat-yadayim-pat', area: 'kedushah', he: 'נְטִילַת יָדַיִם לִסְעוּדָה כְּהִלְכָתָהּ', es: 'Netilat yadáyim para pan, como es debido.', level: 'halacha', weight: 2, source: 'שו״ע או״ח קנ״ח', sourceEs: 'Shulján Aruj, OJ 158' },
  { id: 'ke-shmirat-einayim', for: 'hombre', area: 'kedushah', he: 'שְׁמִירַת עֵינַיִם בָּרְחוֹב וּבַמָּסָךְ', es: 'Shmirat eináyim en la calle y en las pantallas.', level: 'halacha', weight: 3, source: 'שו״ע אה״ע כ״א', sourceEs: 'Shulján Aruj, EH 21' },
  { id: 'ke-filtro', area: 'kedushah', he: 'סִנּוּן תֹּכֶן בְּכָל מַכְשִׁיר', es: 'Filtro de contenido en todos los dispositivos.', level: 'jumra', weight: 2 },
  { id: 'ke-kedushat-habrit', for: 'hombre', area: 'kedushah', he: 'שְׁמִירַת הַבְּרִית בְּמַחֲשָׁבָה וּבְמַעֲשֶׂה', es: 'Cuidar la kedushá también en el pensamiento.', level: 'halacha', weight: 3 },
  { id: 'ke-yijud', area: 'kedushah', he: 'הַרְחָקוֹת וְאִסּוּר יִחוּד', es: 'Cuidar las harjakot y el isur yijud.', level: 'halacha', weight: 2, source: 'שו״ע אה״ע כ״ב', sourceEs: 'Shulján Aruj, EH 22' },
  { id: 'ke-levush', for: 'hombre', area: 'kedushah', he: 'לְבוּשׁ צָנוּעַ הַהוֹלֵם בֶּן תּוֹרָה', es: 'Vestimenta modesta, acorde a un ben Torá.', level: 'jumra', weight: 1 },

  // ───────────── Shmirat haLashón ─────────────
  { id: 'l-lashon-hara', area: 'speech', he: 'הִמָּנְעוּת מִלָּשׁוֹן הָרָע', es: 'No hablar lashón hará ni escucharlo.', level: 'halacha', weight: 3, source: 'חֲפֵץ חַיִּים', sourceEs: 'Jaféz Jaím' },
  { id: 'l-rechilut', area: 'speech', he: 'הִמָּנְעוּת מֵרְכִילוּת', es: 'No transmitir rejilut (chismes que enemistan).', level: 'halacha', weight: 2, source: 'חֲפֵץ חַיִּים', sourceEs: 'Jaféz Jaím' },
  { id: 'l-onaat-dvarim', area: 'speech', he: 'הִמָּנְעוּת מֵאוֹנָאַת דְּבָרִים', es: 'No lastimar con palabras (onaat devarim).', level: 'halacha', weight: 2, source: 'שו״ע חו״מ רכ״ח', sourceEs: 'Shulján Aruj, JM 228' },
  { id: 'l-sheker', area: 'speech', he: 'מִדְּבַר שֶׁקֶר תִּרְחָק', es: 'Alejarse de la mentira, incluso la pequeña.', level: 'halacha', weight: 2, source: 'שְׁמוֹת כ״ג:ז׳', sourceEs: 'Shemot 23:7' },
  { id: 'l-shiurim', area: 'speech', he: 'לִמּוּד קָבוּעַ בְּהִלְכוֹת שְׁמִירַת הַלָּשׁוֹן', es: 'Estudio fijo de las halajot de shmirat haLashón.', level: 'jumra', weight: 1, source: 'חֲפֵץ חַיִּים', sourceEs: 'Jaféz Jaím' },
  { id: 'l-nekius', area: 'speech', he: 'נְקִיּוּת הַפֶּה מִנִּבּוּל וּלְצוֹן', es: 'Boca limpia de groserías y de burla (leitzanut).', level: 'jumra', weight: 1 },

  // ───────────── Ben adam lajaveró ─────────────
  { id: 'b-tzedaka', area: 'ben_adam', he: 'מַעֲשֵׂר כְּסָפִים', es: 'Dar maaser kesafim de todo ingreso.', level: 'jumra', weight: 2, source: 'שו״ע יו״ד רמ״ט', sourceEs: 'Shulján Aruj, YD 249' },
  { id: 'b-jesed-yomi', area: 'ben_adam', he: 'מַעֲשֵׂה חֶסֶד אֶחָד כָּל יוֹם', es: 'Un acto de jésed concreto cada día.', level: 'hiddur', weight: 1, source: 'אָבוֹת א׳:ב׳', sourceEs: 'Pirkei Avot 1:2' },
  { id: 'b-kibud-av', area: 'ben_adam', he: 'כִּבּוּד אָב וָאֵם בְּמַעֲשֶׂה', es: 'Kibud av va-em con acciones, no solo respeto.', level: 'halacha', weight: 3, source: 'שו״ע יו״ד ר״מ', sourceEs: 'Shulján Aruj, YD 240' },
  { id: 'b-hashavat-aveda', area: 'ben_adam', he: 'הֲשָׁבַת אֲבֵדָה וְדִקְדּוּק בְּמָמוֹן חֲבֵרוֹ', es: 'Devolver lo perdido y cuidar el dinero ajeno al centavo.', level: 'halacha', weight: 2, source: 'שו״ע חו״מ רנ״ט', sourceEs: 'Shulján Aruj, JM 259' },
  { id: 'b-dan-lekaf-zjut', area: 'ben_adam', he: 'לָדוּן כָּל אָדָם לְכַף זְכוּת', es: 'Juzgar a todos con la balanza a favor.', level: 'halacha', weight: 2, source: 'אָבוֹת א׳:ו׳', sourceEs: 'Pirkei Avot 1:6' },
  { id: 'b-mejila', area: 'ben_adam', he: 'בַּקָּשַׁת מְחִילָה וּמְחִילָה לִפְנֵי הַשֵּׁנָה', es: 'Pedir y dar mejilá antes de dormir.', level: 'hiddur', weight: 1 },
  { id: 'b-hachnasat-orchim', area: 'ben_adam', he: 'הַכְנָסַת אוֹרְחִים', es: 'Hajnasat orjim de forma regular.', level: 'hiddur', weight: 1 },
  { id: 'b-bein-hazmanim', area: 'ben_adam', he: 'זְהִירוּת בִּכְבוֹד הַבְּרִיּוֹת בָּרֶשֶׁת', es: 'Cuidar el kavod habriot también en redes y mensajes.', level: 'jumra', weight: 1 },

  // ───────────── Midot ─────────────
  { id: 'm-kaas', area: 'middot', he: 'עֲבוֹדָה עַל הַכַּעַס', es: 'Trabajo activo sobre la ira: no responder en caliente.', level: 'jumra', weight: 2, source: 'רַמְבַּ״ם דֵּעוֹת ב׳:ג׳', sourceEs: 'Rambam, Deot 2:3' },
  { id: 'm-gaava', area: 'middot', he: 'עֲבוֹדָה עַל הַגַּאֲוָה', es: 'Trabajo sobre la soberbia: buscar el lugar de atrás.', level: 'jumra', weight: 2, source: 'רַמְבַּ״ם דֵּעוֹת ב׳:ג׳', sourceEs: 'Rambam, Deot 2:3' },
  { id: 'm-taava', area: 'middot', he: 'שְׁלִיטָה בְּתַאֲווֹת הָאֲכִילָה', es: 'Dominio en el comer: parar antes de saciarse.', level: 'jumra', weight: 1, source: 'רַמְבַּ״ם דֵּעוֹת ד׳', sourceEs: 'Rambam, Deot 4' },
  { id: 'm-histapkut', area: 'middot', he: 'הִסְתַּפְּקוּת בַּמּוּעָט', es: 'Contentarse con lo necesario, sin correr tras el lujo.', level: 'jumra', weight: 1, source: 'אָבוֹת ד׳:א׳', sourceEs: 'Pirkei Avot 4:1' },
  { id: 'm-savlanut', area: 'middot', he: 'סַבְלָנוּת עִם בְּנֵי הַבַּיִת', es: 'Paciencia real con la familia, no solo con los de afuera.', level: 'jumra', weight: 2 },
  { id: 'm-zerizut', area: 'middot', he: 'זְרִיזוּת: לֹא לִדְחוֹת מִצְוָה', es: 'Zerizut: no posponer una mitzvá que está a la mano.', level: 'jumra', weight: 2, source: 'מְסִלַּת יְשָׁרִים ז׳', sourceEs: 'Mesilat Yesharim, cap. 7' },
  { id: 'm-simja', area: 'middot', he: 'עֲבוֹדָה בְּשִׂמְחָה', es: 'Servir con alegría, cortar la amargura.', level: 'jumra', weight: 1, source: 'תְּהִלִּים ק׳:ב׳', sourceEs: 'Tehilim 100:2' },

  // ───────────── Emuná y bitajón ─────────────
  { id: 'e-emuna-yomit', area: 'emunah', he: 'חִזּוּק אֱמוּנָה כָּל יוֹם', es: 'Reforzar la emuná cada día (lectura o hitbonenut).', level: 'jumra', weight: 2 },
  { id: 'e-bitajon-nisayon', area: 'bitachon', he: 'בִּטָּחוֹן בַּנִּסְיוֹנוֹת הַכַּלְכָּלִיִּים', es: 'Poner el bitajón en práctica ante la preocupación por la parnasá.', level: 'jumra', weight: 2, source: 'חוֹבוֹת הַלְּבָבוֹת, שַׁעַר הַבִּטָּחוֹן', sourceEs: 'Jovot HaLevavot, Portal del Bitajón' },
  { id: 'e-hakarat-hatov', area: 'emunah', he: 'הַכָּרַת הַטּוֹב מְפֹרֶטֶת כָּל יוֹם', es: 'Nombrar cada día cosas concretas por las que agradecer.', level: 'hiddur', weight: 1 },
  { id: 'e-hishtadlut', area: 'bitachon', he: 'הִשְׁתַּדְּלוּת מְמֻעֶטֶת בְּלִי לְהִבָּהֵל', es: 'Hishtadlut medida, sin correr con angustia.', level: 'jumra', weight: 1 },
  { id: 'e-kabalat-yisurim', area: 'emunah', he: 'קַבָּלַת הַקָּשֶׁה בְּלֹא תְּלוּנָה', es: 'Recibir lo difícil sin queja contra el Cielo.', level: 'jumra', weight: 1 },

  // ───────────── Irat Shamáyim ─────────────
  { id: 'h-shiviti', area: 'hashem', he: 'שִׁוִּיתִי ה׳ לְנֶגְדִּי תָמִיד', es: 'Vivir con "Shiviti Hashem lenegdí tamid" presente.', level: 'jumra', weight: 2, source: 'תְּהִלִּים ט״ז:ח׳', sourceEs: 'Tehilim 16:8' },
  { id: 'h-cheshbon-hanefesh', area: 'hashem', he: 'חֶשְׁבּוֹן הַנֶּפֶשׁ כָּל לַיְלָה', es: 'Cheshbon haNéfesh todas las noches.', level: 'jumra', weight: 2, source: 'חֶשְׁבּוֹן הַנֶּפֶשׁ', sourceEs: 'Cheshbon HaNefesh (R. M. M. Lefin)' },
  { id: 'h-tznua-beseter', area: 'hashem', he: 'הִתְנַהֲגוּת בַּסֵּתֶר כְּמוֹ בַּגָּלוּי', es: 'Comportarse en privado igual que en público.', level: 'jumra', weight: 2, source: 'שו״ע או״ח א׳', sourceEs: 'Shulján Aruj, OJ 1' },
  { id: 'h-nedarim', area: 'hashem', he: 'זְהִירוּת מִנְּדָרִים וּמִלִּים לְבַטָּלָה', es: 'Cuidado con los nedarim y con las palabras al vacío.', level: 'halacha', weight: 1, source: 'שו״ע יו״ד ר״ג', sourceEs: 'Shulján Aruj, YD 203' },
  { id: 'h-kviut-itim', area: 'hashem', he: '"קָבַעְתָּ עִתִּים לַתּוֹרָה?" — נֶאֱמָנוּת לַסֵּדֶר', es: 'Fidelidad al seder fijo aunque el día se complique.', level: 'jumra', weight: 2, source: 'שַׁבָּת ל״א.', sourceEs: 'Shabat 31a' },

  // ───────────── Éretz Israel y la Gueulá ─────────────
  { id: 'y-tzipiya', area: 'yerushalayim', he: 'צִפִּיָּה לַיְשׁוּעָה כָּל יוֹם', es: 'Esperar la Gueulá activamente cada día.', level: 'jumra', weight: 1, source: 'שַׁבָּת ל״א.', sourceEs: 'Shabat 31a' },
  { id: 'y-aavat-eretz', area: 'yerushalayim', he: 'חִבַּת אֶרֶץ יִשְׂרָאֵל', es: 'Cultivar el amor por Éretz Israel.', level: 'hiddur', weight: 1, source: 'כְּתוּבּוֹת ק״י:', sourceEs: 'Ketubot 110b' },
  { id: 'y-jurban', area: 'yerushalayim', he: 'זֵכֶר לַחֻרְבָּן', es: 'Guardar un zéjer la-jurbán (algo por Yerushalayim).', level: 'halacha', weight: 1, source: 'שו״ע או״ח תק״ס', sourceEs: 'Shulján Aruj, OJ 560' },

  // ───────────── Solo para mujeres ─────────────
  { id: 'to-seder-mujer', for: 'mujer', area: 'torah', he: 'זְמַן קָבוּעַ לְלִמּוּד הֲלָכוֹת וְהַשְׁקָפָה', es: 'Un tiempo fijo cada día para estudiar las halajot que aplican a tu vida y hashkafá.', level: 'halacha', weight: 3, source: 'שו״ע יו״ד רמ״ו:ו׳', sourceEs: 'Shulján Aruj, YD 246:6' },
  { id: 'to-hashkafa-mujer', for: 'mujer', area: 'torah', he: 'לִמּוּד שְׁבוּעִי עַל נָשִׁים בַּתּוֹרָה', es: 'Estudio semanal: las matriarcas y las mujeres de la Torá, o la parashá con su mensaje.', level: 'hiddur', weight: 1 },
  { id: 'k-jala', for: 'mujer', area: 'kedushah', he: 'הַפְרָשַׁת חַלָּה', es: 'Hafrashat jalá al amasar, con su berajá.', level: 'halacha', weight: 2, source: 'שו״ע יו״ד שכ״ב', sourceEs: 'Shulján Aruj, YD 322' },
  { id: 'ke-taharat', for: 'mujer', area: 'kedushah', he: 'טָהֲרַת הַמִּשְׁפָּחָה', es: 'Taharat hamishpajá: cuidar las leyes de niddá y la tevilá en el mikvé (si estás casada).', level: 'halacha', weight: 3, source: 'שו״ע יו״ד קפ״ג–ר׳', sourceEs: 'Shulján Aruj, YD 183–200' },
  { id: 'ke-tzniut-levush', for: 'mujer', area: 'kedushah', he: 'צְנִיעוּת בְּלְבוּשׁ', es: 'Tzniut en la vestimenta: cubrir lo que la halajá indica, también en casa y en la calle.', level: 'halacha', weight: 3, source: 'שו״ע אה״ע כ״א:ב׳', sourceEs: 'Shulján Aruj, EH 21:2' },
  { id: 'ke-tzniut-conducta', for: 'mujer', area: 'kedushah', he: 'צְנִיעוּת בְּהִתְנַהֲגוּת וּבְדִבּוּר', es: 'Tzniut en la conducta y en el habla: dignidad interior, sin llamar la atención.', level: 'jumra', weight: 2, source: 'תְּהִלִּים מ״ה:י״ד', sourceEs: 'Tehilim 45:14 — "Kol kevudá bat melej penimá"' },
  { id: 'l-lashon-hara-mujer', for: 'mujer', area: 'speech', he: 'שְׁמִירַת הַלָּשׁוֹן בַּשִּׂיחָה עִם חֲבֵרוֹת וּבְמִשְׁפָּחָה', es: 'Cuidar la lengua en la charla con amigas y familia: no hablar de otras personas.', level: 'halacha', weight: 3, source: 'חֲפֵץ חַיִּים', sourceEs: 'Jaféz Jaím' },
  { id: 'k-kisui-rosh', for: 'mujer', area: 'kedushah', he: 'כִּסּוּי רֹאשׁ לְאִשָּׁה נְשׂוּאָה', es: 'Kisui rosh: la mujer casada cubre su cabello, según la halajá y la costumbre de su comunidad.', level: 'halacha', weight: 3, source: 'שו״ע אה״ע קט״ו:ד׳', sourceEs: 'Shulján Aruj, EH 115:4' },
  { id: 'm-nerot-shabat', for: 'mujer', area: 'mitzvot', he: 'הַדְלָקַת נֵרוֹת שַׁבָּת', es: 'Encender las velas de Shabat antes de la puesta del sol, con su berajá.', level: 'halacha', weight: 3, source: 'שו״ע או״ח רס״ג', sourceEs: 'Shulján Aruj, OJ 263' },
  { id: 'm-hajanat-shabat', for: 'mujer', area: 'mitzvot', he: 'הֲכָנָה לְשַׁבָּת', es: 'Preparar el Shabat con cariño y desde antes: casa, mesa y comida (kavod y oneg Shabat).', level: 'jumra', weight: 2, source: 'שו״ע או״ח ר״נ', sourceEs: 'Shulján Aruj, OJ 250' },
  { id: 'k-kashrut-cocina', for: 'mujer', area: 'kedushah', he: 'כַּשְׁרוּת הַמִּטְבָּח', es: 'Cuidar la kashrut de la cocina: separar carne y leche y revisar verduras y frutas por insectos.', level: 'halacha', weight: 3, source: 'שו״ע יו״ד פ״ד, פ״ז', sourceEs: 'Shulján Aruj, YD 84 y 87' },
  { id: 'b-jinuj-hijos', for: 'mujer', area: 'ben_adam', he: 'חִנּוּךְ הַיְלָדִים', es: 'Sembrar Torá y mitzvot en los hijos (o en los niños cercanos) con el ejemplo y con cariño.', level: 'jumra', weight: 2, source: 'מִשְׁלֵי א׳:ח׳', sourceEs: 'Mishlé 1:8 — "Ve-al titosh Torat imeja"' },
  { id: 'm-rosh-jodesh', for: 'mujer', area: 'mitzvot', he: 'רֹאשׁ חֹדֶשׁ — יוֹם הַנָּשִׁים', es: 'Honrar Rosh Jódesh, el día de las mujeres: descansar de ciertas labores y dedicarlo a la tefilá o la tzedaká.', level: 'hiddur', weight: 1, source: 'רמ״א או״ח תי״ז:א׳', sourceEs: 'Rema, OJ 417:1' },
  { id: 'e-tefila-corazon', for: 'mujer', area: 'emunah', he: 'תְּפִלָּה מֵהַלֵּב', es: 'Hablar con Hashem con tus propias palabras, como Jana: agradecer, pedir y desahogarte.', level: 'hiddur', weight: 1, source: 'שְׁמוּאֵל א׳ א׳', sourceEs: 'Shemuel I 1' },
  { id: 'b-bayit-mujer', for: 'mujer', area: 'ben_adam', he: 'בִּנְיַן הַבַּיִת וְשָׁלוֹם בַּיִת', es: 'Cuidar la paz y el ambiente del hogar.', level: 'jumra', weight: 2, source: 'מִשְׁלֵי י״ד:א׳', sourceEs: 'Mishlé 14:1' },
];

/** Catálogo visible para este usuario, según su género. */
export const YEHUDI_CATALOG: YehudiItem[] = forGender(ALL_YEHUDI);

/** Búsqueda sobre TODO el catálogo. */
export const YEHUDI_BY_ID: Record<string, YehudiItem> = Object.fromEntries(
  ALL_YEHUDI.map((i) => [i.id, i]),
);

export const YEHUDI_TOTAL_WEIGHT = YEHUDI_CATALOG.reduce((s, i) => s + i.weight, 0);
