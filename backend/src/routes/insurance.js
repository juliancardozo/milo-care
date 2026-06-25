'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const InsurancePolicy = require('../models/InsurancePolicy');
const Claim = require('../models/Claim');
const InsuranceLead = require('../models/InsuranceLead');
const Partner = require('../models/Partner');
const CoverageService = require('../services/CoverageService');
const ClaimsService = require('../services/ClaimsService');
const WebhookService = require('../services/WebhookService');
const AuditService = require('../services/AuditService');

// Montado en /api/dogs/:dogId — mergeParams para acceder a :dogId.
const router = express.Router({ mergeParams: true });

function policyResponse(p) {
  const o = p.toObject ? p.toObject() : p;
  return {
    id: o._id, dogId: o.dogId, partnerId: o.partnerId || null,
    policyNumber: o.policyNumber, productName: o.productName,
    coverage: o.coverage || [], reimbursementModel: o.reimbursementModel,
    startDate: o.startDate, status: o.status,
  };
}

// Resuelve el partnerId aplicable al perro (del perro o, si no, del dueño).
function resolvePartnerId(owner, dog) {
  return dog.partnerId || owner.partnerId || null;
}

// ── POST /api/dogs/:dogId/policy — crea o reemplaza la póliza del perro ──────
router.post('/policy', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;

    const { policyNumber, productName, coverage, reimbursementModel, startDate } = req.body || {};
    const partnerId = resolvePartnerId(owner, dog);

    const policy = await InsurancePolicy.findOneAndUpdate(
      { dogId: dog._id },
      {
        $set: {
          dogId: dog._id,
          ownerUserId: owner._id,
          partnerId,
          policyNumber: policyNumber || '',
          productName: productName || '',
          coverage: Array.isArray(coverage) ? coverage : [],
          reimbursementModel: reimbursementModel || 'reimbursement',
          startDate: startDate ? new Date(startDate) : null,
          status: 'active',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    AuditService.record({ userId: owner._id, action: 'policy_linked', meta: { dogId: String(dog._id), partnerId: partnerId ? String(partnerId) : null } });
    return res.status(201).json(policyResponse(policy));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dogs/:dogId/policy ─────────────────────────────────────────────
router.get('/policy', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const policy = await InsurancePolicy.findOne({ dogId: found.dog._id });
    if (!policy) return res.status(404).json({ code: 'NO_POLICY', message: 'No policy linked to this dog.' });
    return res.json(policyResponse(policy));
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dogs/:dogId/policy/coverage-check?event=<tipo> ──────────────────
router.get('/policy/coverage-check', authenticate, async (req, res, next) => {
  try {
    const event = req.query.event;
    if (!event) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'event query param is required.' });

    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const policy = await InsurancePolicy.findOne({ dogId: found.dog._id });
    if (!policy) return res.status(404).json({ code: 'NO_POLICY', message: 'No policy linked to this dog.' });

    return res.json({ event, ...CoverageService.checkCoverage(policy, event) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/dogs/:dogId/claims — arma un borrador desde el historial ───────
router.post('/claims', authenticate, async (req, res, next) => {
  try {
    const { type, eventIds, description } = req.body || {};
    if (!['accident', 'illness'].includes(type)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'type (accident|illness) is required.' });
    }

    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;

    const policy = await InsurancePolicy.findOne({ dogId: dog._id }).select('_id');
    const draft = ClaimsService.buildDraft(dog, { type, eventIds, description });

    const claim = await Claim.create({
      dogId: dog._id,
      ownerUserId: owner._id,
      policyId: policy?._id || null,
      type: draft.type,
      linkedEvents: draft.linkedEvents,
      generatedSummary: draft.generatedSummary,
      status: 'draft',
      createdBy: req.user.id,
    });

    AuditService.record({ userId: owner._id, action: 'claim_drafted', meta: { dogId: String(dog._id), claimId: String(claim._id), type } });
    return res.status(201).json({ ...claim.toObject(), disclaimer: draft.disclaimer });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/dogs/:dogId/claims ─────────────────────────────────────────────
router.get('/claims', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const claims = await Claim.find({ dogId: found.dog._id }).sort({ createdAt: -1 }).lean();
    return res.json({ claims });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/dogs/:dogId/insurance-lead — "¿necesito un seguro?" + webhook ──
router.post('/insurance-lead', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;
    const partnerId = resolvePartnerId(owner, dog);

    const lead = await InsuranceLead.create({
      dogId: dog._id,
      userId: owner._id,
      partnerId,
      intent: 'wants_quote',
      contact: req.body?.contact || { email: owner.email },
      status: 'new',
    });

    AuditService.record({ userId: owner._id, action: 'insurance_lead_created', meta: { dogId: String(dog._id), leadId: String(lead._id), partnerId: partnerId ? String(partnerId) : null } });

    // Dispara el webhook al partner (con reintentos) y registra la entrega.
    let delivered = false;
    if (partnerId) {
      const partner = await Partner.findById(partnerId).select('webhookUrl');
      if (partner?.webhookUrl) {
        const result = await WebhookService.deliver(partner.webhookUrl, {
          event: 'insurance_lead.created',
          leadId: String(lead._id),
          dogId: String(dog._id),
          dogName: dog.name,
          intent: lead.intent,
          contact: lead.contact,
          createdAt: lead.createdAt,
        });
        lead.webhookAttempts = result.attempts;
        if (result.ok) { lead.webhookDeliveredAt = new Date(); lead.status = 'delivered'; delivered = true; }
        else lead.status = 'failed';
        await lead.save();
      }
    }

    return res.status(201).json({ id: lead._id, status: lead.status, webhookDelivered: delivered });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
