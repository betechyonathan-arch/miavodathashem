import { useState, type ReactNode } from 'react';
import { Btn, Card } from './ui';

/*
  Guía de uso. Un recorrido corto (siete pasos) de lo más importante y de cómo registrar.
  Sale UNA sola vez: a las cuentas nuevas antes de la bienvenida, y a las que ya existían la
  primera vez que entran después de esta versión. Al terminar (o al saltarla) no vuelve a salir
  sola; se puede volver a ver cuando se quiera en Menú → «Cómo usar la app».
*/

/** El botón dorado «+» tal como se ve abajo en la app, para que se reconozca. */
function BotonMas() {
  return (
    <div className="mx-auto flex w-fit flex-col items-center" aria-hidden>
      <span className="grid h-16 w-16 place-items-center rounded-full border border-bg bg-gold font-serif text-3xl text-[#1a140a] shadow-[0_4px_16px_rgba(0,0,0,0.28)] ring-4 ring-[color-mix(in_srgb,var(--gold)_35%,transparent)]">
        +
      </span>
      <span className="hebrew mt-1 text-[12px] text-gold">רישום</span>
    </div>
  );
}

/** La barra de abajo en miniatura, con la pestaña que se explica resaltada. */
function BarraMini({ activa }: { activa: 'hoy' | 'como' | 'tora' | 'historia' | 'menu' }) {
  const items: { id: typeof activa; he: string; es: string }[] = [
    { id: 'hoy', he: 'בית', es: 'Hoy' },
    { id: 'como', he: 'איך אני', es: '¿Cómo estoy?' },
    { id: 'tora', he: 'תורה', es: 'Torá' },
    { id: 'historia', he: 'המסע', es: 'Historia' },
    { id: 'menu', he: 'מפתח', es: 'Menú' },
  ];
  return (
    <div className="mx-auto flex max-w-xs items-center justify-around rounded-2xl border border-line bg-raised px-2 py-2" aria-hidden>
      {items.slice(0, 2).map((i) => (
        <Tab key={i.id} i={i} on={i.id === activa} />
      ))}
      <span className="grid h-8 w-8 place-items-center rounded-full bg-gold font-serif text-lg text-[#1a140a]">+</span>
      {items.slice(2).map((i) => (
        <Tab key={i.id} i={i} on={i.id === activa} />
      ))}
    </div>
  );
}

function Tab({ i, on }: { i: { he: string; es: string }; on: boolean }) {
  return (
    <span className={`flex flex-col items-center rounded-lg px-1.5 py-1 ${on ? 'bg-[color-mix(in_srgb,var(--gold)_22%,transparent)] text-gold' : 'text-ink-faint'}`}>
      <span className="hebrew text-[12px] leading-none">{i.he}</span>
      <span className="mt-0.5 text-[8px] uppercase tracking-wider leading-none">{i.es}</span>
    </span>
  );
}

interface Paso {
  titulo: string;
  visual?: ReactNode;
  cuerpo: ReactNode;
}

const Em = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>;

const PASOS: Paso[] = [
  {
    titulo: 'Así funciona Avodah',
    visual: <div className="hebrew text-center text-4xl leading-snug text-gold">לעבוד את ה׳</div>,
    cuerpo: (
      <>
        <p>Un lugar para vivir tu día con Hashem. En un minuto te mostramos lo más importante.</p>
        <ol className="space-y-1.5">
          <li>
            <Em>1 · Registras</Em> lo que vives, rápido y sin juicio.
          </li>
          <li>
            <Em>2 · Te miras</Em> con verdad: tu día, tu semana, tu mes.
          </li>
          <li>
            <Em>3 · Te comprometes</Em> con kabalot: compromisos con fecha.
          </li>
        </ol>
        <p className="text-[13px] text-ink-faint">
          Lo que registras se queda <Em>solo en tu dispositivo</Em>. Nadie más lo ve.
        </p>
      </>
    ),
  },
  {
    titulo: 'Cómo registrar algo',
    visual: <BotonMas />,
    cuerpo: (
      <>
        <p>
          El botón dorado <Em>+</Em> está abajo, en el centro. Tócalo cada vez que pase algo: un acierto, una caída, una tefilá, un pensamiento.
        </p>
        <ol className="space-y-1.5">
          <li>
            <Em>1.</Em> Toca el <Em>+</Em>.
          </li>
          <li>
            <Em>2.</Em> Escribe con tus palabras (o elige el área).
          </li>
          <li>
            <Em>3.</Em> Guarda. La app lo ordena sola.
          </li>
        </ol>
        <p className="rounded-xl border border-line bg-[var(--bg-sunken)] p-3 text-[13px]">
          <Em>⚡ Toque rápido</Em> (arriba, a la derecha): eliges «victoria» o «caída» una vez y tocas las áreas. Sin escribir nada.
        </p>
      </>
    ),
  },
  {
    titulo: 'Hoy: tu día',
    visual: <BarraMini activa="hoy" />,
    cuerpo: (
      <>
        <p>
          <Em>Hoy</Em> es tu pantalla de cada día. Ahí encuentras:
        </p>
        <ul className="list-disc space-y-1.5 ps-5">
          <li>Los <Em>avisos</Em> del administrador, arriba.</li>
          <li>La <Em>kabalá de todos</Em>, con la pregunta «¿hoy cumpliste?».</li>
          <li>Tus <Em>mitzvot de hoy</Em>: toca cada una cuando la hagas y queda con ✓.</li>
        </ul>
      </>
    ),
  },
  {
    titulo: 'Kabalot: compromisos con fecha',
    visual: <div className="hebrew text-center text-4xl text-gold">קַבָּלָה</div>,
    cuerpo: (
      <>
        <p>
          Una kabalá es un compromiso con fecha: por ejemplo, <Em>30 días cuidando tu habla</Em>. Tú eliges qué y cuántos días.
        </p>
        <p>
          Cada día la app te pregunta si cumpliste. Si un día caes, no pasa nada: <Em>lo que sigue es el regreso</Em>, sin castigo.
        </p>
        <p className="rounded-xl border border-line bg-[var(--bg-sunken)] p-3 text-[13px]">
          En <Em>Hoy</Em> hay una <Em>kabalá para todos</Em>: toca «Acepto» y verás cuántas personas la tomaron contigo.
        </p>
      </>
    ),
  },
  {
    titulo: 'Torá y comunidad',
    visual: <BarraMini activa="tora" />,
    cuerpo: (
      <>
        <p>
          En <Em>Torá</Em> estudias con la biblioteca de Sefaria (parashá, Pirkei Avot, Mishná, Guemará) y lees <Em>Musar</Em>.
        </p>
        <p>
          En <Em>Comunidad</Em> lees lo que comparten los demás y puedes <Em>publicar tu propio dvar Torá, pirush o musar</Em>, con tu nombre o anónimo.
          Un administrador lo revisa antes de que se vea.
        </p>
      </>
    ),
  },
  {
    titulo: '¿Cómo estoy? e Historia',
    visual: <BarraMini activa="como" />,
    cuerpo: (
      <>
        <p>
          <Em>¿Cómo estoy?</Em> te muestra tu progreso: el ahora, la semana, el mes y el año, y cada número explica su «¿por qué?». Ahí también está tu enlace para invitar a otras personas.
        </p>
        <p>
          <Em>Historia</Em> guarda todos tus días y busca cualquier cosa que hayas escrito.
        </p>
      </>
    ),
  },
  {
    titulo: 'Menú: todo lo demás',
    visual: <BarraMini activa="menu" />,
    cuerpo: (
      <>
        <p>
          En <Em>Menú</Em>, abajo a la derecha, está todo lo demás: ajustes, tu misión, tus kabalot, recordatorios y cómo guardar una copia de tus datos.
        </p>
        <p className="rounded-xl border border-line bg-[var(--bg-sunken)] p-3 text-[13px]">
          Si quieres volver a ver esta guía: <Em>Menú → Cómo usar la app</Em>.
        </p>
      </>
    ),
  },
];

/**
 * @param onDone  se llama al terminar o al saltar la guía
 */
export default function Guia({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const paso = PASOS[i];
  const ultimo = i === PASOS.length - 1;

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-bg px-5 py-6">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col">
        <div className="flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.16em] text-ink-faint">
            Paso {i + 1} de {PASOS.length}
          </span>
          <button onClick={onDone} className="rounded-lg px-2 py-1 text-[13px] text-ink-faint underline underline-offset-2">
            Saltar guía
          </button>
        </div>

        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {PASOS.map((_, n) => (
            <span key={n} className={`h-1.5 rounded-full transition-all ${n === i ? 'w-6 bg-gold' : n < i ? 'w-1.5 bg-gold/60' : 'w-1.5 bg-line'}`} />
          ))}
        </div>

        <div className="flex flex-1 flex-col justify-center py-6">
          <Card className="space-y-5 p-6">
            {paso.visual && <div className="py-1">{paso.visual}</div>}
            <h1 className="text-center text-2xl leading-snug text-ink">{paso.titulo}</h1>
            <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">{paso.cuerpo}</div>
          </Card>
        </div>

        <div className="flex gap-3 pb-2">
          {i > 0 && (
            <Btn variant="ghost" onClick={() => setI(i - 1)} className="flex-1">
              Atrás
            </Btn>
          )}
          <Btn onClick={() => (ultimo ? onDone() : setI(i + 1))} className="flex-[2]">
            {ultimo ? 'Empezar' : 'Siguiente'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
