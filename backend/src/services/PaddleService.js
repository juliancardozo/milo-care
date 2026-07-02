'use strict';

/**
 * PaddleService — suscripción Premium B2C vía Paddle Billing (Merchant of Record).
 *
 * Se eligió Paddle (no Lemon Squeezy) porque es el MoR que soporta sellers en Argentina
 * y Uruguay; LS/Polar/Gumroad liquidan vía Stripe Connect, que no admite vendedores de AR.
 * Paddle es el vendedor legal: emite factura, remite IVA, corre el cobro recurrente sobre
 * las redes de tarjeta, y aporta dunning y cancelación. Milo Care solo espeja el estado.
 * Esto elimina nuestro alcance de PCI y la exposición legal del cobro recurrente en AR/UY.
 *
 * Inactivo si faltan credenciales → el checkout cae al flujo de interés manual (/interest).
 * Usa `fetch` global (Node 20). Sin SDK.
 */

const crypto = require('crypto');

function apiKey() { return process.env.PADDLE_API_KEY || null; }
function priceId() { return process.env.PADDLE_PRICE_ID || null; }
function webhookSecret() { return process.env.PADDLE_WEBHOOK_SECRET || null; }

// Producción por defecto; para sandbox setear PADDLE_API_URL=https://sandbox-api.paddle.com
function apiBase() {
  return (process.env.PADDLE_API_URL || 'https://api.paddle.com').replace(/\/+$/, '');
}

function isConfigured() {
  return Boolean(apiKey() && priceId());
}

function authHeaders(extra = {}) {
  return { Authorization: `Bearer ${apiKey()}`, 'Content-Type': 'application/json', ...extra };
}

/**
 * Crea una transacción y devuelve la URL de checkout hosted. `custom_data.user_id` viaja
 * en la transacción y vuelve en cada webhook para resolver al usuario.
 * Requiere tener configurado un "default payment link" en el dashboard de Paddle para que
 * `data.checkout.url` venga poblado.
 */
async function createCheckout({ user }) {
  if (!isConfigured()) {
    const err = new Error('Paddle no está configurado.');
    err.status = 503; err.code = 'PADDLE_NOT_CONFIGURED';
    throw err;
  }

  const body = {
    items: [{ price_id: priceId(), quantity: 1 }],
    custom_data: { user_id: String(user._id || user.id) },
    ...(user.email ? { customer: { email: user.email } } : {}),
  };

  const res = await fetch(`${apiBase()}/transactions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = new Error(`Paddle transaction failed (${res.status}).`);
    err.status = 502; err.code = 'PADDLE_ERROR';
    throw err;
  }
  const data = await res.json();
  return { checkoutUrl: data?.data?.checkout?.url, transactionId: data?.data?.id };
}

/**
 * Verifica la firma del webhook (header `Paddle-Signature`, formato `ts=...;h1=...`).
 * El payload firmado es `${ts}:${rawBody}` con HMAC-SHA256 sobre el body CRUDO (sin
 * reparsear el JSON). Comparación en tiempo constante.
 */
function verifyWebhook(rawBody, signatureHeader) {
  const secret = webhookSecret();
  if (!secret || !signatureHeader || !rawBody) return false;

  const parts = {};
  for (const kv of String(signatureHeader).split(';')) {
    const idx = kv.indexOf('=');
    if (idx > 0) parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  const { ts, h1 } = parts;
  if (!ts || !h1) return false;

  const digest = crypto.createHmac('sha256', secret).update(`${ts}:`).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'hex'), Buffer.from(h1, 'hex'));
  } catch {
    return false;
  }
}

/**
 * Cancela la suscripción al fin del período (el usuario conserva Premium hasta
 * `premiumUntil`). Devuelve el recurso de suscripción actualizado.
 */
async function cancelSubscription(subscriptionId) {
  if (!isConfigured() || !subscriptionId) {
    const err = new Error('Paddle no está configurado o falta subscriptionId.');
    err.status = 503; err.code = 'PADDLE_NOT_CONFIGURED';
    throw err;
  }
  const res = await fetch(`${apiBase()}/subscriptions/${subscriptionId}/cancel`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ effective_from: 'next_billing_period' }),
  });
  if (!res.ok) {
    const err = new Error(`Paddle cancel failed (${res.status}).`);
    err.status = 502; err.code = 'PADDLE_ERROR';
    throw err;
  }
  return res.json();
}

module.exports = { isConfigured, createCheckout, verifyWebhook, cancelSubscription };
