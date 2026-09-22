import { useState, type ReactNode } from 'react';
import { Btn, Card } from './ui';

/*
  Guía de Retos. Sale UNA sola vez, la primera vez que alguien entra a la sección — a cuentas
  nuevas y a las que ya existían. No bloquea el resto de la app (a diferencia de la guía
  general): solo tapa la sección de Retos hasta que la persona la termine o la salte. Se puede
  volver a ver cuando se quiera desde Menú → «Cómo usar Retos».
*/

const Em = ({ children }: { children: ReactNode }) => <strong className="font-medium text-ink">{children}</strong>;

interface Paso {
  titulo: string;
  visual?: ReactNode;
  cuerpo: ReactNode;
}

const PASOS: Paso[] = [
  {
    titulo: 'Reta a quien quieras',
    visual: <div className="text-center text-4xl">🤝</div>,
    cuerpo: (
      <>
        <p>
          Un reto es un compromiso con fecha, pero entre dos o más personas: por ejemplo, <Em>«5 días sin decir groserías»</Em>. Búscalo
          por nombre para invitar a alguien, o manda el enlace por WhatsApp.
        </p>
        <p>
          <Em>Privado</Em>: solo entra quien invites. <Em>Público</Em>: cualquiera se suscribe, siempre anónimo, y un admin lo revisa
          antes.
        </p>
      </>
    ),
  },
  {
    titulo: 'Cuando alguien te reta',
    visual: <div className="text-center text-4xl">🔥</div>,
    cuerpo: (
      <>
        <p>Te va a salir un aviso arriba, en cualquier pantalla, con dos botones: «Aceptar» o «Eliminar».</p>
        <p>
          Si rechazas, no pasa nada — solo quien te invitó ve que dijiste que no. Puedes dejar un reto cuando quieras desde su pantalla,
          aunque ya lo hayas aceptado.
        </p>
      </>
    ),
  },
  {
    titulo: 'Todo es privado y personal',
    visual: <div className="text-center text-4xl">🔒</div>,
    cuerpo: (
      <>
        <p>
          Si todos los que participan son del mismo género, se ven los nombres entre ustedes. Si el reto queda <Em>mixto</Em> (hombres y
          mujeres), se vuelve <Em>anónimo</Em> para todos — nadie ve el nombre de nadie, ni siquiera quien lo creó.
        </p>
        <p className="rounded-xl border border-line bg-[var(--bg-sunken)] p-3 text-[13px]">
          Un admin solo ve las identidades para poder moderar (por ejemplo, si alguien denuncia). Nunca se muestra a otros usuarios.
        </p>
      </>
    ),
  },
  {
    titulo: 'Verse mutuamente, si ambos quieren',
    visual: <div className="text-center text-4xl">🤲</div>,
    cuerpo: (
      <>
        <p>
          En un reto anónimo puedes pedirle a alguien ver su nombre. La app <Em>siempre te va a preguntar antes de mostrar tu nombre</Em>:
          nada se revela solo porque uno lo pida.
        </p>
        <p>
          Solo cuando <Em>los dos</Em> aceptan verse, se muestran sus nombres — y solo entre ustedes dos, el resto del reto sigue
          anónimo. Si cualquiera cambia de opinión, se vuelve a ocultar para ambos.
        </p>
      </>
    ),
  },
  {
    titulo: 'Cadenas de Tehilim',
    visual: <div className="text-center text-4xl">📖</div>,
    cuerpo: (
      <>
        <p>
          Organiza o súmate a una cadena para completar el Tehilim entero entre todos (por la refuá de alguien, por ejemplo). Cada quien
          toma uno o más de los 150 capítulos, con su nombre o anónimo — tú eliges.
        </p>
        <p className="rounded-xl border border-line bg-[var(--bg-sunken)] p-3 text-[13px]">
          Si alguien se comporta mal en un reto, puedes <Em>denunciarlo</Em> desde su pantalla. Un admin lo revisa.
        </p>
      </>
    ),
  },
];

/**
 * @param onDone  se llama al terminar o al saltar la guía
 */
export default function RetosGuia({ onDone }: { onDone: () => void }) {
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
            {ultimo ? 'Entendido' : 'Siguiente'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
