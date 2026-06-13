'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Relación de referido (Fase 4).
 *
 * Un documento por invitado que se registró con un código. Pasa de `pending` a
 * `activated` cuando el invitado completa su PRIMER check-in (filtra cuentas
 * vacías). Al activarse, ambos (referente y referido) reciben 30 días de premium.
 */

const referralSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, index: true },
    referrerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // El referido se referencia una sola vez (índice único sparse).
    referredUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, sparse: true },
    referredEmail: { type: String, lowercase: true, trim: true, default: null },
    status: { type: String, enum: ['pending', 'activated'], default: 'pending', index: true },
    activatedAt: { type: Date, default: null },
    rewardGrantedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Referral', referralSchema);
