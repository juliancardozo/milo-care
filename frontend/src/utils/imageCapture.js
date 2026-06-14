// Captura/compresión de imágenes en el cliente (sin servicio de subida).
// La foto de la cámara/galería se redimensiona y comprime a JPEG para guardarla
// como data-URL razonable (los perfiles/álbum guardan photoUrl como string).

export function isMobile() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const coarse = typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(pointer: coarse)').matches
    : false;
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) || coarse;
}

// Tamaño objetivo del data-URL resultante. Mantenerlo holgado bajo el límite del
// body parser del backend (10mb) para que el guardado nunca falle por payload.
const DEFAULT_MAX_BYTES = 1_500_000; // ~1.5MB de data-URL

// Largo aproximado en bytes de lo que pesará un data-URL base64 al viajar en el body.
function dataUrlByteLength(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return comma === -1 ? dataUrl.length : dataUrl.length - comma - 1;
}

/**
 * Lee un File de imagen, lo redimensiona (lado máximo `maxDim`) y devuelve un
 * data-URL JPEG comprimido. Si el resultado supera `maxBytes`, baja la calidad
 * (y luego la dimensión) iterativamente hasta entrar en el objetivo, de modo que
 * el guardado no falle por payload demasiado grande.
 * @returns {Promise<string>}
 */
export function fileToCompressedDataUrl(file, maxDim = 1080, quality = 0.82, maxBytes = DEFAULT_MAX_BYTES) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith('image/')) {
      reject(new Error('not an image'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('read failed'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('decode failed'));
      img.onload = () => {
        try {
          let dim = maxDim;
          let dataUrl = '';
          // Hasta 4 reducciones de dimensión; en cada una bajamos calidad si hace falta.
          for (let attempt = 0; attempt < 4; attempt += 1) {
            let { width, height } = img;
            if (width >= height && width > dim) {
              height = Math.round((height * dim) / width);
              width = dim;
            } else if (height > width && height > dim) {
              width = Math.round((width * dim) / height);
              height = dim;
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            let q = quality;
            dataUrl = canvas.toDataURL('image/jpeg', q);
            while (dataUrlByteLength(dataUrl) > maxBytes && q > 0.4) {
              q -= 0.12;
              dataUrl = canvas.toDataURL('image/jpeg', q);
            }
            if (dataUrlByteLength(dataUrl) <= maxBytes) break;
            dim = Math.round(dim * 0.75); // todavía grande: achicar y reintentar
          }
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
