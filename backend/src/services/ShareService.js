'use strict';

/**
 * ShareService — genera el texto y el link `wa.me` para compartir el resumen de
 * salud de un perro por WhatsApp. No envía nada: solo arma el contenido para que
 * el frontend abra WhatsApp con el mensaje prellenado.
 */

function buildWhatsappShare(dog, opts = {}) {
  const d = dog.toObject ? dog.toObject() : dog;
  const appName = opts.appName || 'Milo Care';
  const recordUrl = opts.recordUrl || null; // link público/expediente, si se provee

  const lines = [
    `🐾 Resumen de salud de ${d.name} (${appName})`,
    d.breed ? `Raza: ${d.breed}` : null,
    typeof d.weightKg === 'number' ? `Peso: ${d.weightKg} kg` : null,
    recordUrl ? `Ver expediente: ${recordUrl}` : null,
  ].filter(Boolean);

  const text = lines.join('\n');
  // wa.me espera el texto URL-encodeado. Sin número → abre el selector de contacto.
  const link = `https://wa.me/?text=${encodeURIComponent(text)}`;
  return { text, link };
}

module.exports = { buildWhatsappShare };
