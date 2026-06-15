'use strict';

const pushService = require('./pushService');
const User = require('../models/User');
const analytics = require('./analyticsService');

/**
 * Tubería única de notificaciones (Fase 1 — Notifications 2.0).
 *
 * Centraliza el envío respetando la preferencia de canal del usuario
 * (email / push / both) y agrega push a recordatorios que antes eran solo email.
 * También resuelve los destinatarios de un perro: dueño + co-tutores.
 *
 *   - channel 'email' → email
 *   - channel 'push'  → push (con fallback a email si no hay suscripción activa)
 *   - channel 'both'  → push + email
 *   - enabled === false → no se envía nada
 */

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

/** Resuelve qué canales aplican para un usuario según sus preferencias. */
function channelsFor(user) {
  const prefs = user.notificationPreferences || {};
  if (prefs.enabled === false) return { push: false, email: false, pushOnly: false };
  const channel = prefs.channel || 'email';
  return {
    push: channel === 'push' || channel === 'both',
    email: channel === 'email' || channel === 'both',
    pushOnly: channel === 'push',
  };
}

/**
 * Envía a UN usuario respetando su canal.
 * @param {object} user      documento User (con notificationPreferences y email)
 * @param {object} opts
 * @param {object} [opts.push]   payload push { type, title, body, data, actions }
 * @param {Function} [opts.email] thunk async que ejecuta el envío de email
 * @param {string} [opts.dogId]  para atribución de analytics (Fase 4)
 * @returns {Promise<{ push: number, email: boolean }>}
 */
async function dispatchToUser(user, { push, email, dogId } = {}) {
  const ch = channelsFor(user);
  if (!ch.push && !ch.email) return { push: 0, email: false };

  const campaign = push?.type;

  let pushDelivered = 0;
  if (ch.push && push) {
    // Token de clic (Fase 4): el SW lo reenvía a /api/notifications/clicked.
    // Va al dispositivo del propio usuario; ids para atribución, no PII libre.
    push.data = push.data || {};
    push.data.click = { u: String(user._id), d: dogId ? String(dogId) : null, c: campaign };
    pushDelivered = await pushService.sendToUser(user._id, push).catch((err) => {
      console.error('[Notif] push failed:', err.message);
      return 0;
    });
    if (pushDelivered > 0) {
      analytics.track('notification_sent', { userId: user._id, dogId, channel: 'push', meta: { campaign } });
    }
  }

  // Fallback: eligió solo push pero no llegó a ningún dispositivo → email igual.
  const fallbackEmail = ch.pushOnly && pushDelivered === 0;

  let emailSent = false;
  if ((ch.email || fallbackEmail) && email) {
    try {
      await email();
      emailSent = true;
      analytics.track('notification_sent', { userId: user._id, dogId, channel: 'email', meta: { campaign } });
    } catch (err) {
      console.error('[Notif] email failed:', err.message);
    }
  }

  return { push: pushDelivered, email: emailSent };
}

/**
 * Destinatarios de un perro: dueño + co-tutores (documentos User).
 */
async function resolveDogRecipients(ownerUser, dog) {
  const ids = (dog.caregivers || []).map((c) => c.userId);
  const caregivers = ids.length ? await User.find({ _id: { $in: ids } }) : [];
  return [ownerUser, ...caregivers];
}

/**
 * Envía una notificación al dueño y a todos los co-tutores de un perro.
 * `build(recipient)` devuelve { push, email } personalizado para ese destinatario.
 */
async function dispatchToDog(ownerUser, dog, build) {
  const recipients = await resolveDogRecipients(ownerUser, dog);
  for (const recipient of recipients) {
    await dispatchToUser(recipient, { ...build(recipient), dogId: dog._id });
  }
}

module.exports = {
  appUrl,
  channelsFor,
  dispatchToUser,
  resolveDogRecipients,
  dispatchToDog,
};
