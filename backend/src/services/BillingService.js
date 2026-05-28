'use strict';

const User = require('../models/User');
const MP = require('./MercadoPagoGateway');

// Statuses que mantienen acceso premium activo
const PREMIUM_STATUSES = new Set(['active', 'past_due', 'cancel_pending']);

// Inicia el checkout. Retorna { checkoutUrl, planId }.
// No almacena billingSubscriptionId todavía — el webhook lo asigna cuando el usuario paga.
async function startCheckout(user, _returnUrl) {
  const { planId, initPoint } = await MP.getOrCreatePlan();

  await User.findByIdAndUpdate(user._id, {
    billingSubscriptionStatus: 'pending',
    billingProvider: 'MERCADOPAGO',
  });

  return { checkoutUrl: initPoint, planId };
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
  return MP.normalizeStatus(data.status);
}

// Sincroniza tier y estado del usuario con el preapproval actual en MP.
// Requiere que user.billingSubscriptionId ya esté asignado (lo hace el webhook).
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
