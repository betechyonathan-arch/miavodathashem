/*
  Dibuja un diploma en un <canvas> (1200 × 1600, vertical). Es el único dibujo del diploma: el
  mismo sirve para mostrarlo en pantalla, para guardarlo como imagen y para compartirlo.
*/
import { HDate } from '@hebcal/core';
import type { DiplomaDatos, TemaDiploma } from './diplomas';

export const ANCHO = 1200;
export const ALTO = 1600;

const SERIF = "'Frank Ruhl Libre', Georgia, 'Times New Roman', serif";
const SANS = "'Assistant', 'Segoe UI', system-ui, sans-serif";

const PALETAS: Record<TemaDiploma, { acento: string; suave: string; fondo1: string; fondo2: string }> = {
  oro: { acento: '#a8791f', suave: '#d9b45f', fondo1: '#fbf4e2', fondo2: '#efe0bc' },
  azul: { acento: '#24507d', suave: '#7fa3c8', fondo1: '#f5f7fb', fondo2: '#dfe7f1' },
  esmeralda: { acento: '#226b4c', suave: '#7db89c', fondo1: '#f4f9f5', fondo2: '#dcebe1' },
  rubi: { acento: '#8c2433', suave: '#cf8b95', fondo1: '#fbf4f3', fondo2: '#f0dcdc' },
};
const TINTA = '#2a2118';
const TINTA_SUAVE = '#6b5d4c';

/** Fecha hebrea y civil del diploma. */
export function fechasDiploma(iso: string): { he: string; es: string } {
  const d = new Date(iso);
  let he = '';
  try {
    he = new HDate(d).renderGematriya(true);
  } catch {
    /* sin fecha hebrea: queda solo la civil */
  }
  return { he, es: d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }) };
}

/** Espera a que las letras del diploma estén cargadas (si no, el canvas usaría otra letra). */
export async function cargarLetras(): Promise<void> {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${SERIF}`, 'תעודה Diploma'),
      document.fonts.load(`400 32px ${SERIF}`, 'תעודה Diploma'),
      document.fonts.load(`400 26px ${SANS}`, 'Diploma'),
      document.fonts.load(`600 26px ${SANS}`, 'Diploma'),
    ]);
  } catch {
    /* sin red: se dibuja con la letra de respaldo */
  }
}

function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const out: string[] = [];
  for (const parrafo of texto.split('\n')) {
    const palabras = parrafo.split(/\s+/).filter(Boolean);
    if (palabras.length === 0) {
      out.push('');
      continue;
    }
    let linea = '';
    for (const p of palabras) {
      const prueba = linea ? `${linea} ${p}` : p;
      if (ctx.measureText(prueba).width > ancho && linea) {
        out.push(linea);
        linea = p;
      } else {
        linea = prueba;
      }
    }
    out.push(linea);
  }
  return out;
}

/**
 * Escribe un texto centrado y con saltos de línea, achicando la letra hasta que quepa en `alto`.
 * Devuelve dónde terminó (la `y` de abajo).
 */
function bloque(
  ctx: CanvasRenderingContext2D,
  texto: string,
  y: number,
  opts: { fuente: (px: number) => string; max: number; min: number; ancho: number; alto: number; color: string; rtl?: boolean; interlineado?: number; medir?: boolean },
): number {
  if (!texto.trim()) return y;
  let px = opts.max;
  let ls: string[] = [];
  for (; px >= opts.min; px -= 2) {
    ctx.font = opts.fuente(px);
    ls = lineas(ctx, texto, opts.ancho);
    if (ls.length * px * (opts.interlineado ?? 1.35) <= opts.alto) break;
  }
  px = Math.max(px, opts.min);
  ctx.font = opts.fuente(px);
  const lh = px * (opts.interlineado ?? 1.35);
  const maxLineas = Math.max(1, Math.floor(opts.alto / lh));
  if (ls.length > maxLineas) {
    ls = ls.slice(0, maxLineas);
    ls[maxLineas - 1] = ls[maxLineas - 1].replace(/\s*\S*$/, '') + '…';
  }
  if (opts.medir) return y + ls.length * lh;
  ctx.fillStyle = opts.color;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.direction = opts.rtl ? 'rtl' : 'ltr';
  ls.forEach((l, i) => ctx.fillText(l, ANCHO / 2, y + i * lh));
  ctx.direction = 'ltr';
  return y + ls.length * lh;
}

function adorno(ctx: CanvasRenderingContext2D, y: number, color: string, ancho = 260) {
  const x = ANCHO / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - ancho / 2, y);
  ctx.lineTo(x - 18, y);
  ctx.moveTo(x + 18, y);
  ctx.lineTo(x + ancho / 2, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 9);
  ctx.lineTo(x + 9, y);
  ctx.lineTo(x, y + 9);
  ctx.lineTo(x - 9, y);
  ctx.closePath();
  ctx.fill();
}

function esquina(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 90);
  ctx.lineTo(0, 0);
  ctx.lineTo(90, 0);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 34, 0, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function sello(ctx: CanvasRenderingContext2D, x: number, y: number, acento: string, suave: string) {
  ctx.save();
  // listones
  ctx.fillStyle = acento;
  for (const dx of [-26, 26]) {
    ctx.beginPath();
    ctx.moveTo(x + dx - 16, y + 30);
    ctx.lineTo(x + dx + 16, y + 30);
    ctx.lineTo(x + dx + 16, y + 120);
    ctx.lineTo(x + dx, y + 104);
    ctx.lineTo(x + dx - 16, y + 120);
    ctx.closePath();
    ctx.fill();
  }
  // disco con borde dentado
  ctx.beginPath();
  const puntas = 36;
  for (let i = 0; i <= puntas * 2; i++) {
    const r = i % 2 === 0 ? 82 : 74;
    const a = (i / (puntas * 2)) * Math.PI * 2;
    ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fillStyle = acento;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.strokeStyle = suave;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#fff8e8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.font = `700 38px ${SERIF}`;
  ctx.fillText('עבודה', x, y - 4);
  ctx.direction = 'ltr';
  ctx.font = `600 13px ${SANS}`;
  ctx.fillText('AVODAH', x, y + 30);
  ctx.restore();
}

/** Dibuja el diploma completo. `fecha` es la fecha en que se otorgó (ISO). */
export function dibujarDiploma(canvas: HTMLCanvasElement, d: DiplomaDatos, fecha: string): void {
  canvas.width = ANCHO;
  canvas.height = ALTO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const pal = PALETAS[d.tema] ?? PALETAS.oro;

  // Fondo tipo pergamino
  const g = ctx.createRadialGradient(ANCHO / 2, ALTO / 2, 200, ANCHO / 2, ALTO / 2, 1000);
  g.addColorStop(0, pal.fondo1);
  g.addColorStop(1, pal.fondo2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Marco doble y esquinas
  ctx.strokeStyle = pal.acento;
  ctx.lineWidth = 6;
  ctx.strokeRect(40, 40, ANCHO - 80, ALTO - 80);
  ctx.strokeStyle = pal.suave;
  ctx.lineWidth = 2;
  ctx.strokeRect(62, 62, ANCHO - 124, ALTO - 124);
  esquina(ctx, 84, 84, 1, 1, pal.acento);
  esquina(ctx, ANCHO - 84, 84, -1, 1, pal.acento);
  esquina(ctx, 84, ALTO - 84, 1, -1, pal.acento);
  esquina(ctx, ANCHO - 84, ALTO - 84, -1, -1, pal.acento);

  const ancho = ANCHO - 300;
  let y = 150;

  // Encabezado: בס״ד
  ctx.fillStyle = TINTA_SUAVE;
  ctx.font = `400 22px ${SERIF}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.direction = 'rtl';
  ctx.fillText('בס״ד', ANCHO - 110, 100);
  ctx.direction = 'ltr';

  if (d.titulo_he.trim()) {
    y = bloque(ctx, d.titulo_he, y, { fuente: (px) => `700 ${px}px ${SERIF}`, max: 76, min: 44, ancho, alto: 110, color: pal.acento, rtl: true, interlineado: 1.2 });
    y += 14;
  }
  y = bloque(ctx, d.titulo.toUpperCase(), y, { fuente: (px) => `600 ${px}px ${SERIF}`, max: 46, min: 28, ancho, alto: 120, color: TINTA, interlineado: 1.25 });
  y += 36;
  adorno(ctx, y, pal.acento);
  y += 48;

  // Cuerpo (nombre, motivo y mensaje): se mide primero y se centra en el espacio que queda, para
  // que un diploma con poco texto no deje un hueco abajo.
  const conPasuk = !!(d.pasuk_he.trim() || d.pasuk_es.trim());
  const limite = conPasuk ? 1090 : 1300;
  const cuerpo = (y0: number, medir: boolean): number => {
    let yy = bloque(ctx, 'Se otorga con honor a', y0, { fuente: (px) => `400 ${px}px ${SANS}`, max: 28, min: 28, ancho, alto: 40, color: TINTA_SUAVE, medir });
    yy += 22;
    yy = bloque(ctx, d.nombre, yy, { fuente: (px) => `700 ${px}px ${SERIF}`, max: 84, min: 44, ancho, alto: 200, color: TINTA, interlineado: 1.15, medir });
    yy += 26;
    if (!medir) {
      ctx.strokeStyle = pal.suave;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ANCHO / 2 - 300, yy);
      ctx.lineTo(ANCHO / 2 + 300, yy);
      ctx.stroke();
    }
    yy += 40;
    yy = bloque(ctx, d.motivo, yy, { fuente: (px) => `400 ${px}px ${SERIF}`, max: 38, min: 24, ancho, alto: 240, color: TINTA, interlineado: 1.4, medir });
    if (d.mensaje.trim()) {
      yy += 28;
      yy = bloque(ctx, d.mensaje, yy, { fuente: (px) => `italic 400 ${px}px ${SERIF}`, max: 30, min: 20, ancho, alto: limite - yy, color: TINTA_SUAVE, interlineado: 1.4, medir });
    }
    return yy;
  };
  const sobra = limite - cuerpo(y, true);
  y = cuerpo(y + Math.max(0, Math.min(sobra / 2, 320)), false);

  // Pasuk (abajo, antes de las firmas)
  // Cabe entre el texto y el sello (que empieza en ~1335).
  if (conPasuk) {
    let py = Math.min(Math.max(y + 40, 1110), 1130);
    adorno(ctx, py, pal.suave, 180);
    py += 26;
    py = bloque(ctx, d.pasuk_he, py, { fuente: (px) => `400 ${px}px ${SERIF}`, max: 34, min: 22, ancho, alto: 80, color: pal.acento, rtl: true, interlineado: 1.3 });
    py = bloque(ctx, d.pasuk_es, py + 6, { fuente: (px) => `italic 400 ${px}px ${SERIF}`, max: 24, min: 18, ancho, alto: 56, color: TINTA_SUAVE, interlineado: 1.3 });
    bloque(ctx, d.pasuk_ref, py + 4, { fuente: (px) => `600 ${px}px ${SANS}`, max: 18, min: 16, ancho, alto: 26, color: TINTA_SUAVE });
  }

  // Pie: fecha a la izquierda, sello al centro, firma a la derecha
  const pie = 1430;
  const f = fechasDiploma(fecha);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = TINTA;
  if (f.he) {
    ctx.direction = 'rtl';
    ctx.font = `400 28px ${SERIF}`;
    ctx.fillText(f.he, 300, pie);
    ctx.direction = 'ltr';
  }
  ctx.font = `400 20px ${SANS}`;
  ctx.fillStyle = TINTA_SUAVE;
  ctx.fillText(f.es, 300, pie + 32);
  ctx.strokeStyle = TINTA_SUAVE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(180, pie + 48);
  ctx.lineTo(420, pie + 48);
  ctx.stroke();
  ctx.font = `600 15px ${SANS}`;
  ctx.fillText('FECHA', 300, pie + 72);

  const firma = d.firma.trim() || 'Avodah · עבודה';
  ctx.fillStyle = TINTA;
  ctx.font = `italic 400 30px ${SERIF}`;
  let fpx = 30;
  while (ctx.measureText(firma).width > 280 && fpx > 16) {
    fpx -= 2;
    ctx.font = `italic 400 ${fpx}px ${SERIF}`;
  }
  ctx.fillText(firma, 900, pie + 20);
  ctx.strokeStyle = TINTA_SUAVE;
  ctx.beginPath();
  ctx.moveTo(780, pie + 48);
  ctx.lineTo(1020, pie + 48);
  ctx.stroke();
  ctx.fillStyle = TINTA_SUAVE;
  ctx.font = `600 15px ${SANS}`;
  ctx.fillText('FIRMA', 900, pie + 72);

  sello(ctx, ANCHO / 2, pie - 10, pal.acento, pal.suave);
}

/** El diploma como archivo PNG (para guardar o compartir). */
export function diplomaPng(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((res) => canvas.toBlob((b) => res(b), 'image/png'));
}
