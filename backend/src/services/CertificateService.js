'use strict';

const PetScoreCertificate = require('../models/PetScoreCertificate');
const VetAttestation = require('../models/VetAttestation');
const { deriveVerification } = require('./petScoreVerification');
const { computeHealthScore } = require('./healthScore');
const AuditService = require('./AuditService');

/**
 * CertificateService — emite y resuelve el PetScoreCertificate (snapshot inmutable
 * del Health Score + nivel de confianza). Requiere al menos una atestación
 * veterinaria (no se certifica un perro 'self'/auto-reportado).
 */

async function issue(dog, owner, { now = new Date(), streak = 0 } = {}) {
  const attestations = await VetAttestation.find({ dogId: dog._id, status: 'active' }).lean();
  const verification = deriveVerification(attestations, now);

  if (verification.level === 'self') {
    const err = new Error('El perro necesita al menos una verificación veterinaria antes de certificar.');
    err.status = 400;
    err.code = 'NEEDS_VERIFICATION';
    throw err;
  }

  const { score, grade } = computeHealthScore(dog, { now, streak });

  // Inmutable: el certificado anterior queda "superseded", se emite uno nuevo.
  await PetScoreCertificate.updateMany({ dogId: dog._id, status: 'active' }, { $set: { status: 'superseded' } });

  const cert = await PetScoreCertificate.create({
    dogId: dog._id,
    ownerUserId: owner._id,
    scoreSnapshot: { score, grade: grade.label },
    confidenceLevel: verification.level,
    certifiedBy: verification.certifiedBy,
    attestedCount: verification.attestedItems.length,
    attestedItems: verification.attestedItems.map((i) => ({ kind: i.kind, label: i.label, clinicName: i.clinicName })),
    issuedAt: now,
    validUntil: verification.validUntil,
    status: 'active',
  });

  AuditService.record({ userId: owner._id, action: 'certificate_issued', meta: { dogId: String(dog._id), certId: String(cert._id), level: verification.level } });
  return cert;
}

/** Certificado activo y vigente del perro (lo expira si venció). */
async function getActive(dogId, now = new Date()) {
  const cert = await PetScoreCertificate.findOne({ dogId, status: 'active' }).sort({ issuedAt: -1 });
  if (!cert) return null;
  if (cert.validUntil && new Date(cert.validUntil) <= now) {
    cert.status = 'expired';
    await cert.save();
    return null;
  }
  return cert;
}

/**
 * Vista que recibe la ASEGURADORA: SOLO nivel + vigencia + emisor. Nunca el score
 * numérico ni el detalle clínico de los ítems.
 */
function shareableView(cert) {
  return {
    confidenceLevel: cert.confidenceLevel,
    certifiedBy: cert.certifiedBy || null,
    attestedCount: cert.attestedCount,
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    status: cert.status,
  };
}

module.exports = { issue, getActive, shareableView };
