'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const partnerScope = require('../middleware/partnerScope');
const Partner = require('../models/Partner');
const MeteringService = require('../services/MeteringService');
const MetricsService = require('../services/MetricsService');
const ChargeService = require('../services/ChargeService');
const { generateApiKey, hashApiKey } = require('../services/apiKey');

const router = express.Router();

// Vista pública/admin de un Partner: nunca expone el hash de la API key.
function partnerResponse(partner) {
  const obj = partner.toObject ? partner.toObject() : partner;
  return {
    id: obj._id,
    name: obj.name,
    slug: obj.slug,
    type: obj.type,
    branding: obj.branding || {},
    contract: obj.contract || {},
    features: obj.features || [],
    webhookUrl: obj.webhookUrl || null,
    hasApiKey: Boolean(obj.apiKeyHash),
    status: obj.status,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

// POST /api/partners  (admin) — crea un partner y devuelve la API key en claro
// UNA sola vez (solo se persiste el hash).
router.post('/', authenticate, adminAuth, async (req, res, next) => {
  try {
    const { name, slug, type, branding, contract, features, webhookUrl } = req.body || {};
    if (!name || !slug || !type) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name, slug and type are required.' });
    }

    // Genera API key del partner: solo se devuelve ahora; se guarda hasheada (SHA-256).
    const apiKey = generateApiKey();
    const apiKeyHash = hashApiKey(apiKey);

    const partner = await Partner.create({
      name: name.trim(),
      slug: String(slug).toLowerCase().trim(),
      type,
      branding: branding || {},
      contract: contract || {},
      features: Array.isArray(features) ? features : [],
      webhookUrl: webhookUrl || null,
      apiKeyHash,
    });

    return res.status(201).json({ ...partnerResponse(partner), apiKey });
  } catch (err) {
    next(err);
  }
});

// GET /api/partners  (admin) — listado de partners.
router.get('/', authenticate, adminAuth, async (req, res, next) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    return res.json({ partners: partners.map(partnerResponse) });
  } catch (err) {
    next(err);
  }
});

// Campos editables de un partner (nunca toca apiKeyHash directamente).
const EDITABLE = ['name', 'slug', 'type', 'branding', 'contract', 'billing', 'features', 'webhookUrl', 'status'];

// PATCH /api/partners/:id  (admin) — edita el partner.
router.patch('/:id', authenticate, adminAuth, async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });

    for (const key of EDITABLE) {
      if (req.body[key] === undefined) continue;
      if (key === 'slug') partner.slug = String(req.body.slug).toLowerCase().trim();
      else partner[key] = req.body[key];
    }
    await partner.save();
    return res.json(partnerResponse(partner));
  } catch (err) {
    next(err);
  }
});

// POST /api/partners/:id/api-key/rotate  (admin) — regenera la API key (la muestra una vez).
router.post('/:id/api-key/rotate', authenticate, adminAuth, async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });

    const apiKey = generateApiKey();
    partner.apiKeyHash = hashApiKey(apiKey);
    await partner.save();
    return res.json({ ...partnerResponse(partner), apiKey });
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/:id  (admin) — detalle del partner.
router.get('/:id', authenticate, adminAuth, async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });
    return res.json(partnerResponse(partner));
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/:id/metrics?month=YYYY-MM  (admin o partner_admin del partner)
// Métricas AGREGADAS de la cohorte (sin PII ni dato clínico individual).
router.get('/:id/metrics', authenticate, partnerScope, async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });

    // Métricas: por defecto el mes EN CURSO (cohorte viva). La facturación, en
    // cambio, usa el mes anterior (cerrado).
    const month = req.query.month || MeteringService.monthKey(new Date());
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'month must be YYYY-MM.' });
    }
    const metrics = await MetricsService.computeMetrics(partner, month, { now: new Date() });
    return res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// GET /api/partners/:id/billing?month=YYYY-MM  (admin o partner_admin del partner)
// Genera/upsertea y devuelve la factura del mes: setupFee (una vez) + activePets * price.
router.get('/:id/billing', authenticate, partnerScope, async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });

    const month = req.query.month || MeteringService.previousMonthKey(new Date());
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'month must be YYYY-MM.' });
    }

    const record = await MeteringService.generateBillingRecord(partner, month);
    return res.json({
      partnerId: String(partner._id),
      month: record.month,
      setupFeeApplied: record.setupFeeApplied,
      activePets: record.activePets,
      pricePerActivePet: record.pricePerActivePet,
      total: record.total,
      currency: record.currency,
      status: record.status,
      chargedAt: record.chargedAt,
      chargeRef: record.chargeRef,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/partners/:id/billing/charge?month=YYYY-MM  (admin)
// Genera la factura del mes y cobra al partner (cobro automático). Idempotente.
router.post('/:id/billing/charge', authenticate, adminAuth, async (req, res, next) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });

    const month = req.query.month || MeteringService.previousMonthKey(new Date());
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'month must be YYYY-MM.' });
    }

    const record = await MeteringService.generateBillingRecord(partner, month);
    const result = await ChargeService.chargeBillingRecord(record, partner);
    return res.json({
      month: record.month,
      total: record.total,
      currency: record.currency,
      status: record.status,
      chargedAt: record.chargedAt,
      chargeRef: record.chargeRef,
      chargeError: record.chargeError,
      result,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
