'use strict';

/**
 * E2E integration test: Milo Care billing ↔ MercadoPago (sandbox)
 *
 * Requiere:
 *   - Milo Care backend corriendo: http://localhost:3001
 *   - MP_ACCESS_TOKEN configurado con credenciales de sandbox (TEST-...)
 *
 * Run: npm test -- --testPathPattern=billing.e2e
 */

const BASE_URL = 'http://localhost:3001';
const MP_API = 'https://api.mercadopago.com';

const TEST_EMAIL = `billing-e2e-${Date.now()}@milocura-test.com`;
const TEST_PASSWORD = 'Test1234!';

let milocuraJwt = null;
let billingSubscriptionId = null;

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

// ─── setup/teardown ───────────────────────────────────────────────────────────

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

afterAll(async () => {
  if (billingSubscriptionId) {
    await mc('DELETE', '/api/billing/subscription', null, milocuraJwt).catch(() => {});
  }
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe('Prerequisites', () => {
  test('Milo Care backend responde', async () => {
    const res = await mc('POST', '/api/auth/login', { email: 'x@x.com', password: 'x' });
    expect([200, 400, 401]).toContain(res.status);
  });

  test('MP_ACCESS_TOKEN configurado y válido', async () => {
    expect(process.env.MP_ACCESS_TOKEN).toBeTruthy();
    // Llamar a un endpoint público de MP que requiere autenticación
    const res = await mpGet('/users/me');
    expect(res.status).toBe(200);
  });
});

describe('POST /api/billing/checkout', () => {
  test('retorna checkoutUrl de mercadopago.com', async () => {
    const res = await mc(
      'POST',
      '/api/billing/checkout',
      { returnUrl: 'https://app.milocura.com/subscription/callback' },
      milocuraJwt
    );

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toMatch(/mercadopago\.com/);
    expect(res.body.subscriptionId).toBeTruthy();

    billingSubscriptionId = res.body.subscriptionId;
    console.log('  checkoutUrl:', res.body.checkoutUrl);
    console.log('  subscriptionId (preapproval MP):', billingSubscriptionId);
  });

  test('billingSubscriptionStatus queda en pending', async () => {
    const res = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.subscriptionId).toBe(billingSubscriptionId);
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
  test('sync retorna tier y status actuales', async () => {
    const res = await mc('POST', '/api/billing/subscription/sync', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tier: expect.stringMatching(/^(free|premium)$/),
      status: expect.stringMatching(/^(none|pending|active|past_due|cancel_pending|canceled|failed)$/),
    });
    // En sandbox sin pago real el status se mantiene pending
    expect(res.body.status).toBe('pending');
    console.log('  Después de sync — tier:', res.body.tier, '| status:', res.body.status);
  });

  test('retorna 400 si el usuario no tiene suscripción', async () => {
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
      data: { id: billingSubscriptionId || 'fake-preapproval-id-test' },
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

describe('MP directo: preapproval existe en MercadoPago', () => {
  test('el preapproval creado existe y tiene status pending en MP', async () => {
    if (!billingSubscriptionId) {
      console.log('  No hay subscriptionId — saltando verificación MP directa');
      return;
    }

    const res = await mpGet(`/preapproval/${billingSubscriptionId}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(billingSubscriptionId);
    expect(res.body.status).toBe('pending');
    console.log('  MP preapproval status:', res.body.status);
    console.log('  MP preapproval reason:', res.body.reason);
  });
});

describe('DELETE /api/billing/subscription (cancel)', () => {
  test('cancela la suscripción y actualiza el status', async () => {
    const cancel = await mc('DELETE', '/api/billing/subscription', null, milocuraJwt);
    expect(cancel.status).toBe(200);
    // MP cancela sincrónicamente → debería llegar a 'canceled'
    expect(['canceled', 'cancel_pending']).toContain(cancel.body.status);

    const status = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(['canceled', 'cancel_pending']).toContain(status.body.status);

    billingSubscriptionId = null;
  });

  test('retorna 400 si no hay suscripción activa', async () => {
    const noSubEmail = `no-sub-cancel-${Date.now()}@milocura-test.com`;
    await mc('POST', '/api/auth/register', { email: noSubEmail, password: TEST_PASSWORD, name: 'No Sub Cancel' });
    const login = await mc('POST', '/api/auth/login', { email: noSubEmail, password: TEST_PASSWORD });
    const jwt = login.body.token;

    const res = await mc('DELETE', '/api/billing/subscription', null, jwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_SUBSCRIPTION');
  });
});
