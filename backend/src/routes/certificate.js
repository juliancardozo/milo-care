'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const CertificateService = require('../services/CertificateService');
const ConsentService = require('../services/ConsentService');
const AuditService = require('../services/AuditService');
const WebhookService = require('../services/WebhookService');
const Partner = require('../models/Partner');

const router = express.Router({ mergeParams: true });

const SHARE_SCOPE = 'share_certificate_with_partner';

function resolvePartnerId(owner, dog, body) {
  return body?.partnerId || dog.partnerId || owner.partnerId || null;
}

function certResponse(cert) {
  return {
    id: cert._id,
    confidenceLevel: cert.confidenceLevel,
    score: cert.scoreSnapshot?.score ?? null,
    grade: cert.scoreSnapshot?.grade ?? null,
    certifiedBy: cert.certifiedBy || null,
    attestedCount: cert.attestedCount,
    attestedItems: cert.attestedItems || [],
    issuedAt: cert.issuedAt,
    validUntil: cert.validUntil,
    status: cert.status,
  };
}

// ── POST /api/dogs/:dogId/certificate — emite el certificado ────────────────
router.post('/certificate', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const cert = await CertificateService.issue(found.dog, found.owner);
    return res.status(201).json(certResponse(cert));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dogs/:dogId/certificate — certificado vigente (vista del tutor) ─
router.get('/certificate', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const cert = await CertificateService.getActive(found.dog._id);
    if (!cert) return res.status(404).json({ code: 'NO_CERTIFICATE', message: 'No active certificate.' });
    return res.json(certResponse(cert));
  } catch (err) {
    next(err);
  }
});

// ── Consentimiento granular ─────────────────────────────────────────────────
router.get('/consent', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const consents = await ConsentService.listForDog(found.dog._id);
    return res.json({ consents });
  } catch (err) {
    next(err);
  }
});

router.post('/consent', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;
    const scope = req.body?.scope || SHARE_SCOPE;
    if (!['share_certificate_with_partner', 'share_record_with_vet'].includes(scope)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'invalid scope.' });
    }
    const partnerId = resolvePartnerId(owner, dog, req.body);
    const consent = await ConsentService.grant({ ownerUser: owner, dogId: dog._id, scope, partnerId, expiresAt: req.body?.expiresAt || null });
    return res.status(201).json({ id: consent._id, scope: consent.scope, partnerId: consent.partnerId, status: consent.status, expiresAt: consent.expiresAt });
  } catch (err) {
    next(err);
  }
});

router.delete('/consent', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;
    const scope = req.body?.scope || req.query.scope || SHARE_SCOPE;
    const partnerId = resolvePartnerId(owner, dog, req.body);
    const revoked = await ConsentService.revoke({ ownerUser: owner, dogId: dog._id, scope, partnerId });
    return res.json({ revoked });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/dogs/:dogId/certificate/share — comparte el NIVEL con el partner ─
// Requiere certificado vigente + consentimiento activo para ese partner.
router.post('/certificate/share', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;

    const partnerId = resolvePartnerId(owner, dog, req.body);
    if (!partnerId) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'partnerId is required.' });

    const cert = await CertificateService.getActive(dog._id);
    if (!cert) return res.status(404).json({ code: 'NO_CERTIFICATE', message: 'No active certificate to share.' });

    const consented = await ConsentService.hasConsent(dog._id, SHARE_SCOPE, partnerId);
    if (!consented) return res.status(403).json({ code: 'NO_CONSENT', message: 'No active consent to share with this partner.' });

    const view = CertificateService.shareableView(cert);
    let delivered = false;
    const partner = await Partner.findById(partnerId).select('webhookUrl');
    if (partner?.webhookUrl) {
      const result = await WebhookService.deliver(partner.webhookUrl, { event: 'certificate.shared', dogId: String(dog._id), ...view });
      delivered = result.ok;
    }

    AuditService.record({ userId: owner._id, action: 'certificate_shared_with_partner', meta: { dogId: String(dog._id), partnerId: String(partnerId), level: cert.confidenceLevel } });
    return res.json({ shared: delivered, certificate: view });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
