'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const BillingWebhookEvent = require('../models/BillingWebhookEvent');
const BillingService = require('../services/BillingService');
const MP = require('../services/MercadoPagoGateway');

const router = express.Router();

// POST /api/billing/checkout
// Inicia el checkout Premium. Devuelve { checkoutUrl, subscriptionId }.
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    if (!returnUrl) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'returnUrl is required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const activeStatuses = new Set(['active', 'pending', 'past_due', 'cancel_pending']);
    if (user.billingSubscriptionId && activeStatuses.has(user.billingSubscriptionStatus)) {
      return res.status(409).json({ code: 'ALREADY_SUBSCRIBED', message: 'User already has an active subscription.' });
    }

    const result = await BillingService.startCheckout(user, returnUrl);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/billing/subscription
// Estado actual de la suscripción del usuario autenticado.
router.get('/subscription', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select(
      'tier billingSubscriptionId billingSubscriptionStatus billingPeriodEnd billingProvider'
    );
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    return res.json({
      tier: user.tier,
      subscriptionId: user.billingSubscriptionId,
      status: user.billingSubscriptionStatus,
      periodEnd: user.billingPeriodEnd,
      provider: user.billingProvider,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/subscription/sync
// Sincroniza el estado de la suscripción con MercadoPago.
// Lo llama la página de callback luego del pago, y el cron job.
router.post('/subscription/sync', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    if (!user.billingSubscriptionId) {
      return res.status(400).json({ code: 'NO_SUBSCRIPTION', message: 'No subscription found for this user.' });
    }

    const updated = await BillingService.syncUserTier(user);
    return res.json({
      tier: updated.tier,
      status: updated.billingSubscriptionStatus,
      periodEnd: updated.billingPeriodEnd,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/billing/subscription
// Cancela la suscripción activa del usuario autenticado.
router.delete('/subscription', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    if (!user.billingSubscriptionId) {
      return res.status(400).json({ code: 'NO_SUBSCRIPTION', message: 'No active subscription to cancel.' });
    }

    const finalStatus = await BillingService.cancelSubscription(user.billingSubscriptionId);

    await User.findByIdAndUpdate(user._id, { billingSubscriptionStatus: finalStatus });

    return res.json({ status: finalStatus });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhooks/mercadopago
// Recibe notificaciones de MercadoPago para suscripciones (preapproval).
// Responde 200 de inmediato; procesa en background con idempotency + verificación de firma.
router.post('/webhooks/mercadopago', async (req, res) => {
  res.sendStatus(200);

  setImmediate(async () => {
    try {
      // Verificar firma HMAC. req.rawBody lo inyecta el middleware en app.js.
      if (!MP.verifyWebhookSignature(req.headers, req.rawBody || req.body)) {
        console.warn('[Webhook/MP] Firma inválida — evento ignorado.');
        return;
      }

      const payload = req.body || {};
      const preapprovalId = payload.data?.id;
      if (!preapprovalId) return; // ping vacío

      // Idempotency: registrar el evento; si ya existe, ignorar.
      const idempotencyKey = `mercadopago:${preapprovalId}`;
      try {
        await BillingWebhookEvent.create({
          idempotencyKey,
          provider: 'MERCADOPAGO',
          providerEventId: String(preapprovalId),
          processingStatus: 'accepted',
          processedAt: new Date(),
        });
      } catch (err) {
        if (err.code === 11000) {
          // Evento duplicado — MP puede re-enviar; ignorar es correcto.
          console.log(`[Webhook/MP] Evento duplicado ${idempotencyKey} — ignorado.`);
          return;
        }
        throw err;
      }

      // Sincronizar el usuario afectado por este preapproval.
      const user = await User.findOne({ billingSubscriptionId: preapprovalId });
      if (!user) {
        console.log(`[Webhook/MP] No se encontró usuario para preapproval ${preapprovalId}.`);
        return;
      }

      await BillingService.syncUserTier(user);
      console.log(`[Webhook/MP] Usuario ${user._id} sincronizado (preapproval ${preapprovalId}).`);
    } catch (err) {
      console.error('[Webhook/MP] Error en background sync:', err.message);
    }
  });
});

module.exports = router;
