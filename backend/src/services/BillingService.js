'use strict';

const User = require('../models/User');
const MP = require('./MercadoPagoGateway');

// Statuses que mantienen acceso premium activo
const PREMIUM_STATUSES = new Set(['active', 'past_due', 'cancel_pending']);

async function startCheckout(user, returnUrl) {
  const data = await MP.createPreapproval({ payerEmail: user.email, returnUrl });

  await User.findByIdAndUpdate(user._id, {
    billingSubscriptionId: data.id,
    billingSubscriptionStatus: 'pending',
    billingProvider: 'MERCADOPAGO',
  });

  return { checkoutUrl: data.init_point, subscriptionId: data.id };
}

async function getSubscriptionStatus(preapprovalId) {
  const data = await MP.getPreapproval(preapprovalId);
  return {
    subscriptionId: data.id,
    status: MP.normalizeStatus(data.status),
    currentPeriodEndAt: data.next_payment_date || null,
  };
}

async function cancelSubscription(preapprovalId) {
  const data = await MP.cancelPreapproval(preapprovalId);
  // MP cancela de forma síncrona; si confirma 'cancelled' lo reflejamos de inmediato.
  return MP.normalizeStatus(data.status); // 'canceled' o 'cancel_pending' como fallback
}

async function syncUserTier(user) {
  if (!user.billingSubscriptionId) return user;

  const remote = await MP.getPreapproval(user.billingSubscriptionId);
  const newStatus = MP.normalizeStatus(remote.status);
  const newTier = PREMIUM_STATUSES.has(newStatus) ? 'premium' : 'free';
  const newPeriodEnd = remote.next_payment_date ? new Date(remote.next_payment_date) : null;

  await User.findByIdAndUpdate(user._id, {
    tier: newTier,
    billingSubscriptionStatus: newStatus,
    billingPeriodEnd: newPeriodEnd,
  });

  return {
    ...user.toObject ? user.toObject() : user,
    tier: newTier,
    billingSubscriptionStatus: newStatus,
    billingPeriodEnd: newPeriodEnd,
  };
}

module.exports = { startCheckout, getSubscriptionStatus, cancelSubscription, syncUserTier };
