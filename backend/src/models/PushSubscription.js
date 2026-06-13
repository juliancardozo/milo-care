'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Suscripción Web Push de un navegador/dispositivo de un usuario.
 * Una por endpoint (único). Se limpia cuando el push devuelve 404/410 (expirada).
 */
const pushSubscriptionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    endpoint: { type: String, required: true, unique: true },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true },
    },
    userAgent: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
