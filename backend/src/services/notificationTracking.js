'use strict';

const Event = require('../models/Event');
const analytics = require('./analyticsService');

const CONVERSION_WINDOW_MS = 72 * 60 * 60 * 1000; // 72h: ventana de atribución

/**
 * Atribución de conversión (Fase 4): si el usuario completó una acción de cuidado
 * poco después de recibir una notificación de campaña relacionada, registra
 * `notification.converted`. Fire-and-forget: nunca bloquea ni lanza.
 *
 * @param {string} userId
 * @param {string|null} dogId
 * @param {string[]} campaigns - campañas cuya conversión cuenta para esta acción
 */
async function recordConversion(userId, dogId, campaigns) {
  try {
    if (!userId || !campaigns?.length) return;
    const since = new Date(Date.now() - CONVERSION_WINDOW_MS);
    const query = {
      type: 'notification.sent',
      userId,
      'payload.campaign': { $in: campaigns },
      ts: { $gte: since },
    };
    if (dogId) query.dogId = dogId;

    const sent = await Event.findOne(query).sort({ ts: -1 }).lean();
    if (!sent) return; // no hubo notificación reciente → no es conversión atribuible

    const campaign = sent.payload.campaign;
    // Idempotencia: una sola conversión por notificación (no recontar acciones repetidas).
    const already = await Event.findOne({
      type: 'notification.converted',
      userId,
      ...(dogId ? { dogId } : {}),
      'payload.campaign': campaign,
      ts: { $gte: sent.ts },
    }).lean();
    if (already) return;

    analytics.track('notification_converted', { userId, dogId: dogId || null, meta: { campaign } });
  } catch (err) {
    console.error('[NotifTracking] recordConversion failed:', err.message);
  }
}

module.exports = { recordConversion, CONVERSION_WINDOW_MS };
