// Generador de tarjetas en canvas (Fase 3). Cliente puro, sin dependencias.
// Formatos Instagram (1080×1080) y stories (1080×1920). Crop centrado para
// cualquier proporción de foto. Si la foto no permite CORS, cae a un fondo de
// patitas (la tarjeta sigue siendo compartible).

export const FORMATS = {
  square: { w: 1080, h: 1080, label: 'Instagram (1:1)' },
  story: { w: 1080, h: 1920, label: 'Stories (9:16)' },
};

const PRIMARY = '#4f8ef7';
const GREEN = '#22c55e';

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

function pawPattern(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.font = '90px serif';
  ctx.textAlign = 'center';
  for (let yy = 120; yy < h; yy += 180) {
    for (let xx = 90; xx < w; xx += 180) {
      ctx.fillText('🐾', xx + (yy % 360 ? 0 : 90), yy);
    }
  }
  ctx.restore();
}

/**
 * Renderiza la tarjeta y devuelve el canvas.
 * @param {object} opts - { photoUrl, emoji, title, subtitle, referralCode, format }
 */
export async function renderCard({ photoUrl, emoji = '🐾', title = '', subtitle = '', referralCode = null, format = 'square' }) {
  const { w, h } = FORMATS[format] || FORMATS.square;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Fondo degradado de marca.
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, PRIMARY);
  grad.addColorStop(1, GREEN);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const photoH = Math.round(h * (format === 'story' ? 0.6 : 0.58));
  let hasPhoto = false;
  try {
    const img = await loadImage(photoUrl);
    drawCover(ctx, img, 0, 0, w, photoH);
    hasPhoto = true;
  } catch {
    pawPattern(ctx, w, h);
  }

  // Panel inferior para el texto (semitransparente sobre el degradado).
  const panelY = hasPhoto ? photoH - 40 : Math.round(h * 0.34);
  const fade = ctx.createLinearGradient(0, panelY - 80, 0, panelY + 120);
  fade.addColorStop(0, 'rgba(255,255,255,0)');
  fade.addColorStop(1, '#ffffff');
  ctx.fillStyle = fade;
  ctx.fillRect(0, panelY - 80, w, 200);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, panelY + 100, w, h - (panelY + 100));

  ctx.textAlign = 'center';

  // Emoji grande.
  ctx.font = '120px serif';
  ctx.fillText(emoji, w / 2, panelY + 150);

  // Título.
  ctx.fillStyle = '#1a1a2e';
  ctx.font = 'bold 68px -apple-system, Segoe UI, Roboto, sans-serif';
  let ty = panelY + 250;
  for (const line of wrapLines(ctx, title, w - 140)) {
    ctx.fillText(line, w / 2, ty);
    ty += 80;
  }

  // Subtítulo.
  ctx.fillStyle = '#475569';
  ctx.font = '42px -apple-system, Segoe UI, Roboto, sans-serif';
  ty += 12;
  for (const line of wrapLines(ctx, subtitle, w - 180)) {
    ctx.fillText(line, w / 2, ty);
    ty += 56;
  }

  // Código de referido (si la Fase 4 está activa).
  if (referralCode) {
    ctx.fillStyle = '#eff6ff';
    const pillW = 560; const pillX = (w - pillW) / 2; const pillY = h - 190;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, 70, 35);
    ctx.fill();
    ctx.fillStyle = PRIMARY;
    ctx.font = 'bold 34px -apple-system, Segoe UI, Roboto, sans-serif';
    ctx.fillText(`Sumate con ${referralCode}`, w / 2, pillY + 47);
  }

  // Branding.
  ctx.fillStyle = '#94a3b8';
  ctx.font = '34px -apple-system, Segoe UI, Roboto, sans-serif';
  ctx.fillText('🐾 milocare.app', w / 2, h - 70);

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
