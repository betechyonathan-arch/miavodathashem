/*
  FICHAS DE LAS ÁREAS — "que esté todo especificado".

  Cada una de las 27 categorías de registro tiene aquí su ficha: qué es esta avodá,
  su fuente (pasuk / Chazal / Rambam, con la cita), qué cuenta como registro en el
  área y una kavaná breve. El nombre hebreo/español vive en `categories.ts`; esto lo
  completa. Se muestra al tocar "מקור · ¿Qué es?" en un área y en la página /areas.

  Las fuentes son mekorot conocidos y verificables. No es un psak: es orientación
  para que cada registro tenga contexto.
*/
import type { AreaId } from './db/schema';
import { getGender } from './gender';

export interface AreaSource {
  /** Texto de la fuente, con nikud cuando es un pasuk. */
  texto: string;
  /** Cita: dónde está. */
  cita: string;
}

export interface AreaInfo {
  /** Transliteración del nombre hebreo. */
  translit: string;
  /** Qué es esta avodá — 1–2 frases. */
  definicion: string;
  /** De dónde viene. */
  fuente: AreaSource;
  /** Qué cuenta como un registro en esta área. */
  queRegistrar: string;
  /** Kavaná breve para tener presente al trabajar el área. */
  kavana: string;
}

export const AREA_INFO: Record<AreaId, AreaInfo> = {
  journal: {
    translit: 'Text jofshí',
    definicion:
      'Espacio abierto para contarle al sistema lo que pasó, sin encasillarlo todavía en un área. El motor lo clasifica después; tú solo dices la verdad tal como la viviste.',
    fuente: {
      texto: 'נַחְפְּשָׂה דְרָכֵינוּ וְנַחְקֹרָה וְנָשׁוּבָה עַד ה׳',
      cita: 'Eijá 3:40',
    },
    queRegistrar:
      'Cualquier cosa que quieras dejar asentada: un hecho, una conversación, un estado, algo que no sabes dónde va. Es la puerta ancha.',
    kavana: 'Escribo lo que fue, no lo que quisiera que fuera.',
  },
  torah: {
    translit: 'Torá',
    definicion:
      'El estudio de la Torá como avodá central del día: entenderla, repasarla, vivir dentro de ella. No es acumular información, es construir la mente con la que Hashem quiere que mires el mundo.',
    fuente: {
      texto: 'וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה לְמַעַן תִּשְׁמֹר לַעֲשׂוֹת כְּכָל הַכָּתוּב בּוֹ',
      cita: 'Yehoshúa 1:8 · Mishná Peá 1:1',
    },
    queRegistrar:
      'Qué aprendiste, cuánto tiempo, con qué seder (Jumash, Guemará, Halajá, Mishná…), y con qué calidad de atención. Un shiur, un daf, cinco minutos de repaso: todo cuenta.',
    kavana: 'No estudio para saber más; estudio para servir mejor.',
  },
  tefillah: {
    translit: 'Tefilá',
    definicion:
      'El trabajo del corazón: pararte delante de Hashem y hablarle. Las tres tefilot fijas, pero también una palabra tuya en medio del día. La cantidad importa menos que estar realmente ahí.',
    fuente: {
      texto: 'וּלְעָבְדוֹ בְּכָל לְבַבְכֶם — אֵיזוֹ הִיא עֲבוֹדָה שֶׁבַּלֵּב? הֱוֵי אוֹמֵר זוֹ תְּפִלָּה',
      cita: 'Devarim 11:13 · Taanit 2a',
    },
    queRegistrar:
      'Qué tefilá (Shajarit / Minjá / Arvit / bakashá personal), con minyán o sin, y qué kavaná tuviste — dónde estuvo tu mente y dónde la trajiste de vuelta.',
    kavana: 'Le hablo a Alguien que me escucha, no repito un texto.',
  },
  hashem: {
    translit: 'Késher im Hashem',
    definicion:
      'El vínculo vivo con Hashem a lo largo del día: tenerlo presente, hablarle, sentir que caminas delante de Él. Devekut — no un momento, un fondo constante.',
    fuente: {
      texto: 'שִׁוִּיתִי ה׳ לְנֶגְדִּי תָמִיד כִּי מִימִינִי בַּל אֶמּוֹט',
      cita: 'Tehilim 16:8 · Devarim 11:22',
    },
    queRegistrar:
      'Momentos en que te acordaste de Él sin que nada te obligara: un gracias, un pedido corto, una pausa para recordar delante de quién estás.',
    kavana: 'Hashem está aquí ahora, aunque yo lo olvide.',
  },
  emunah: {
    translit: 'Emuná',
    definicion:
      'Saber, no como teoría sino como base de la vida, que Hashem existe, creó todo, lo sostiene y está involucrado en cada detalle. La emuná se trabaja: se piensa, se repasa, se elige.',
    fuente: {
      texto: 'וְצַדִּיק בֶּאֱמוּנָתוֹ יִחְיֶה',
      cita: 'Jabakuk 2:4 · Makot 24a',
    },
    queRegistrar:
      'Un pensamiento de emuná que trabajaste, una duda que enfrentaste, un momento en que elegiste ver la mano de Hashem en algo en vez de dejarlo en "casualidad".',
    kavana: 'Nada de lo que pasa es azar; todo viene de Él y para bien.',
  },
  bitachon: {
    translit: 'Bitajón',
    definicion:
      'El paso siguiente a la emuná: descansar en Hashem. No solo creer que puede ayudar, sino apoyarte en Él y soltar la angustia por lo que no controlas.',
    fuente: {
      texto: 'בָּרוּךְ הַגֶּבֶר אֲשֶׁר יִבְטַח בַּה׳ וְהָיָה ה׳ מִבְטַחוֹ',
      cita: 'Yirmiyáhu 17:7 · Jovot HaLevavot, Sháar HaBitajón',
    },
    queRegistrar:
      'Una preocupación que entregaste, una decisión que tomaste confiando en vez de por miedo, un momento de calma que elegiste en medio de la incertidumbre.',
    kavana: 'Hago mi parte y el resultado lo dejo en Sus manos.',
  },
  middot: {
    translit: 'Midot',
    definicion:
      'El carácter: paciencia, humildad, generosidad, dominio del enojo. "Andar en Sus caminos" — como Él es compasivo, tú compasivo. El terreno donde más se juega la avodá real.',
    fuente: {
      texto: 'וְהָלַכְתָּ בִּדְרָכָיו — מָה הוּא רַחוּם אַף אַתָּה רַחוּם',
      cita: 'Devarim 28:9 · Shabat 133b · Mesilat Yesharim',
    },
    queRegistrar:
      'Una midá que se te pidió hoy y cómo respondiste: dónde te contuviste, dónde perdiste, qué midá quieres trabajar y qué la disparó.',
    kavana: 'La prueba de mi avodá es cómo trato a la gente cuando nadie mira.',
  },
  kedushah: {
    translit: 'Kedushá',
    definicion:
      'Santidad práctica: shmirat einaim, pureza en lo que consumes con la vista y la mente, dominio de la taavá. Separarte de lo que ensucia para poder acercarte.',
    fuente: {
      texto: 'וְלֹא תָתוּרוּ אַחֲרֵי לְבַבְכֶם וְאַחֲרֵי עֵינֵיכֶם אֲשֶׁר אַתֶּם זֹנִים אַחֲרֵיהֶם',
      cita: 'Bamidbar 15:39 · Vayikrá 19:2',
    },
    queRegistrar:
      'Un desvío de la mirada, una prueba de kedushá que pasaste o que no, un contexto de riesgo que reconociste a tiempo. Sin juicio: la verdad y el regreso.',
    kavana: 'Cada mirada que cuido es una elección de a quién pertenezco.',
  },
  speech: {
    translit: 'Shmirat halashón',
    definicion:
      'El cuidado de lo que sale de tu boca: no lashón hará, no rejilut, no palabra hiriente ni vacía. También el lado activo: palabra que construye, que consuela, que acerca.',
    fuente: {
      texto: 'נְצֹר לְשׁוֹנְךָ מֵרָע וּשְׂפָתֶיךָ מִדַּבֵּר מִרְמָה',
      cita: 'Tehilim 34:14 · Jafetz Jaim, Hiljot Lashón Hará',
    },
    queRegistrar:
      'Una vez que te callaste algo que no debía decirse, una vez que se te escapó, una palabra buena que elegiste dar. Lo que dijiste y lo que no.',
    kavana: 'Antes de hablar: ¿es verdad, es necesario, es bondadoso?',
  },
  ben_adam: {
    translit: 'Ben adam lajaveró',
    definicion:
      'El trato con el otro: jésed, respeto, honrar a los padres, no guardar rencor, cargar con la carga del prójimo. "Ama a tu prójimo como a ti mismo" — כלל גדול de toda la Torá.',
    fuente: {
      texto: 'וְאָהַבְתָּ לְרֵעֲךָ כָּמוֹךָ אֲנִי ה׳',
      cita: 'Vayikrá 19:18 · Torat Kohanim',
    },
    queRegistrar:
      'Un jésed que hiciste, una ayuda que diste o recibiste, un roce que hubo y cómo lo manejaste, honra a tus padres, un perdón que soltaste.',
    kavana: 'La persona frente a mí también fue creada a imagen de Hashem.',
  },
  yerushalayim: {
    translit: 'Yerushalayim / Gueulá',
    definicion:
      'Tener presente que estamos en galut, que falta el Beit HaMikdash, y vivir con anhelo activo de la gueulá: pedirla, recordarla, no acostumbrarte a la ausencia.',
    fuente: {
      texto: 'אִם אֶשְׁכָּחֵךְ יְרוּשָׁלָ͏ִם תִּשְׁכַּח יְמִינִי',
      cita: 'Tehilim 137:5 · Amidá',
    },
    queRegistrar:
      'Un momento en que sentiste la falta del Mikdash, una tefilá por la gueulá, un pensamiento sobre Yerushalayim que no dejaste pasar de largo.',
    kavana: 'No me acostumbro a la falta; la gueulá es una necesidad, no un adorno.',
  },
  mitzvot: {
    translit: 'Mitzvot',
    definicion:
      'El cumplimiento de mitzvot concretas — de acción, de palabra, cotidianas — con intención de cumplir la voluntad de Hashem. Correr hacia la mitzvá, incluso la "pequeña".',
    fuente: {
      texto: 'הֱוֵי רָץ לְמִצְוָה קַלָּה כְּבַחֲמוּרָה',
      cita: 'Avot 4:2',
    },
    queRegistrar:
      'Qué mitzvá cumpliste, si fue con kavaná o en automático, una que casi dejas pasar y alcanzaste, una que quieres afianzar como hábito.',
    kavana: 'No es un pendiente que tacho; es una orden del Rey que quiero cumplir.',
  },
  musar: {
    translit: 'Musar',
    definicion:
      'El trabajo sobre uno mismo: leer musar, pensar en tus defectos con honestidad, hacer jeshbón. Sin musar, la avodá se vuelve rutina ciega.',
    fuente: {
      texto: 'חוֹבַת הָאָדָם בְּעוֹלָמוֹ',
      cita: 'Mesilat Yesharim, petijá · Avot 4:1',
    },
    queRegistrar:
      'Qué musar aprendiste, una idea que te sacudió, una conclusión práctica que sacaste sobre ti, un rasgo que decidiste trabajar.',
    kavana: 'El musar duele porque es verdad; lo escucho en vez de defenderme.',
  },
  victory: {
    translit: 'Nitzajón',
    definicion:
      'Un momento en que venciste al yétzer: dominaste un impulso, elegiste lo correcto contra la corriente de adentro. "Fuerte es el que conquista su inclinación."',
    fuente: {
      texto: 'אֵיזֶהוּ גִבּוֹר? הַכּוֹבֵשׁ אֶת יִצְרוֹ',
      cita: 'Avot 4:1',
    },
    queRegistrar:
      'Qué prueba tuviste, qué te empujaba, cómo la venciste y qué te ayudó. Registrar la victoria enseña al sistema qué te funciona.',
    kavana: 'Esta pelea, ganada en silencio, vale más que lo que nadie vio.',
  },
  fall: {
    translit: 'Nefilá',
    definicion:
      'Una caída: hiciste algo contra tu avodá, contra lo que sabes que es correcto. Aquí no hay juicio ni condena — hay verdad. El tzadik cae y se levanta; lo que define no es la caída, es el regreso.',
    fuente: {
      texto: 'כִּי שֶׁבַע יִפּוֹל צַדִּיק וָקָם',
      cita: 'Mishlei 24:16',
    },
    queRegistrar:
      'Qué pasó, qué lo precedió (cansancio, contexto, estado de ánimo), cómo te sentiste después. Sin adornar y sin destruirte. La caída se archiva, no se borra.',
    kavana: 'Lo digo entero, ahora, y de inmediato empiezo el camino de vuelta.',
  },
  recovery: {
    translit: 'Hitoshshut',
    definicion:
      'El regreso después de una caída: teshuvá. Reconocer, soltar la culpa paralizante, volver a Hashem y seguir. Cuanto más corto el tiempo entre la caída y el regreso, más fuerte eres.',
    fuente: {
      texto: 'וְשַׁבְתָּ עַד ה׳ אֱלֹהֶיךָ וְשָׁמַעְתָּ בְקֹלוֹ',
      cita: 'Devarim 30:2 · Rambam, Hiljot Teshuvá',
    },
    queRegistrar:
      'Qué caída estás cerrando, cuánto tardaste en volver, qué te ayudó a levantarte, qué vas a hacer distinto. Esto es lo que rompe el ciclo.',
    kavana: 'La culpa que me deja tirado es también del yétzer; me levanto ya.',
  },
  test: {
    translit: 'Nisayón',
    definicion:
      'Una prueba: una situación que te puso a elegir entre tu avodá y tu comodidad, tu deseo o tu miedo. Hashem no prueba para hacerte caer, prueba para sacar a la luz lo que ya tienes dentro.',
    fuente: {
      texto: 'וְהָאֱלֹהִים נִסָּה אֶת אַבְרָהָם',
      cita: 'Bereshit 22:1 · Sucá 52a',
    },
    queRegistrar:
      'Cuál fue la prueba, qué estaba en juego, qué elegiste y cómo quedaste. Aunque no la hayas "ganado", nombrarla ya es avodá.',
    kavana: 'Esto no me pasa por encima; me pasa por dentro, para elegir.',
  },
  decision: {
    translit: 'Hajlatá',
    definicion:
      'Una decisión consciente que tomaste sobre tu vida o tu avodá: un límite, un compromiso, un cambio de rumbo. "Elegirás la vida" — la avodá también es decidir.',
    fuente: {
      texto: 'וּבָחַרְתָּ בַּחַיִּים לְמַעַן תִּחְיֶה אַתָּה וְזַרְעֶךָ',
      cita: 'Devarim 30:19',
    },
    queRegistrar:
      'Qué decidiste, por qué ahora, qué esperas que cambie, cómo vas a sostenerla. Volver a leer decisiones viejas es parte del jeshbón.',
    kavana: 'Una decisión sin fecha ni forma es solo un deseo.',
  },
  gratitude: {
    translit: 'Hakarat hatov',
    definicion:
      'Reconocer el bien: ver lo que Hashem te da y lo que la gente hace por ti, y no darlo por sentado. La raíz de "yehudí" es hodaá — agradecer.',
    fuente: {
      texto: 'מוֹדֶה אֲנִי לְפָנֶיךָ … שֶׁהֶחֱזַרְתָּ בִּי נִשְׁמָתִי',
      cita: 'Sidur (Modé Aní) · Tehilim 100',
    },
    queRegistrar:
      'Algo concreto que agradeces hoy — grande o mínimo — y a quién: a Hashem, a una persona. Nombrarlo lo hace real.',
    kavana: 'Si tuviera que ganarme lo que ya tengo, no podría.',
  },
  thought: {
    translit: 'Majshavá',
    definicion:
      'El mundo interior: qué pensamientos te ocuparon, cuáles alimentaste y cuáles dejaste ir. La mente es el primer campo de batalla — "los pensamientos de aveirá son más duros que la aveirá".',
    fuente: {
      texto: 'הִרְהוּרֵי עֲבֵרָה קָשִׁין מֵעֲבֵרָה',
      cita: 'Yomá 29a',
    },
    queRegistrar:
      'Un pensamiento recurrente, una preocupación que dio vueltas, una idea buena que quieres retener, algo que elegiste no seguir pensando.',
    kavana: 'No puedo evitar que un pájaro pase, sí que haga nido.',
  },
  emotion: {
    translit: 'Régesh',
    definicion:
      'El registro honesto de cómo estás: alegría, desánimo, enojo, miedo, paz. No para juzgarte por sentir, sino para conocer el clima interior en el que haces tu avodá.',
    fuente: {
      texto: 'עִבְדוּ אֶת ה׳ בְּשִׂמְחָה בֹּאוּ לְפָנָיו בִּרְנָנָה',
      cita: 'Tehilim 100:2',
    },
    queRegistrar:
      'Qué sentiste hoy con más fuerza, qué lo provocó, cómo afectó tu día y tu avodá. La simjá también se trabaja.',
    kavana: 'Siento lo que siento; elijo qué hago con eso.',
  },
  music: {
    translit: 'Música',
    definicion:
      'Lo que escuchas entra en ti. La música mueve el alma — puede elevarla o arrastrarla. Vale la pena registrar qué te acompaña y hacia dónde te lleva.',
    fuente: {
      texto: 'וְהָיָה כְּנַגֵּן הַמְנַגֵּן וַתְּהִי עָלָיו יַד ה׳',
      cita: 'Melajim II 3:15',
    },
    queRegistrar:
      'Qué escuchaste, cuánto, cómo te dejó (más cerca o más lejos de tu avodá), si notas un patrón entre cierta música y ciertos estados.',
    kavana: 'Elijo lo que suena dentro de mí, no lo dejo al azar.',
  },
  clothing: {
    translit: 'Levush',
    definicion:
      'Cómo te vistes y presentas: tzniut, dignidad, coherencia entre lo de afuera y lo de adentro. "Toda la honra de la hija del rey es interior" — y el afuera la acompaña.',
    fuente: {
      texto: 'כָּל כְּבוּדָּה בַת מֶלֶךְ פְּנִימָה',
      cita: 'Tehilim 45:14',
    },
    queRegistrar:
      'Una elección de vestimenta que hiciste con intención, un contexto donde cuidaste la tzniut o el kavod, algo que quieres ajustar.',
    kavana: 'Lo que muestro afuera dice a quién represento.',
  },
  sleep: {
    translit: 'Sheiná',
    definicion:
      'El descanso como parte de la avodá: dormir para servir con fuerzas, cuidar el horario, entregar el alma antes de dormir y agradecer al despertar. El cuerpo cansado tira la avodá.',
    fuente: {
      texto: 'בְּיָדְךָ אַפְקִיד רוּחִי פָּדִיתָה אוֹתִי ה׳ אֵל אֱמֶת',
      cita: 'Tehilim 31:6 · Kriat Shemá al hamitá',
    },
    queRegistrar:
      'A qué hora te dormiste y te levantaste, cómo descansaste, si hiciste kriat Shemá al acostarte, cómo llegó tu mañana.',
    kavana: 'Descanso para poder servir, no huyo del día durmiendo.',
  },
  phone: {
    translit: 'Télefon',
    definicion:
      'La relación con la pantalla: cuánto tiempo, para qué, qué te hace. Herramienta o agujero. Aquí se cruzan kedushá, bitul zman y estado de ánimo.',
    fuente: {
      texto: 'וְלֹא תָתוּרוּ … אַחֲרֵי עֵינֵיכֶם',
      cita: 'Bamidbar 15:39 · Avot 3:4',
    },
    queRegistrar:
      'Cuánto tiempo, en qué franjas, qué contenido, cómo te dejó. Un momento en que lo soltaste a tiempo o en que se te fue de las manos.',
    kavana: 'Yo uso el aparato; el aparato no me usa a mí.',
  },
  exercise: {
    translit: 'Peilut gufanit',
    definicion:
      'Cuidar el cuerpo con movimiento: mantenerlo sano y funcional es, según el Rambam, parte del camino de servir a Hashem, porque no se puede entender ni servir bien enfermo y débil.',
    fuente: {
      texto: 'הֱיוֹת הַגּוּף בָּרִיא וְשָׁלֵם מִדַּרְכֵי הַשֵּׁם הוּא',
      cita: 'Rambam, Hiljot Deot 4:1',
    },
    queRegistrar:
      'Qué actividad, cuánto tiempo, cómo te sentiste después, si notas efecto en tu ánimo, tu tefilá o tu concentración en el estudio.',
    kavana: 'Cuido este cuerpo porque me fue prestado para una misión.',
  },
  nature: {
    translit: 'Téva',
    definicion:
      'Salir, mirar el mundo de Hashem y dejarse impresionar: "¡Qué grandes son Tus obras!". La naturaleza es un sefer abierto de emuná si te detienes a leerlo.',
    fuente: {
      texto: 'מָה רַבּוּ מַעֲשֶׂיךָ ה׳ כֻּלָּם בְּחָכְמָה עָשִׂיתָ',
      cita: 'Tehilim 104:24',
    },
    queRegistrar:
      'Dónde estuviste, qué viste, qué te movió, qué pensamiento de emuná o gratitud surgió. Un aire, un árbol, un cielo.',
    kavana: 'Todo esto lo hizo Alguien, y lo hizo también para mí.',
  },
  work: {
    translit: 'Avodá (parnasá)',
    definicion:
      'El trabajo para la parnasá vivido como avodá: honestidad, no dejar que ocupe todo, hacer tu parte sabiendo que la bendición viene de Hashem. "Torá con dérej éretz."',
    fuente: {
      texto: 'יְגִיעַ כַּפֶּיךָ כִּי תֹאכֵל אַשְׁרֶיךָ וְטוֹב לָךְ',
      cita: 'Tehilim 128:2 · Avot 2:2',
    },
    queRegistrar:
      'Cómo estuvo tu jornada, si hubo una prueba de honestidad o de límites, si el trabajo comió tiempo de Torá y tefilá, cómo llevaste el estrés.',
    kavana: 'Trabajo con mis manos; la parnasá la manda Él.',
  },
};

const KEDUSHAH_MUJER: AreaInfo = {
  translit: 'Tzniut y kedushá',
  definicion:
    'La dignidad interior de la hija del Rey: tzniut en la vestimenta, en la conducta y en el habla; cuidar la kedushá del hogar y de la propia persona. No es esconderse: es saber cuánto vales.',
  fuente: {
    texto: 'כָּל כְּבוּדָּה בַּת מֶלֶךְ פְּנִימָה',
    cita: 'Tehilim 45:14',
  },
  queRegistrar:
    'Un momento en que cuidaste la tzniut o la descuidaste, una prueba de kedushá, un contexto en el que te sentiste presionada a ceder. Sin juicio: la verdad y el regreso.',
  kavana: 'Mi valor no depende de quién me mire; soy hija del Rey.',
};

export function areaInfo(id: AreaId): AreaInfo | undefined {
  if (id === 'kedushah' && getGender() === 'mujer') return KEDUSHAH_MUJER;
  return AREA_INFO[id];
}
