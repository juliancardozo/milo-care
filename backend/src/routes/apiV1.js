'use strict';

const express = require('express');
const apiKeyAuth = require('../middleware/apiKeyAuth');
const PartnerEvent = require('../models/PartnerEvent');
const User = require('../models/User');
const VetAttestation = require('../models/VetAttestation');
const InsurancePolicy = require('../models/InsurancePolicy');
const { deriveVerification } = require('../services/petScoreVerification');
const { isPetActive } = require('../services/petActivity');
const { monthKey } = require('../services/MeteringService');

// API v1 para partners — autenticada por API key, aislada por partner.
const router = express.Router();

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

module.exports = router;
