'use strict';

const express = require('express');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const PartnerEvent = require('../models/PartnerEvent');
const User = require('../models/User');
const VetAttestation = require('../models/VetAttestation');
const InsurancePolicy = require('../models/InsurancePolicy');
const InsuranceLead = require('../models/InsuranceLead');
const { deriveVerification } = require('../services/petScoreVerification');
const { isPetActive } = require('../services/petActivity');
const { monthKey } = require('../services/MeteringService');
const CertificateService = require('../services/CertificateService');
const ConsentService = require('../services/ConsentService');
const AuditService = require('../services/AuditService');

// Resuelve un perro que pertenece al partner de la API key (o null).
async function findPartnerDog(partnerId, dogId) {
  const owner = await User.findOne({ dogs: { $elemMatch: { _id: dogId, partnerId } } }).select('dogs');
  if (!owner) return null;
  return owner.dogs.id(dogId) || null;
}

// API v1 para partners — autenticada por API key, aislada por partner.
const router = express.Router();

// POST /api/v1/leads/:id/convert — el partner reporta que un lead se convirtió en
// póliza (CPA). Aislado: el lead debe ser del partner de la API key. Idempotente.
router.post('/leads/:id/convert', apiKeyAuth, async (req, res, next) => {
  try {
    const lead = await InsuranceLead.findOne({ _id: req.params.id, partnerId: req.partner._id });
    if (!lead) return res.status(404).json({ code: 'NOT_FOUND', message: 'Lead not found.' });

    if (lead.status !== 'converted') {
      lead.status = 'converted';
      lead.convertedAt = new Date();
      if (req.body?.policyRef) lead.externalPolicyRef = String(req.body.policyRef);
      await lead.save();

      // Rastro de auditoría: la conversión la auto-reporta el partner y dispara CPA,
      // así que dejamos registro de quién/qué/cuándo (para conciliar después).
      AuditService.record({
        userId: lead.userId,
        action: 'lead_converted',
        meta: {
          leadId: String(lead._id),
          partnerId: String(req.partner._id),
          policyRef: lead.externalPolicyRef || null,
          convertedAt: lead.convertedAt,
        },
      });
    }
    return res.json({ id: lead._id, status: lead.status, convertedAt: lead.convertedAt });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/events — el partner empuja un evento. Scoped a su partner.
router.post('/events', apiKeyAuth, async (req, res, next) => {
  try {
    const { type, payload } = req.body || {};
    if (!type) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'type is required.' });

    const event = await PartnerEvent.create({ partnerId: req.partner._id, type, payload: payload || {} });
    return res.status(201).json({ id: event._id, received: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/pets/:id — vista read-only y CONSENTIDA del perro (sin dato clínico
// individual). Aislada: el perro debe pertenecer al partner de la API key.
router.get('/pets/:id', apiKeyAuth, async (req, res, next) => {
  try {
    const owner = await User.findOne({
      dogs: { $elemMatch: { _id: req.params.id, partnerId: req.partner._id } },
    }).select('dogs');
    if (!owner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Pet not found.' });

    const dog = owner.dogs.id(req.params.id);
    if (!dog) return res.status(404).json({ code: 'NOT_FOUND', message: 'Pet not found.' });

    const attestations = await VetAttestation.find({ dogId: dog._id }).lean();
    const verification = deriveVerification(attestations);
    const policy = await InsurancePolicy.findOne({ dogId: dog._id }).select('status productName');

    // Solo datos consentidos / no clínicos: nada de vacunas, síntomas ni historial.
    return res.json({
      id: String(dog._id),
      name: dog.name,
      breed: dog.breed,
      sponsorshipStatus: dog.sponsorshipStatus,
      active: isPetActive(dog, monthKey(new Date())),
      verification: { level: verification.level, certifiedBy: verification.certifiedBy, validUntil: verification.validUntil },
      policy: policy ? { status: policy.status, productName: policy.productName } : null,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/pets/:id/certificate — nivel del certificado, SOLO si el tutor dio
// consentimiento para este partner. Devuelve nivel + vigencia (sin dato clínico).
router.get('/pets/:id/certificate', apiKeyAuth, async (req, res, next) => {
  try {
    const dog = await findPartnerDog(req.partner._id, req.params.id);
    if (!dog) return res.status(404).json({ code: 'NOT_FOUND', message: 'Pet not found.' });

    const consented = await ConsentService.hasConsent(dog._id, 'share_certificate_with_partner', req.partner._id);
    if (!consented) return res.status(403).json({ code: 'NO_CONSENT', message: 'Owner has not consented to share the certificate with this partner.' });

    const cert = await CertificateService.getActive(dog._id);
    if (!cert) return res.status(404).json({ code: 'NO_CERTIFICATE', message: 'No active certificate.' });

    return res.json(CertificateService.shareableView(cert));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
