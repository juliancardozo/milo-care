'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Partner = require('../models/Partner');

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

    // Genera API key del partner: solo se devuelve ahora; se guarda hasheada.
    const apiKey = `mp_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 10);

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

module.exports = router;
