'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const partnerScope = require('../middleware/partnerScope');
const Partner = require('../models/Partner');
const User = require('../models/User');
const MagicLoginToken = require('../models/MagicLoginToken');
const MeteringService = require('../services/MeteringService');
const MetricsService = require('../services/MetricsService');
const ChargeService = require('../services/ChargeService');
const EmailService = require('../services/EmailService');
const referralService = require('../services/referralService');
const { generateApiKey, hashApiKey } = require('../services/apiKey');

const MAGIC_TOKEN_TTL_MS = 15 * 60 * 1000;
const SALT_ROUNDS = 12;

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

// GET /api/partners  (admin) — listado de partners, con sus partner_admins y el
// estado de la invitación (pending = nunca ingresó).
router.get('/', authenticate, adminAuth, async (req, res, next) => {
  try {
    const partners = await Partner.find().sort({ createdAt: -1 });
    const ids = partners.map((p) => p._id);
    const admins = await User.find({ role: 'partner_admin', partnerId: { $in: ids } })
      .select('name email partnerId lastLoginAt')
      .lean();

    const byPartner = new Map();
    for (const a of admins) {
      const key = String(a.partnerId);
      if (!byPartner.has(key)) byPartner.set(key, []);
      byPartner.get(key).push({
        name: a.name, email: a.email, lastLoginAt: a.lastLoginAt || null,
        pending: !a.lastLoginAt, // invitado pero nunca ingresó
      });
    }

    return res.json({
      partners: partners.map((p) => ({ ...partnerResponse(p), admins: byPartner.get(String(p._id)) || [] })),
    });
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

// POST /api/partners/:id/invite  (admin)
// Invita a un partner_admin por email: crea (o vincula) el usuario con rol
// partner_admin + partnerId y le manda un magic link que cae directo en /partner.
router.post('/:id/invite', authenticate, adminAuth, async (req, res, next) => {
  try {
    const { email, name } = req.body || {};
    if (!email || !validator.isEmail(email)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'A valid email is required.' });
    }
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });

    let user = await User.findOne({ email: String(email).toLowerCase() });
    if (user) {
      // No degradar a un admin de plataforma; cualquier otro pasa a partner_admin.
      if (!['admin', 'adminVet'].includes(user.role)) user.role = 'partner_admin';
      user.partnerId = partner._id;
      await user.save();
    } else {
      const randomPass = crypto.randomBytes(24).toString('hex');
      user = await User.create({
        name: (name && String(name).trim()) || String(email).split('@')[0],
        email: String(email).toLowerCase(),
        passwordHash: await bcrypt.hash(randomPass, SALT_ROUNDS),
        role: 'partner_admin',
        partnerId: partner._id,
        referralCode: await referralService.generateUniqueCode(),
      });
    }

    // Magic link de un solo uso (15 min) que aterriza en el panel del partner.
    await MagicLoginToken.deleteMany({ userId: user._id });
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(plainToken, SALT_ROUNDS);
    await MagicLoginToken.create({ userId: user._id, tokenHash, expiresAt: new Date(Date.now() + MAGIC_TOKEN_TTL_MS) });
    const base = process.env.APP_URL || 'http://localhost:5173';
    const magicUrl = `${base}/magic-login?token=${plainToken}&userId=${user._id}&next=/partner`;

    let emailed = true;
    try {
      await EmailService.sendPartnerAdminInvite({ to: user.email, userName: user.name, partnerName: partner.name, magicUrl });
    } catch (err) {
      emailed = false;
      console.error('[partner invite] email failed:', err.message);
    }

    return res.status(201).json({
      userId: user._id,
      email: user.email,
      role: user.role,
      partnerId: String(partner._id),
      emailed,
      // Si el email no salió (p. ej. sin RESEND configurado), devolvemos el link
      // para que el admin lo entregue manualmente.
      ...(emailed ? {} : { magicUrl }),
    });
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
