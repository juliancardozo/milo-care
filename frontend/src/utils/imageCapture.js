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

/**
 * Lee un File de imagen, lo redimensiona (lado máximo `maxDim`) y devuelve un
 * data-URL JPEG comprimido.
 * @returns {Promise<string>}
 */
export function fileToCompressedDataUrl(file, maxDim = 1080, quality = 0.82) {
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
        let { width, height } = img;
        if (width >= height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        try {
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
