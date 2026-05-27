'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const BillingService = require('../services/BillingService');

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
// Sincroniza el estado de la suscripción con la plataforma de pagos.
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

    await BillingService.cancelSubscription(user.billingSubscriptionId);

    await User.findByIdAndUpdate(user._id, {
      billingSubscriptionStatus: 'cancel_pending',
    });

    return res.json({ status: 'cancel_pending' });
  } catch (err) {
    next(err);
  }
});

// POST /api/billing/webhooks/mercadopago
// Receives MP preapproval events directly (when notification_url points here in prod).
// Always responds 200 immediately; syncs pending/past_due users in the background.
router.post('/webhooks/mercadopago', async (req, res) => {
  res.sendStatus(200);

  setImmediate(async () => {
    try {
      const users = await User.find({
        billingSubscriptionStatus: { $in: ['pending', 'past_due'] },
        billingSubscriptionId: { $ne: null },
      });
      if (users.length === 0) return;
      console.log(`[Webhook/MP] Syncing ${users.length} subscription(s) triggered by webhook`);
      for (const user of users) {
        await BillingService.syncUserTier(user).catch((err) =>
          console.error(`[Webhook/MP] Failed to sync user ${user._id}: ${err.message}`)
        );
      }
    } catch (err) {
      console.error('[Webhook/MP] Background sync error:', err.message);
    }
  });
});

module.exports = router;
