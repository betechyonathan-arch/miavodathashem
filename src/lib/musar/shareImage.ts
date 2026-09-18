/*
  Genera una imagen (PNG, no PDF — el estado de WhatsApp solo acepta fotos y
  videos) del musar de la parashá, todo en hebreo, lista para compartir
  directo al estado de WhatsApp vía la Web Share API con archivos (abre el
  selector nativo del teléfono; ahí aparece WhatsApp como destino). Si el
  navegador no soporta compartir archivos (la mayoría de escritorio), cae a
  descargar la imagen.

  Fondo: una de tres escenas nocturnas de Beit Midrash (fotos reales que dio
  el usuario, en `public/musar-bg/`, excluidas del precache del service
  worker — no son necesarias offline). Se elige una distinta cada día del año
  para variar sin guardar estado. Si la imagen no carga (sin red la primera
  vez, o el archivo no está) se cae al fondo marfil/dorado de siempre.
*/

const W = 1080;
const H = 1920;
const GOLD = '#e3bd6c';
const CREAM = '#f7f1e2';
const FAINT = 'rgba(247,241,226,0.72)';
const HEB_FONT = '"Frank Ruhl Libre", serif';

const BACKGROUNDS = ['/musar-bg/bg-1.jpg', '/musar-bg/bg-2.jpg', '/musar-bg/bg-3.jpg'];

/** Una foto distinta cada día del año, sin guardar estado. */
function pickBackground(): string {
  const d = new Date();
  const startOfYear = Date.UTC(d.getFullYear(), 0, 0);
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000);
  return BACKGROUNDS[dayOfYear % BACKGROUNDS.length];
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
  ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
}

async function ensureFontsReady() {
  try {
    await document.fonts.load(`700 60px ${HEB_FONT}`);
    await document.fonts.load(`400 58px ${HEB_FONT}`);
    await document.fonts.ready;
  } catch {
    /* si falla, el canvas dibuja con la fuente serif de respaldo del sistema */
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
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
  if (line) lines.push(line);
  return lines;
}

export interface ShareCardInput {
  parashaHe: string;
  he: string;
  heRef: string;
  commentatorHe: string;
}

/** Dibuja la tarjeta de musar de la parashá (hebreo puro, sobre foto nocturna) y la devuelve como PNG. */
export async function buildParashaShareImage(input: ShareCardInput): Promise<Blob> {
  await ensureFontsReady();
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('sin contexto de canvas');

  let hasPhoto = false;
  try {
    const img = await loadImage(pickBackground());
    drawCover(ctx, img);
    hasPhoto = true;
  } catch {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#f7f1e4');
    grad.addColorStop(1, '#efe4cd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  if (hasPhoto) {
    // Velo oscuro para que el hebreo se lea encima de la foto, más denso donde vive el texto.
    const scrim = ctx.createLinearGradient(0, 0, 0, H);
    scrim.addColorStop(0, 'rgba(10,8,4,0.45)');
    scrim.addColorStop(0.32, 'rgba(10,8,4,0.35)');
    scrim.addColorStop(0.68, 'rgba(8,6,3,0.55)');
    scrim.addColorStop(1, 'rgba(6,4,2,0.75)');
    ctx.fillStyle = scrim;
    ctx.fillRect(0, 0, W, H);
  }

  const ink = hasPhoto ? CREAM : '#2a2118';
  const faint = hasPhoto ? FAINT : '#8a7a5e';

  const marginX = 96;
  const contentW = W - marginX * 2;
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  if (hasPhoto) {
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 18;
  }

  ctx.fillStyle = GOLD;
  ctx.font = `500 34px ${HEB_FONT}`;
  ctx.fillText('מוסר הפרשה', W / 2, 210);

  ctx.font = `700 56px ${HEB_FONT}`;
  ctx.fillText(input.parashaHe, W / 2, 292);

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 70, 332);
  ctx.lineTo(W / 2 + 70, 332);
  ctx.stroke();

  if (hasPhoto) {
    ctx.shadowColor = 'rgba(0,0,0,0.65)';
    ctx.shadowBlur = 16;
  }
  ctx.fillStyle = ink;
  ctx.font = `400 58px ${HEB_FONT}`;
  const lineHeight = 92;
  const lines = wrapText(ctx, input.he, contentW);
  const maxLines = 14; // deja aire para el pie aunque el pasuk sea largo
  const shown = lines.length > maxLines ? [...lines.slice(0, maxLines - 1), lines[maxLines - 1] + ' …'] : lines;
  const totalH = shown.length * lineHeight;
  let y = H / 2 - totalH / 2 + lineHeight / 2;
  for (const l of shown) {
    ctx.fillText(l, W / 2, y);
    y += lineHeight;
  }

  if (input.heRef) {
    ctx.fillStyle = faint;
    ctx.font = `500 34px ${HEB_FONT}`;
    ctx.fillText(input.heRef, W / 2, y + 44);
  }

  ctx.fillStyle = GOLD;
  ctx.font = `400 30px ${HEB_FONT}`;
  ctx.fillText('לַעֲבֹד אֶת ה׳ בְּכָל דְּרָכֶיךָ', W / 2, H - 110);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob falló'))), 'image/png', 0.95);
  });
}

export type ShareOutcome = 'shared' | 'cancelled' | 'downloaded';

/** Intenta abrir el selector nativo de compartir (WhatsApp incluido); si no se puede, descarga la imagen. */
export async function shareOrDownloadImage(
  blob: Blob,
  filename: string,
  shareTitle: string,
): Promise<ShareOutcome> {
  const file = new File([blob], filename, { type: 'image/png' });
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
