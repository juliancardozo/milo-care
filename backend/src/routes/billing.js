'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const BillingService = require('../services/BillingService');
const MercadoPagoService = require('../services/MercadoPagoService');

const router = express.Router();

// Días de premium otorgados por un pago aprobado (ventana tipo suscripción mensual).
const PREMIUM_DAYS_PER_PAYMENT = 31;

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

// POST /api/billing/checkout
// Inicia el checkout de Premium con Mercado Pago. Si MP no está configurado,
// el frontend cae al flujo de interés manual (/interest).
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    if (!MercadoPagoService.isConfigured()) {
      return res.status(503).json({ code: 'MP_NOT_CONFIGURED', message: 'Mercado Pago is not configured.' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    if (user.isPremiumActive()) {
      return res.status(409).json({ code: 'ALREADY_PREMIUM', message: 'User already has Premium.' });
    }

    const amount = Number(process.env.PREMIUM_PRICE || 0);
    const currency = process.env.PREMIUM_CURRENCY || 'UYU';
    const { checkoutUrl, preferenceId } = await MercadoPagoService.createCheckout({ user, amount, currency });
    return res.json({ checkoutUrl, preferenceId });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhook
// Notificación de Mercado Pago. Si el pago está aprobado, otorga Premium al usuario
// (resuelto por external_reference = userId). Idempotente por payment id.
router.post('/webhook', async (req, res, next) => {
  try {
    // MP manda el id del pago por body ({type,data:{id}}) o por query (?topic&id).
    const type = req.body?.type || req.query.topic || req.query.type;
    const paymentId = req.body?.data?.id || req.query['data.id'] || req.query.id;

    // Respondemos 200 siempre que podamos procesar (MP reintenta ante no-2xx).
    if (type && type !== 'payment') return res.sendStatus(200);
    if (!paymentId) return res.sendStatus(200);

    const payment = await MercadoPagoService.getPayment(paymentId);
    if (!payment || payment.status !== 'approved') return res.sendStatus(200);

    const userId = payment.external_reference || payment.metadata?.userId;
    if (!userId) return res.sendStatus(200);

    const user = await User.findById(userId);
    if (!user) return res.sendStatus(200);

    // Idempotencia: no volver a otorgar por el mismo pago.
    if (user.premiumPaymentRef === String(paymentId)) return res.sendStatus(200);

    user.grantPremiumDays(PREMIUM_DAYS_PER_PAYMENT);
    user.premiumPaymentRef = String(paymentId);
    await user.save();

    return res.sendStatus(200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
