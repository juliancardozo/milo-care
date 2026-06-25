'use strict';

/**
 * MercadoPagoService — checkout B2C de Premium vía Mercado Pago (Checkout Pro).
 * Agnóstico al resto de la app: si `MERCADOPAGO_ACCESS_TOKEN` no está, queda
 * inactivo y el checkout cae al flujo de interés manual existente.
 *
 * Usa `fetch` global (Node 20). No agrega SDK pesado.
 */

const MP_API = 'https://api.mercadopago.com';

function accessToken() {
  return process.env.MERCADOPAGO_ACCESS_TOKEN || null;
}

function isConfigured() {
  return Boolean(accessToken());
}

function appUrl() {
  return (process.env.APP_URL || 'https://milocare.online').replace(/\/+$/, '');
}

function apiBaseUrl() {
  return (process.env.API_PUBLIC_URL || `${appUrl()}`).replace(/\/+$/, '');
}

/**
 * Crea una preferencia de checkout y devuelve el link de pago. `external_reference`
 * lleva el userId para resolverlo en el webhook.
 */
async function createCheckout({ user, amount, currency = 'UYU', planLabel = 'Milo Care Premium' }) {
  if (!isConfigured()) {
    const err = new Error('Mercado Pago no está configurado.');
    err.status = 503;
    err.code = 'MP_NOT_CONFIGURED';
    throw err;
  }

  const body = {
    items: [{ title: planLabel, quantity: 1, unit_price: Number(amount), currency_id: currency }],
    external_reference: String(user._id || user.id),
    metadata: { userId: String(user._id || user.id) },
    back_urls: {
      success: `${appUrl()}/premium/success`,
      failure: `${appUrl()}/premium`,
      pending: `${appUrl()}/premium`,
    },
    auto_return: 'approved',
    notification_url: `${apiBaseUrl()}/api/billing/webhook`,
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`Mercado Pago preference failed (${res.status}).`);
    err.status = 502;
    err.code = 'MP_ERROR';
    throw err;
  }
  const data = await res.json();
  return { checkoutUrl: data.init_point || data.sandbox_init_point, preferenceId: data.id };
}

/** Trae el pago por id (para resolver el estado en el webhook). */
async function getPayment(paymentId) {
  if (!isConfigured() || !paymentId) return null;
  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
  });
  if (!res.ok) return null;
  return res.json();
}

module.exports = { isConfigured, createCheckout, getPayment };
