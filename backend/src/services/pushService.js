'use strict';

const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

/**
 * Notificaciones Web Push (VAPID). Self-hosted, sin SaaS.
 *
 * Si faltan las claves VAPID, el servicio queda inactivo (no lanza): permite correr
 * el resto de la app sin configurarlo. Las suscripciones expiradas (404/410) se
 * limpian solas al enviar.
 */

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hola@milocare.online';

let configured = false;
if (PUBLIC_KEY && PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
    configured = true;
  } catch (err) {
    console.error('[push] VAPID config inválida:', err.message);
  }
}

function isConfigured() {
  return configured;
}

function getPublicKey() {
  return PUBLIC_KEY || null;
}

/** Guarda (upsert por endpoint) la suscripción de un usuario. */
async function saveSubscription(userId, subscription, userAgent = '') {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new Error('Invalid push subscription.');
  }
  await PushSubscription.updateOne(
    { endpoint: subscription.endpoint },
    {
      $set: {
        userId,
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        userAgent,
      },
    },
    { upsert: true }
  );
}

async function removeSubscription(userId, endpoint) {
  if (!endpoint) return;
  await PushSubscription.deleteOne({ userId, endpoint });
}

/** Borra todas las suscripciones de un usuario (GDPR / opt-out total). */
async function removeAllForUser(userId) {
  await PushSubscription.deleteMany({ userId });
}

/**
 * Envía un push a todas las suscripciones del usuario. No lanza; limpia las
 * suscripciones expiradas. Devuelve cuántas se entregaron.
 */
async function sendToUser(userId, payload) {
  if (!configured) return 0;
  const subs = await PushSubscription.find({ userId }).lean();
  if (!subs.length) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        body
      );
      delivered += 1;
    } catch (err) {
      const status = err.statusCode;
      if (status === 404 || status === 410) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
      } else {
        console.error(`[push] envío falló (${status}): ${err.message}`);
      }
    }
  }));

  return delivered;
}

async function hasSubscription(userId) {
  if (!configured) return false;
  const count = await PushSubscription.countDocuments({ userId });
  return count > 0;
}

module.exports = {
  isConfigured,
  getPublicKey,
  saveSubscription,
  removeSubscription,
  removeAllForUser,
  sendToUser,
  hasSubscription,
};
