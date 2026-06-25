'use strict';

const Consent = require('../models/Consent');
const AuditService = require('./AuditService');

// Clave lógica de un consentimiento: (perro, alcance, partner).
function key(dogId, scope, partnerId) {
  return { dogId, scope, partnerId: partnerId || null };
}

/**
 * Otorga (o renueva) un consentimiento. Revoca el activo previo del mismo
 * (perro, alcance, partner) y crea uno nuevo. Escribe AuditLog `consent_given`.
 */
async function grant({ ownerUser, dogId, scope, partnerId = null, expiresAt = null }) {
  await Consent.updateMany(
    { ...key(dogId, scope, partnerId), status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date() } },
  );
  const consent = await Consent.create({
    ownerUserId: ownerUser._id, dogId, scope, partnerId: partnerId || null,
    grantedAt: new Date(), expiresAt: expiresAt ? new Date(expiresAt) : null, status: 'active',
  });
  AuditService.record({ userId: ownerUser._id, action: 'consent_given', meta: { dogId: String(dogId), scope, partnerId: partnerId ? String(partnerId) : null } });
  return consent;
}

/** Revoca el/los consentimientos activos del (perro, alcance, partner). */
async function revoke({ ownerUser, dogId, scope, partnerId = null }) {
  const res = await Consent.updateMany(
    { ...key(dogId, scope, partnerId), status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date() } },
  );
  AuditService.record({ userId: ownerUser._id, action: 'consent_revoked', meta: { dogId: String(dogId), scope, partnerId: partnerId ? String(partnerId) : null } });
  return res.modifiedCount || 0;
}

/** ¿Hay un consentimiento activo y vigente para (perro, alcance, partner)? */
async function hasConsent(dogId, scope, partnerId = null, now = new Date()) {
  const consent = await Consent.findOne({ ...key(dogId, scope, partnerId), status: 'active' });
  if (!consent) return false;
  if (consent.expiresAt && new Date(consent.expiresAt) <= now) return false;
  return true;
}

async function listForDog(dogId) {
  return Consent.find({ dogId, status: 'active' }).lean();
}

module.exports = { grant, revoke, hasConsent, listForDog };
