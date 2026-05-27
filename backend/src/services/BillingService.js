'use strict';

const User = require('../models/User');

const API_URL = process.env.BILLING_API_URL || 'https://micuota-online-2026-backend.onrender.com';
const AUTH_TOKEN = process.env.BILLING_AUTH_TOKEN || '';
const PLAN_CODE = process.env.BILLING_PLAN_CODE || 'MILO_PREMIUM';

// Statuses from the payment platform that keep premium access alive
const PREMIUM_STATUSES = new Set(['ACTIVE', 'PAST_DUE', 'CANCEL_PENDING']);

async function billingRequest(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': AUTH_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Billing API ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json();
}

async function startCheckout(user, returnUrl) {
  const data = await billingRequest('POST', '/api/billing/subscriptions/checkout', {
    planCode: PLAN_CODE,
    countryCode: 'UY',
    currency: 'UYU',
    returnUrl,
    payerEmail: user.email,
  });

  // Persist subscription reference immediately so sync can match it on callback
  await User.findByIdAndUpdate(user._id, {
    billingSubscriptionId: data.subscriptionId,
    billingSubscriptionStatus: 'pending',
    billingProvider: 'MERCADOPAGO',
  });

  return { checkoutUrl: data.checkoutUrl, subscriptionId: data.subscriptionId };
}

async function getSubscriptionStatus(subscriptionId) {
  return billingRequest('GET', `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
}

async function cancelSubscription(subscriptionId) {
  return billingRequest('POST', `/api/billing/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {});
}

async function syncUserTier(user) {
  if (!user.billingSubscriptionId) return user;

  const remote = await getSubscriptionStatus(user.billingSubscriptionId);
  const remoteStatus = (remote.status || '').toUpperCase();

  const newTier = PREMIUM_STATUSES.has(remoteStatus) ? 'premium' : 'free';
  const newStatus = remoteStatus.toLowerCase();
  const newPeriodEnd = remote.currentPeriodEndAt ? new Date(remote.currentPeriodEndAt) : null;

  await User.findByIdAndUpdate(user._id, {
    tier: newTier,
    billingSubscriptionStatus: newStatus,
    billingPeriodEnd: newPeriodEnd,
  });

  return { ...user.toObject ? user.toObject() : user, tier: newTier, billingSubscriptionStatus: newStatus, billingPeriodEnd: newPeriodEnd };
}

module.exports = { startCheckout, getSubscriptionStatus, cancelSubscription, syncUserTier };
