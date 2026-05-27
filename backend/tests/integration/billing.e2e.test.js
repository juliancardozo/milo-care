'use strict';

/**
 * E2E integration test: Milo Care ↔ MiCuota billing platform
 *
 * Requires both services running:
 *   - Milo Care backend: http://localhost:3001
 *   - MiCuota platform:  http://localhost:8080
 *
 * Run: npm test -- --testPathPattern=billing.e2e
 */

const BASE_URL = 'http://localhost:3001';
const BILLING_URL = process.env.BILLING_API_URL || 'http://localhost:8080';
const BILLING_TOKEN = process.env.BILLING_AUTH_TOKEN;

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

async function platform(method, path, body) {
  const res = await fetch(`${BILLING_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': BILLING_TOKEN,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, body: json };
}

// ─── setup/teardown ───────────────────────────────────────────────────────────

beforeAll(async () => {
  // Register a fresh test user
  const reg = await mc('POST', '/api/auth/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    name: 'Test Billing User',
  });
  expect(reg.status).toBe(201);

  // Login
  const login = await mc('POST', '/api/auth/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  expect(login.status).toBe(200);
  milocuraJwt = login.body.token;
  expect(milocuraJwt).toBeTruthy();
});

afterAll(async () => {
  // Best-effort cleanup: cancel subscription if active
  if (billingSubscriptionId) {
    await mc('DELETE', '/api/billing/subscription', null, milocuraJwt).catch(() => {});
  }
});

// ─── tests ────────────────────────────────────────────────────────────────────

describe('Prerequisites', () => {
  test('MiCuota platform is reachable', async () => {
    // Use /db sub-path to skip slow SMTP probe (mail health check can hang > 5s)
    const res = await fetch(`${BILLING_URL}/actuator/health/db`);
    const body = await res.json();
    expect(body.status).toBe('UP');
  }, 15000);

  test('BILLING_AUTH_TOKEN is configured and valid', async () => {
    expect(BILLING_TOKEN).toBeTruthy();
    const res = await platform('GET', '/api/billing/subscriptions');
    expect(res.status).toBe(200);
  });

  test('Milo Care backend is reachable', async () => {
    const res = await mc('POST', '/api/auth/login', {
      email: 'nonexistent@test.com',
      password: 'x',
    });
    // 401 means the route exists and the server is responding
    expect([200, 401, 400]).toContain(res.status);
  });
});

describe('POST /api/billing/checkout', () => {
  test('returns checkoutUrl pointing to mercadopago.com', async () => {
    const res = await mc(
      'POST',
      '/api/billing/checkout',
      { returnUrl: 'https://app.milocura.com/subscription/callback' },
      milocuraJwt
    );

    expect(res.status).toBe(200);
    expect(res.body.checkoutUrl).toMatch(/mercadopago\.com/);
    expect(res.body.subscriptionId).toMatch(/^billing-/);

    billingSubscriptionId = res.body.subscriptionId;
    console.log('  checkoutUrl:', res.body.checkoutUrl);
    console.log('  subscriptionId:', billingSubscriptionId);
  });

  test('user billingSubscriptionStatus is now pending', async () => {
    const res = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.subscriptionId).toBe(billingSubscriptionId);
    expect(res.body.provider).toBe('MERCADOPAGO');
  });

  test('returns 409 if user already has a pending/active subscription', async () => {
    const res = await mc(
      'POST',
      '/api/billing/checkout',
      { returnUrl: 'https://app.milocura.com/subscription/callback' },
      milocuraJwt
    );
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_SUBSCRIBED');
  });

  test('returns 400 when returnUrl is missing', async () => {
    const res = await mc('POST', '/api/billing/checkout', {}, milocuraJwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  test('returns 401 without auth token', async () => {
    const res = await mc('POST', '/api/billing/checkout', {
      returnUrl: 'https://app.milocura.com/subscription/callback',
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/billing/subscription', () => {
  test('returns subscription details for authenticated user', async () => {
    const res = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body.tier).toMatch(/^(free|premium)$/);
    expect(res.body.status).toMatch(/^(none|pending|active|past_due|cancel_pending|canceled|failed)$/);
    // provider is null when no subscription exists, or a string when one does
    expect(res.body.provider === null || typeof res.body.provider === 'string').toBe(true);
  });

  test('returns 401 without auth token', async () => {
    const res = await mc('GET', '/api/billing/subscription');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/billing/subscription/sync', () => {
  test('sync returns current tier and status', async () => {
    const res = await mc('POST', '/api/billing/subscription/sync', null, milocuraJwt);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      tier: expect.stringMatching(/^(free|premium)$/),
      status: expect.stringMatching(/^(none|pending|active|past_due|cancel_pending|canceled|failed)$/),
    });
    // In sandbox without actual payment, status stays pending
    expect(res.body.status).toBe('pending');
    console.log('  After sync — tier:', res.body.tier, '| status:', res.body.status);
  });

  test('returns 400 when user has no subscription', async () => {
    // Register a fresh user with no subscription
    const noSubEmail = `no-sub-${Date.now()}@milocura-test.com`;
    await mc('POST', '/api/auth/register', {
      email: noSubEmail,
      password: TEST_PASSWORD,
      name: 'No Sub User',
    });
    const login = await mc('POST', '/api/auth/login', {
      email: noSubEmail,
      password: TEST_PASSWORD,
    });
    const jwt = login.body.token;

    const res = await mc('POST', '/api/billing/subscription/sync', null, jwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_SUBSCRIPTION');
  });
});

describe('POST /api/billing/webhooks/mercadopago', () => {
  test('responds 200 to a simulated MP preapproval event', async () => {
    const mpEvent = {
      id: 999999,
      type: 'subscription_preapproval',
      date_created: new Date().toISOString(),
      data: { id: 'fake-preapproval-id-for-test' },
    };

    const res = await fetch(`${BASE_URL}/api/billing/webhooks/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mpEvent),
    });

    expect(res.status).toBe(200);
  });

  test('responds 200 to an empty body (MP sometimes sends empty pings)', async () => {
    const res = await fetch(`${BASE_URL}/api/billing/webhooks/mercadopago`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/billing/subscription (cancel)', () => {
  test('sets billingSubscriptionStatus to cancel_pending', async () => {
    const cancel = await mc('DELETE', '/api/billing/subscription', null, milocuraJwt);
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancel_pending');

    // Verify status in GET
    const status = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    expect(status.body.status).toBe('cancel_pending');

    billingSubscriptionId = null; // already handled in teardown
  });

  test('returns 400 when no subscription exists', async () => {
    const noSubEmail = `no-sub-cancel-${Date.now()}@milocura-test.com`;
    await mc('POST', '/api/auth/register', {
      email: noSubEmail,
      password: TEST_PASSWORD,
      name: 'No Sub Cancel User',
    });
    const login = await mc('POST', '/api/auth/login', {
      email: noSubEmail,
      password: TEST_PASSWORD,
    });
    const jwt = login.body.token;

    const res = await mc('DELETE', '/api/billing/subscription', null, jwt);
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('NO_SUBSCRIPTION');
  });
});

describe('MiCuota platform direct verification', () => {
  test('subscription key is registered in MiCuota', async () => {
    // The subscriptionId was stored before cancel test ran
    // Re-fetch from Milo Care to get the actual ID
    const milocuraStatus = await mc('GET', '/api/billing/subscription', null, milocuraJwt);
    const subId = milocuraStatus.body.subscriptionId;

    if (!subId) {
      console.log('  No subscriptionId found — skipping platform check');
      return;
    }

    const platformRes = await platform('GET', `/api/billing/subscriptions/${subId}`);
    expect(platformRes.status).toBe(200);
    expect(platformRes.body.planCode).toBe('PREMIUM');
    expect(platformRes.body.provider).toBe('MERCADOPAGO');
    expect(['PENDING', 'CANCEL_PENDING']).toContain(platformRes.body.status);
    console.log('  MiCuota status:', platformRes.body.status);
    console.log('  MiCuota planCode:', platformRes.body.planCode);
  });
});
