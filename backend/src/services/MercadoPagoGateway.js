'use strict';

const crypto = require('crypto');

const MP_API = 'https://api.mercadopago.com';

// Normaliza los estados de MP preapproval a los estados internos de Milo Care.
// MP:       pending   → authorized → paused    → cancelled
// Milo:     pending   → active     → past_due  → canceled
const MP_STATUS_MAP = {
  pending: 'pending',
  authorized: 'active',
  paused: 'past_due',
  cancelled: 'canceled',
};

async function mpRequest(method, path, body) {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) throw new Error('MP_ACCESS_TOKEN no está configurado.');

  const res = await fetch(`${MP_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MercadoPago ${method} ${path} → ${res.status}: ${text}`);
  }

  return res.json();
}

// Crea un preapproval (suscripción recurrente) en MercadoPago.
// Retorna { id, init_point, status }.
async function createPreapproval({ payerEmail, returnUrl }) {
  const reason = process.env.MP_PLAN_REASON || 'Milo Care Premium';
  const amount = parseFloat(process.env.MP_PLAN_AMOUNT || '299');
  const currency = process.env.MP_CURRENCY || 'UYU';

  return mpRequest('POST', '/preapproval', {
    back_url: returnUrl,
    reason,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: amount,
      currency_id: currency,
    },
    payer_email: payerEmail,
    status: 'pending',
  });
}

// Obtiene el estado actual de un preapproval desde MercadoPago.
async function getPreapproval(preapprovalId) {
  return mpRequest('GET', `/preapproval/${encodeURIComponent(preapprovalId)}`);
}

// Cancela un preapproval. MP lo procesa de forma síncrona y devuelve status: 'cancelled'.
async function cancelPreapproval(preapprovalId) {
  return mpRequest('PUT', `/preapproval/${encodeURIComponent(preapprovalId)}`, {
    status: 'cancelled',
  });
}

// Convierte el status de MP al status interno de Milo Care.
function normalizeStatus(mpStatus) {
  return MP_STATUS_MAP[mpStatus] || 'failed';
}

// Verifica la firma HMAC-SHA256 que MercadoPago incluye en el header x-signature.
// Formato del header: "ts={timestamp},v1={hmac}"
// Mensaje firmado:    "id:{data.id};request-id:{x-request-id};ts:{timestamp}"
//
// Si MP_WEBHOOK_SECRET no está configurado (desarrollo local), retorna true para
// no bloquear pruebas sin credenciales reales.
function verifyWebhookSignature(headers, rawBody) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) return true;

  const xSignature = headers['x-signature'];
  if (!xSignature) return false;

  // Parsear ts y v1 del header
  const parts = {};
  for (const segment of xSignature.split(',')) {
    const [k, v] = segment.trim().split('=');
    if (k && v) parts[k] = v;
  }
  const { ts, v1 } = parts;
  if (!ts || !v1) return false;

  // Extraer data.id del body para armar el mensaje
  let dataId;
  try {
    const body = rawBody instanceof Buffer ? JSON.parse(rawBody.toString()) : rawBody;
    dataId = body?.data?.id ?? body?.id;
  } catch {
    return false;
  }
  if (!dataId) return false;

  const xRequestId = headers['x-request-id'] || '';
  const message = xRequestId
    ? `id:${dataId};request-id:${xRequestId};ts:${ts}`
    : `id:${dataId};ts:${ts}`;

  const expected = crypto.createHmac('sha256', secret).update(message).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(v1, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    // Buffers de distinto largo si los hexs no coinciden
    return false;
  }
}

module.exports = {
  createPreapproval,
  getPreapproval,
  cancelPreapproval,
  normalizeStatus,
  verifyWebhookSignature,
};
