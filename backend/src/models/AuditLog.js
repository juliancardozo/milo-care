'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * AuditLog — registro inmutable de eventos sensibles (consentimiento, atestaciones,
 * exportes, certificados). Es el "registro de consentimientos" que exigen GDPR /
 * Ley 25.326 (AR) / Ley 18.331 (UY) y la base de auditoría del loop de certificación.
 *
 * Append-only por diseño: no se actualiza ni borra (salvo borrado de cuenta GDPR).
 */
const AUDIT_ACTIONS = [
  'consent_given',
  'consent_revoked',
  'attestation_signed',
  'attestation_revoked',
  'certificate_issued',
  'certificate_shared_with_partner',
  'data_exported',
  'data_deleted',
  'policy_linked',
  'insurance_lead_created',
  'claim_drafted',
];

const auditLogSchema = new Schema(
  {
    // Tutor (dueño de los datos) sobre el que ocurre el evento.
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true, index: true },
    // Contexto del evento (dogId, kind, itemId, clinicId, partnerId, scope, etc.).
    meta: { type: Schema.Types.Mixed, default: {} },
    at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
AuditLog.ACTIONS = AUDIT_ACTIONS;

module.exports = AuditLog;
