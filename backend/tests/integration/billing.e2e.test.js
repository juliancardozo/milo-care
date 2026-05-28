'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

/**
 * E2E integration test: Milo Care billing ↔ MercadoPago (sandbox)
 *
 * Flujo actual: preapproval_plan (plan fijo) + webhook para activación.
 * POST /preapproval está bloqueado por PolicyAgent en sandbox; el checkout
 * retorna el init_point del plan. billingSubscriptionId se asigna via webhook.
 *
 * Requiere:
 *   - Milo Care backend corriendo: http://localhost:3001
 *   - MP_ACCESS_TOKEN configurado (APP_USR-... del seller test user)
 *   - MP_PLAN_ID configurado (preapproval_plan existente en MP)
 *
 * Run: npm test -- --testPathPattern=billing.e2e
 */

const BASE_URL = 'http://localhost:3001';
const MP_API = 'https://api.mercadopago.com';

const TEST_EMAIL = `billing-e2e-${Date.now()}@milocura-test.com`;
const TEST_PASSWORD = 'Test1234!';

let milocuraJwt = null;
let checkoutPlanId = null; // ID del preapproval_plan retornado por checkout

// ─── helpers ──────────────────────────────────────────────────────────────────

async function mc(method, path, body, jwt) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

async function mpGet(path) {
  const token = process.env.MP_ACCESS_TOKEN;
  const res = await fetch(`${MP_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

// ─── setup ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const reg = await mc('POST', '/api/auth/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: 'Test Billing User',
  });
  expect(reg.status).toBe(201);

  const login = await mc('POST', '/api/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  expect(login.status).toBe(200);
  milocuraJwt = login.body.token;
  expect(milocuraJwt).toBeTruthy();
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe('Prerequisites', () => {
  test('Milo Care backend responde', async () => {
    const res = await mc('POST', '/api/auth/login', { email: 'x@x.com', password: 'x' });
    expect([200, 400, 401]).toContain(res.status);
  });

  test('MP_ACCESS_TOKEN configurado y válido', async () => {
    expect(process.env.MP_ACCESS_TOKEN).toBeTruthy();
    const res = await mpGet('/users/me');
    expect(res.status).toBe(200);
  });

  test('MP_PLAN_ID configurado y plan activo en MP', async () => {
    const planId = process.env.MP_PLAN_ID;
    expect(planId).toBeTruthy();
    const res = await mpGet(`/preapproval_plan/${planId}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    console.log('  Plan reason:', res.body.reason);
    console.log('  Plan init_point:', res.body.init_point);
  });
});

describe('POST /api/billing/checkout', () => {
  test('retorna checkoutUrl de mercadopago.com apuntando al plan', async () => {
    const res = await mc(
      'POST',
      '/api/billing/checkout',
      { returnUrl: 'https://app.milocura.com/subscription/callback' },
      milocuraJwt
    );

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toMatch(/mercadopago\.com/);
    const planId = process.env.MP_PLAN_ID;
    if (planId) {
      expect(res.body.checkoutUrl).toContain(planId);
      expect(res.body.subscriptionId).toBe(planId);
    } else {
      expect(res.body.checkoutUrl).toMatch(/preapproval_plan_id=/);
      expect(res.body.subscriptionId).toBeTruthy();
    }

    checkoutPlanId = res.body.subscriptionId;
    console.log('  checkoutUrl:', res.body.checkoutUrl);
    console.log('  planId:', checkoutPlanId);
  });

  test('billingSubscriptionStatus queda en pending, subscriptionId null hasta webhook', async () => {
    const res = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    // subscriptionId se asigna solo cuando el webhook de MP confirma el pago
    expect(res.body.subscriptionId).toBeNull();
    expect(res.body.provider).toBe('MERCADOPAGO');
  });

  test('retorna 409 si el usuario ya tiene suscripción pendiente/activa', async () => {
    const res = await mc(
      'POST',
      '/api/billing/checkout',
      { returnUrl: 'https://app.milocura.com/subscription/callback' },
      milocuraJwt
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_SUBSCRIBED');
  });

  test('retorna 400 si falta returnUrl', async () => {
    const res = await mc('POST', '/api/billing/checkout', {}, milocuraJwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('retorna 401 sin token', async () => {
    const res = await mc('POST', '/api/billing/checkout', {
      returnUrl: 'https://app.milocura.com/subscription/callback',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/billing/subscription', () => {
  test('retorna detalles de suscripción del usuario autenticado', async () => {
    const res = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body.tier).toMatch(/^(free|premium)$/);
    expect(res.body.status).toMatch(/^(none|pending|active|past_due|cancel_pending|canceled|failed)$/);
  });

  test('retorna 401 sin token', async () => {
    const res = await mc('GET', '/api/billing/subscription');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/billing/subscription/sync', () => {
  test('sync retorna pending mientras no haya llegado webhook de MP', async () => {
    const res = await mc('POST', '/api/billing/subscription/sync', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.tier).toBe('free');
    console.log('  Después de sync — tier:', res.body.tier, '| status:', res.body.status);
  });

  test('retorna 400 para usuario que nunca inició checkout', async () => {
    const noSubEmail = `no-sub-${Date.now()}@milocura-test.com`;
    await mc('POST', '/api/auth/register', { email: noSubEmail, password: TEST_PASSWORD, name: 'No Sub' });
    const login = await mc('POST', '/api/auth/login', { email: noSubEmail, password: TEST_PASSWORD });
    const jwt = login.body.token;

    const res = await mc('POST', '/api/billing/subscription/sync', null, jwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_SUBSCRIPTION');
  });
});

describe('POST /api/billing/webhooks/mercadopago', () => {
  test('responde 200 a un evento simulado de preapproval', async () => {
    const mpEvent = {
      id: 999999,
      type: 'subscription_preapproval',
      date_created: new Date().toISOString(),
      data: { id: 'fake-preapproval-id-test' },
    };

    const res = await fetch(`${BASE_URL}/api/billing/webhooks/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mpEvent),
    });

    expect(res.status).toBe(200);
  });

  test('responde 200 a un body vacío (ping de MP)', async () => {
    const res = await fetch(`${BASE_URL}/api/billing/webhooks/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });
});

describe('MP directo: preapproval_plan existe y está activo en MercadoPago', () => {
  test('el plan retornado por checkout existe y tiene status active en MP', async () => {
    if (!checkoutPlanId) {
      console.log('  No hay checkoutPlanId — saltando verificación MP directa');
      return;
    }
    expect(checkoutPlanId).toBeTruthy();
    const res = await mpGet(`/preapproval_plan/${checkoutPlanId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(checkoutPlanId);
    expect(res.body.status).toBe('active');
    console.log('  MP plan status:', res.body.status);
    console.log('  MP plan reason:', res.body.reason);
    console.log('  MP plan amount:', res.body.auto_recurring?.transaction_amount, res.body.auto_recurring?.currency_id);
  });
});

describe('DELETE /api/billing/subscription (cancel)', () => {
  test('retorna 400 mientras billingSubscriptionId no esté asignado (pre-webhook)', async () => {
    // El webhook de MP aún no llegó → billingSubscriptionId es null
    // La cancelación requiere un preapproval ID real (asignado por el webhook)
    const res = await mc('DELETE', '/api/billing/subscription', null, milocuraJwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_SUBSCRIPTION');
  });

  test('retorna 400 para usuario sin suscripción', async () => {
    const noSubEmail = `no-sub-cancel-${Date.now()}@milocura-test.com`;
    await mc('POST', '/api/auth/register', { email: noSubEmail, password: TEST_PASSWORD, name: 'No Sub Cancel' });
    const login = await mc('POST', '/api/auth/login', { email: noSubEmail, password: TEST_PASSWORD });
    const jwt = login.body.token;

    const res = await mc('DELETE', '/api/billing/subscription', null, jwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_SUBSCRIPTION');
  });
});
