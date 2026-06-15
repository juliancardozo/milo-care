'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Invitación a co-tutor (Premium). Vive aparte del User porque el invitado puede
// no tener cuenta todavía: se busca por email/token, no por userId. Calca el
// patrón de PasswordResetToken (tokenHash + TTL). Al aceptarse, se materializa
// como un caregiver embebido en el perro y la invitación queda 'accepted'.
const coTutorInviteSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    dogName: { type: String, trim: true, default: '' }, // snapshot para el email/UX
    inviterName: { type: String, trim: true, default: '' }, // snapshot del que invita
    inviteeEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked'], default: 'pending', index: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
    // TTL: las invitaciones pendientes expiran solas. 14 días desde la creación.
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CoTutorInvite', coTutorInviteSchema);
