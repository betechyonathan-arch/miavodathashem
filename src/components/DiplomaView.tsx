import { useEffect, useRef, useState } from 'react';
import { cargarLetras, diplomaPng, dibujarDiploma } from '../lib/diplomaCanvas';
import type { DiplomaDatos } from '../lib/diplomas';
import { Btn } from './ui';

/** El diploma dibujado. Con `acciones`, debajo salen «Guardar imagen» y «Compartir». */
export default function DiplomaView({ d, fecha, acciones = false }: { d: DiplomaDatos; fecha: string; acciones?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let alive = true;
    void cargarLetras().then(() => {
      if (!alive || !canvas.current) return;
      dibujarDiploma(canvas.current, d, fecha);
      setSrc(canvas.current.toDataURL('image/png'));
    });
    return () => {
      alive = false;
    };
  }, [d, fecha]);

  const archivo = `diploma-${(d.nombre || 'avodah').toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-')}.png`;

  async function guardar() {
    if (!canvas.current) return;
    const blob = await diplomaPng(canvas.current);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setMsg('Imagen guardada en tus descargas.');
  }

  async function compartir() {
    if (!canvas.current) return;
    const blob = await diplomaPng(canvas.current);
    if (!blob) return;
    const file = new File([blob], archivo, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: d.titulo, text: `${d.titulo} — ${d.nombre}` });
      } catch {
        /* la persona cerró el menú de compartir */
      }
    } else {
      await guardar();
      setMsg('Tu teléfono no permite compartir desde aquí: se guardó la imagen para que la mandes tú.');
    }
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvas} className="hidden" aria-hidden />
      {src ? (
        <img src={src} alt={`${d.titulo} para ${d.nombre}: ${d.motivo}`} className="w-full rounded-lg shadow-lg" />
      ) : (
        <div className="grid aspect-[3/4] w-full place-items-center rounded-lg border border-line bg-raised">
          <span className="hebrew text-xl text-gold">טוען…</span>
        </div>
      )}
      {acciones && src && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="ghost" onClick={() => void guardar()}>
              Guardar imagen
            </Btn>
            <Btn variant="ghost" onClick={() => void compartir()}>
              Compartir
            </Btn>
          </div>
          {msg && <p className="text-center text-[12px] text-ink-faint">{msg}</p>}
        </>
      )}
    </div>
  );
}
