import { useNavigate } from 'react-router-dom';
import { useZury } from '../state/zury';
import { Card, SectionTitle } from '../components/ui';
import { getSession } from '../lib/auth/session';

interface Row {
  he: string;
  es: string;
  desc: string;
  to?: string;
  action?: 'registrar' | 'toque-rapido';
}
interface Group {
  he: string;
  es: string;
  rows: Row[];
}

const GROUPS: Group[] = [
  {
    he: 'הַיּוֹם',
    es: 'El día',
    rows: [
      { he: 'רישום', es: 'Registrar algo', desc: 'Texto, voz o campos por área. El sistema lo clasifica.', action: 'registrar' },
      { he: 'רישום מהיר', es: 'Toque rápido', desc: 'Elige victoria/caída una vez y toca cada área — sin formulario, sin texto.', action: 'toque-rapido' },
      { he: 'כוונה ליום', es: 'Check-in de la mañana', desc: '4 preguntas cortas para entrar al día con un punto claro.', to: '/check-in' },
      { he: 'חשבון הנפש', es: 'Cheshbon HaNefesh', desc: 'Cierre del día: solo te pregunta lo que falta.', to: '/cheshbon' },
      { he: 'מה קרה היום', es: 'Ver el día de hoy', desc: 'Todos los registros de hoy, en orden.', to: '/dia/hoy' },
    ],
  },
  {
    he: 'רְאִיָּה',
    es: 'Ver mi avodá',
    rows: [
      { he: 'איך אני', es: '¿Cómo estoy?', desc: 'Ahora, semana, mes y año. Cada número explica su “¿por qué?”.', to: '/como-estoy' },
      { he: 'תעודות', es: 'Boletas', desc: 'Semanal, mensual y anual (en Rosh Hashaná): dónde estuviste bien y mal a detalle, un refuerzo y un musar. Exportables a PDF.', to: '/boleta' },
      { he: 'המסע', es: 'Historia y búsqueda', desc: 'Recorre y busca en todo tu historial, día por día.', to: '/historia' },
      { he: 'השוואה', es: 'Comparar con antes', desc: 'Hoy vs. 7 / 30 / 90 días y años atrás; línea de vida.', to: '/historia?t=comparar' },
      { he: 'לוח', es: 'Calendario hebreo', desc: 'Zmanim, parashá, cuentas regresivas, omer y yahrzeits.', to: '/calendario' },
      { he: 'תחומי העבודה', es: 'Las 27 áreas', desc: 'Qué es cada área, su fuente y qué contar en ella.', to: '/areas' },
      { he: 'תורה', es: 'Torá — biblioteca de Sefaria', desc: 'Parashá, Pirkei Avot, Mishná, Guemará y Halajá con miles de pirushim enlazados. Lo de hoy y buscador.', to: '/tora' },
      { he: 'מוסר', es: 'Musar', desc: 'Frases al hueso elegidas por el día de hoy, con su fuente. Temas, favoritas y seder breve.', to: '/tora?t=musar' },
    ],
  },
  {
    he: 'הַדֶּרֶךְ',
    es: 'Mi camino',
    rows: [
      { he: 'יהודי שלם', es: 'Ser Yehudí — el círculo', desc: 'El círculo exacto: catálogo de halajot y jumrot + constancia de por vida − caídas. Kabalot de crecimiento.', to: '/yehudi' },
      { he: 'קבלה', es: 'Mis kabalot', desc: 'Crea tus compromisos con fecha: qué cuidar o hacer, y cuántos días. Con sugerencias para ti. Bli neder.', to: '/kabala' },
      { he: 'השליחות', es: 'Misión de vida', desc: 'Tu identidad, tu para qué, tu midá principal.', to: '/mision?t=identidad' },
      { he: 'שלבים', es: 'Etapas de vida', desc: 'Define y compara las etapas por las que vas pasando.', to: '/mision?t=etapas' },
      { he: 'מטרות', es: 'Metas', desc: 'Del día a la semana, al mes, al año, a la misión.', to: '/mision?t=metas' },
      { he: 'מצוות', es: 'Mitzvot que sigo', desc: 'El catálogo que eliges seguir cada día.', to: '/mision?t=identidad#mitzvot' },
      { he: 'נפילות שאני שומר', es: 'Caídas que vigilo', desc: 'Lo que le pides al sistema que cuente y te confronte.', to: '/mision?t=identidad#caidas' },
    ],
  },
  {
    he: 'הַגְדָּרוֹת',
    es: 'Ajustes',
    rows: [
      { he: 'מיקום', es: 'Ubicación', desc: 'Coordenadas para zmanim y el límite del día.', to: '/ajustes#ubicacion' },
      { he: 'גבול היום', es: 'Límite del día judío', desc: 'Shkiá o tzet, ángulo, y corrección manual de hoy.', to: '/ajustes#dia' },
      { he: 'מראה', es: 'Ambiente', desc: 'Tema día / noche y modo Shabat.', to: '/ajustes#ambiente' },
      { he: 'דין', es: 'Exigencia del sistema', desc: 'Suave, firme o exigente. Nunca te condena.', to: '/ajustes#exigencia' },
      { he: 'תזכורות', es: 'Recordatorios', desc: '3 avisos al día a las horas que elijas.', to: '/ajustes#recordatorios' },
      { he: 'בינה', es: 'Módulo de IA', desc: 'Opcional, invisible: clasifica y resume. Sin chatbot.', to: '/ajustes#ia' },
      { he: 'גיבוי בענן', es: 'Copia en la nube', desc: 'Respaldo y puente entre tus dispositivos.', to: '/ajustes#nube' },
      ...(getSession()?.isAdmin ? [{ he: 'ניהול', es: 'Administración', desc: 'Cuentas de la app: quién es admin, activar, desactivar y borrar. Nunca muestra registros personales.', to: '/admin' }] : []),
      { he: 'הנתונים שלך', es: 'Exportar, importar, borrar', desc: 'Tus datos son tuyos. Expórtalos seguido.', to: '/ajustes#datos' },
    ],
  },
];

export default function Menu() {
  const navigate = useNavigate();
  const day = useZury((s) => s.day);

  function go(row: Row) {
    if (row.action === 'registrar') {
      navigate('/');
      setTimeout(() => window.dispatchEvent(new Event('zury:quick-register')), 60);
      return;
    }
    if (row.action === 'toque-rapido') {
      navigate('/');
      setTimeout(() => window.dispatchEvent(new Event('zury:quick-tap')), 60);
      return;
    }
    if (!row.to) return;
    let to = row.to;
    if (to === '/dia/hoy') to = day ? `/dia/${day.dayId}` : '/historia';
    navigate(to);
  }

  return (
    <div className="space-y-6">
      <SectionTitle es="Todo lo que hay" he="מַפְתֵּחַ" />
      <p className="-mt-3 text-[12px] leading-relaxed text-ink-faint">
        Cada pantalla y cada opción de la app, en un solo lugar. Toca para ir directo.
      </p>

      {GROUPS.map((g) => (
        <div key={g.es}>
          <div className="mb-2 flex items-baseline justify-between">
            <div className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">{g.es}</div>
            <div className="hebrew text-lg text-gold">{g.he}</div>
          </div>
          <Card className="divide-y divide-line">
            {g.rows.map((r) => (
              <button
                key={r.es}
                onClick={() => go(r)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="hebrew text-[16px] text-ink">{r.he}</span>
                    <span className="text-[12px] text-ink-soft">{r.es}</span>
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-faint">{r.desc}</span>
                </span>
                <span className="mt-1 text-ink-faint">›</span>
              </button>
            ))}
          </Card>
        </div>
      ))}

      <p className="text-center text-[11px] text-ink-faint">
        <span className="hebrew">לעבוד את ה׳ בכל דרכיך</span>
      </p>
      <p className="text-center text-[10px] text-ink-faint/70">build {__BUILD_ID__}</p>
    </div>
  );
}
