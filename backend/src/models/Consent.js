'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Consent — consentimiento granular, revocable y con vencimiento (Ley 25.326 AR /
 * 18.331 UY / GDPR). Cada cambio escribe además un AuditLog. El primer uso es
 * "compartir el nivel del certificado con un partner aseguradora".
 */
const CONSENT_SCOPES = ['share_certificate_with_partner', 'share_record_with_vet'];

const consentSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    scope: { type: String, enum: CONSENT_SCOPES, required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', default: null, index: true },
    grantedAt: { type: Date, default: Date.now },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active', index: true },
  },
  { timestamps: true }
);

const Consent = mongoose.model('Consent', consentSchema);
Consent.SCOPES = CONSENT_SCOPES;
module.exports = Consent;
