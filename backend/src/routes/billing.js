'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const BillingService = require('../services/BillingService');

const router = express.Router();

// POST /api/billing/interest
// Registra el interés del usuario en Premium: avisa al admin por email y le confirma
// al usuario. Flujo agnóstico al proveedor de pago (alta manual por ahora).
router.post('/interest', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    if (user.isPremiumActive()) {
      return res.status(409).json({ code: 'ALREADY_PREMIUM', message: 'User already has Premium.' });
    }

    const result = await BillingService.requestUpgrade(user, { dogsCount: user.dogs?.length || 0 });
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/subscription
// Estado del plan del usuario autenticado.
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('tier premiumInterestAt premiumUntil');
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    return res.json({
      tier: user.tier,
      effectiveTier: user.effectiveTier(),
      premiumUntil: user.premiumUntil,
      premiumInterestAt: user.premiumInterestAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
