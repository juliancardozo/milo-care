// Generador de tarjetas en canvas (Fase 3). Cliente puro, sin dependencias.
// Formatos Instagram (1080×1080) y stories (1080×1920). Crop centrado para
// cualquier proporción de foto. Si la foto no permite CORS, cae a un fondo de
// patitas (la tarjeta sigue siendo compartible).

export const FORMATS = {
  square: { w: 1080, h: 1080, label: 'Instagram (1:1)' },
  story: { w: 1080, h: 1920, label: 'Stories (9:16)' },
};

function loadImage(url) {
  return new Promise((resolve, reject) => {
    if (!url) return reject(new Error('no url'));
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image load failed'));
    img.src = url;
  });
}

// Dibuja una imagen cubriendo (cover) el rectángulo destino, recorte centrado.
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height;
  const r = w / h;
  let sx = 0; let sy = 0; let sw = img.width; let sh = img.height;
  if (ir > r) { sw = img.height * r; sx = (img.width - sw) / 2; }
  else { sh = img.width / r; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function wrapLines(ctx, text, maxWidth) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const FONT = '-apple-system, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

// Fondo elegante de marca cuando no hay foto (o falla CORS).
function brandBackground(ctx, w, h, emoji) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#5b9bff');
  g.addColorStop(1, '#1f9d6b');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Emoji marca de agua, grande y muy sutil, descentrado (editorial).
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.font = `${Math.round(w * 0.66)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji || '🐾', w * 0.72, h * 0.34);
  ctx.restore();
}

/**
 * Renderiza la tarjeta y devuelve el canvas.
 * Diseño minimalista editorial: foto a sangre completa + scrim inferior +
 * tipografía sobria alineada abajo a la izquierda. Calidad para compartir.
 * @param {object} opts - { photoUrl, emoji, title, subtitle, referralCode, format }
 */
export async function renderCard({ photoUrl, emoji = '🐾', title = '', subtitle = '', referralCode = null, format = 'square' }) {
  const { w, h } = FORMATS[format] || FORMATS.square;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // 1) Imagen a sangre completa (cover, recorte centrado) o fondo de marca.
  try {
    const img = await loadImage(photoUrl);
    drawCover(ctx, img, 0, 0, w, h);
  } catch {
    brandBackground(ctx, w, h, emoji);
  }

  // 2) Scrims para legibilidad: leve arriba (marca) y fuerte abajo (texto).
  const topScrim = ctx.createLinearGradient(0, 0, 0, h * 0.28);
  topScrim.addColorStop(0, 'rgba(0,0,0,0.38)');
  topScrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, w, h * 0.28);

  const botScrim = ctx.createLinearGradient(0, h * 0.42, 0, h);
  botScrim.addColorStop(0, 'rgba(15,23,42,0)');
  botScrim.addColorStop(0.55, 'rgba(15,23,42,0.55)');
  botScrim.addColorStop(1, 'rgba(15,23,42,0.92)');
  ctx.fillStyle = botScrim;
  ctx.fillRect(0, h * 0.42, w, h * 0.58);

  const pad = Math.round(w * 0.085);
  const maxText = w - pad * 2;

  // 3) Marca arriba a la izquierda.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `700 ${Math.round(w * 0.032)}px ${FONT}`;
  ctx.fillText('🐾  Milo Care', pad, Math.round(h * 0.072));

  // 4) Medir el bloque de texto inferior para anclarlo abajo.
  const emojiSize = Math.round(w * 0.085);
  const titleSize = Math.round(w * 0.072);
  const titleLH = Math.round(titleSize * 1.12);
  const subSize = Math.round(w * 0.038);
  const subLH = Math.round(subSize * 1.34);
  const pillH = Math.round(w * 0.066);

  ctx.font = `800 ${titleSize}px ${FONT}`;
  const titleLines = wrapLines(ctx, title, maxText);
  ctx.font = `400 ${subSize}px ${FONT}`;
  const subLines = subtitle ? wrapLines(ctx, subtitle, maxText) : [];

  const gapEmoji = Math.round(w * 0.022);
  const gapTitleSub = Math.round(w * 0.018);
  const gapPill = Math.round(w * 0.03);
  const blockH = emojiSize + gapEmoji
    + titleLines.length * titleLH
    + (subLines.length ? gapTitleSub + subLines.length * subLH : 0)
    + (referralCode ? gapPill + pillH : 0);

  const bottomPad = Math.round(h * 0.085);
  let y = h - bottomPad - blockH;

  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = Math.round(w * 0.02);
  ctx.shadowOffsetY = 2;

  // Emoji accent (chico, sobrio).
  ctx.font = `${emojiSize}px serif`;
  ctx.fillStyle = '#fff';
  ctx.fillText(emoji, pad, y);
  y += emojiSize + gapEmoji;

  // Título.
  ctx.font = `800 ${titleSize}px ${FONT}`;
  ctx.fillStyle = '#ffffff';
  for (const line of titleLines) { ctx.fillText(line, pad, y); y += titleLH; }

  // Subtítulo.
  if (subLines.length) {
    y += gapTitleSub;
    ctx.font = `400 ${subSize}px ${FONT}`;
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    for (const line of subLines) { ctx.fillText(line, pad, y); y += subLH; }
  }

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 5) Código de referido como pill sobria translúcida.
  if (referralCode) {
    y += gapPill;
    ctx.font = `700 ${Math.round(w * 0.034)}px ${FONT}`;
    const label = `Sumate con ${referralCode}`;
    const tw = ctx.measureText(label).width;
    const pillW = tw + Math.round(w * 0.075);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(pad, y, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, pad + Math.round(w * 0.0375), y + pillH / 2 + 1);
  }

  // 6) milocare.org abajo a la derecha, discreto.
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `600 ${Math.round(w * 0.028)}px ${FONT}`;
  ctx.fillText('milocare.org', w - pad, h - Math.round(h * 0.038));

  return canvas;
}

export function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export async function downloadCard(canvas, filename = 'milo-care.png') {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Comparte vía Web Share API (con archivo) y cae a descarga si no está disponible.
 * @returns {Promise<'shared'|'downloaded'>}
 */
export async function shareCard(canvas, { title = 'Milo Care', text = '', filename = 'milo-care.png' } = {}) {
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title, text });
      return 'shared';
    } catch {
      // usuario canceló o falló: caemos a descarga
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return 'downloaded';
}
