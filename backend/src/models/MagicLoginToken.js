'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Token de login sin contraseña ("magic link"). Espeja PasswordResetToken pero
// con TTL corto (15 min) porque inicia sesión directamente: token hasheado en
// reposo, de un solo uso (usedAt) y con índice TTL que lo borra al expirar.
const magicLoginTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MagicLoginToken', magicLoginTokenSchema);
