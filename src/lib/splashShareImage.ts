/*
  Genera una imagen (para el botón «Compartir» de la pantalla de entrada) con la foto de fondo
  que esté mostrando en ese momento, el lema en hebreo y el dvar Torá destacado (o el lema en
  español por defecto si no hay ninguno) — lista para mandar a un grupo de WhatsApp y demás.
  Mismo patrón que src/lib/musar/shareImage.ts (Web Share API con archivos; si el navegador no
  lo soporta, cae a descargar la imagen).
*/
import { KIND_LABEL, type PublicAporte } from './aportes';

const W = 1080;
const H = 1920;
const GOLD = '#e3bd6c';
const CREAM = 'rgba(247,241,226,0.92)';
const FAINT = 'rgba(247,241,226,0.65)';
const HEB_FONT = '"Frank Ruhl Libre", serif';
const BODY_FONT = '"Assistant", sans-serif';

/** Las fotos de fondo de la pantalla de entrada (todas de noche, tema Sucot — puestas a mano). */
export const SPLASH_BACKGROUNDS = [
  '/splash-sukot.jpg',
  '/splash-sukot-2.jpg',
  '/splash-sukot-3.jpg',
  '/splash-sukot-4.jpg',
  '/splash-sukot-5.jpg',
];

/** Una foto distinta cada día del año, sin guardar estado — así todos ven la misma en un mismo día. */
export function pickSplashBackground(): string {
  const d = new Date();
  const startOfYear = Date.UTC(d.getFullYear(), 0, 0);
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000);
  return SPLASH_BACKGROUNDS[dayOfYear % SPLASH_BACKGROUNDS.length];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    img.src = src;
  });
}

/** Dibuja `img` cubriendo todo el lienzo (recorta sobrante), como `background-size: cover`. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(W / img.width, H / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (W - w) / 2, (H - h) * 0.3, w, h);
}

async function ensureFontsReady() {
  try {
    await document.fonts.load(`600 64px ${HEB_FONT}`);
    await document.fonts.load(`400 38px ${BODY_FONT}`);
    await document.fonts.load(`600 30px ${BODY_FONT}`);
    await document.fonts.ready;
  } catch {
    /* si falla, el canvas dibuja con la fuente de respaldo del sistema */
  }
}

/** Parte `text` en líneas que caben en `maxWidth`, respetando saltos de línea explícitos. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (line && ctx.measureText(test).width > maxWidth) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
}

export interface SplashShareInput {
  bgSrc: string;
  featured: PublicAporte | null;
}

/** Dibuja la tarjeta de la pantalla de entrada (foto + lema/dvar Torá) y la devuelve como JPEG. */
export async function buildSplashShareImage({ bgSrc, featured }: SplashShareInput): Promise<Blob> {
  await ensureFontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sin contexto de canvas');

  let hasPhoto = false;
  try {
    const img = await loadImage(bgSrc);
    drawCover(ctx, img);
    hasPhoto = true;
  } catch {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#2a2318');
    grad.addColorStop(1, '#0d0b07');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // Mismo velo oscuro que el fondo en pantalla (ver Splash.tsx), para que el texto se lea igual.
  const scrim = ctx.createLinearGradient(0, 0, 0, H);
  scrim.addColorStop(0, 'rgba(13,11,7,0.55)');
  scrim.addColorStop(0.45, 'rgba(13,11,7,0.62)');
  scrim.addColorStop(0.8, 'rgba(10,8,5,0.86)');
  scrim.addColorStop(1, 'rgba(8,6,4,0.95)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 16;

  ctx.direction = 'rtl';
  ctx.fillStyle = GOLD;
  ctx.font = `600 62px ${HEB_FONT}`;
  ctx.fillText('לעבוד את ה׳ בכל דרכיך', W / 2, 260);

  // El bloque de abajo (lema o dvar Torá) se centra en el espacio libre entre el título y el pie.
  const marginX = 110;
  const contentW = W - marginX * 2;
  const top = 420;
  const bottom = H - 220;
  ctx.direction = 'ltr';

  const labelFont = `600 30px ${BODY_FONT}`;
  const bodyFont = `400 38px ${BODY_FONT}`;
  const sourceFont = `400 30px ${BODY_FONT}`;
  const bodyLineHeight = 56;

  let label = '';
  let bodyLines: string[] = [];
  let source = '';
  if (featured) {
    label = KIND_LABEL[featured.kind] + (featured.title ? ` · ${featured.title}` : '');
    ctx.font = bodyFont;
    bodyLines = wrapText(ctx, featured.body, contentW);
    source = `— ${featured.author_name ?? 'Anónimo'}${featured.source ? ` · ${featured.source}` : ''}`;
  } else {
    ctx.font = bodyFont;
    bodyLines = wrapText(ctx, 'Servir a Hashem en todos tus caminos', contentW);
  }

  const totalH = (label ? 70 : 0) + bodyLines.length * bodyLineHeight + (source ? 70 : 0);
  let y = Math.max(top, (top + bottom) / 2 - totalH / 2);

  if (label) {
    ctx.fillStyle = GOLD;
    ctx.font = labelFont;
    ctx.fillText(label, W / 2, y);
    y += 70;
  }
  ctx.fillStyle = CREAM;
  ctx.font = bodyFont;
  for (const l of bodyLines) {
    ctx.fillText(l, W / 2, y);
    y += bodyLineHeight;
  }
  if (source) {
    y += 14;
    ctx.fillStyle = FAINT;
    ctx.font = sourceFont;
    ctx.fillText(source, W / 2, y);
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.fillStyle = GOLD;
  ctx.font = `500 28px ${BODY_FONT}`;
  ctx.fillText('Avodah · miavodathashem.com', W / 2, H - 110);
  void hasPhoto;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob falló'))), 'image/jpeg', 0.92);
  });
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded';

/** Intenta abrir el selector nativo de compartir (WhatsApp incluido); si no se puede, descarga la imagen. */
export async function shareOrDownloadImage(blob: Blob, filename: string, shareTitle: string): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/jpeg' });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: shareTitle });
      return 'shared';
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') return 'cancelled';
      // cualquier otro error de share(): cae a descarga abajo
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
