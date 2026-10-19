'use strict';

// Test del servicio de notificaciones a Slack (unit) + resiliencia de rutas (integración).
// Sin red real: se mockea `fetch`. Sin DB real: se mockean los modelos/servicios.

process.env.JWT_SECRET = 'test-secret';

// ── Mocks para el test de integración de POST /api/auth/register ──────────────
jest.mock('../src/models/User', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));
jest.mock('../src/services/referralService', () => ({
  generateUniqueCode: jest.fn().mockResolvedValue('MILO-TEST'),
  registerReferral: jest.fn(),
}));
jest.mock('../src/services/EmailService', () => ({
  sendWelcome: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const User = require('../src/models/User');
const SlackService = require('../src/services/SlackService');

const SLACK_ENV = ['SLACK_ENABLED', 'SLACK_WEBHOOK_URL', 'SLACK_WEBHOOK_URL_BILLING', 'SLACK_WEBHOOK_URL_ALERTS'];

describe('SlackService', () => {
  let originalFetch;
  let savedEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    savedEnv = {};
    SLACK_ENV.forEach((k) => { savedEnv[k] = process.env[k]; });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    SLACK_ENV.forEach((k) => {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    });
    jest.useRealTimers();
  });

  test('no-op silencioso (sin fetch ni throw) cuando SLACK_ENABLED=false', async () => {
    process.env.SLACK_ENABLED = 'false';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/main';
    global.fetch = jest.fn();

    await expect(
      SlackService.notifyNewUser({ name: 'Laura', email: 'laura@example.com', tier: 'free' })
    ).resolves.toBeUndefined();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('no lanza y reintenta una vez cuando el webhook responde 500', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({ status: 500 });

    const promise = SlackService._internal.send('https://hooks.slack.test/main', { blocks: [] });
    // Avanza el backoff de 2s del reintento (sin llegar al timeout de 5s → no aborta).
    await jest.advanceTimersByTimeAsync(2100);
    await expect(promise).resolves.toBeUndefined();

    expect(global.fetch).toHaveBeenCalledTimes(2); // intento inicial + 1 reintento
  });

  test('no reintenta ante 4xx (payload/webhook inválido)', async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 400 });
    await expect(
      SlackService._internal.send('https://hooks.slack.test/main', { blocks: [] })
    ).resolves.toBeUndefined();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('el payload de notifyNewUser incluye nombre, email y plan', async () => {
    process.env.SLACK_ENABLED = 'true';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/main';
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    await SlackService.notifyNewUser({ name: 'Laura Pérez', email: 'laura@example.com', tier: 'premium', country: 'AR' });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://hooks.slack.test/main');
    const body = JSON.parse(options.body);
    const text = JSON.stringify(body);
    expect(text).toContain('Laura Pérez');
    expect(text).toContain('laura@example.com');
    expect(text).toContain('premium');
    expect(text).toContain('AR');
    // Estructura Block Kit válida.
    expect(body.blocks[0].type).toBe('header');
  });

  test('rutea al webhook de billing cuando está definido', async () => {
    process.env.SLACK_ENABLED = 'true';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/main';
    process.env.SLACK_WEBHOOK_URL_BILLING = 'https://hooks.slack.test/billing';
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    await SlackService.notifyTierLimitHit({ userName: 'Ana', userEmail: 'ana@example.com' });
    expect(global.fetch.mock.calls[0][0]).toBe('https://hooks.slack.test/billing');
  });

  test('los canales opcionales caen al webhook principal si no están definidos', async () => {
    process.env.SLACK_ENABLED = 'true';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/main';
    delete process.env.SLACK_WEBHOOK_URL_ALERTS;
    global.fetch = jest.fn().mockResolvedValue({ status: 200 });

    await SlackService.notifyPasswordReset({ userEmail: 'ana@example.com' });
    expect(global.fetch.mock.calls[0][0]).toBe('https://hooks.slack.test/main');
  });
});

describe('Integración: las rutas responden 2xx aunque Slack falle', () => {
  let savedEnv;
  let originalFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    savedEnv = {};
    SLACK_ENV.forEach((k) => { savedEnv[k] = process.env[k]; });
    // Slack habilitado pero la red falla siempre: probamos el fire-and-forget.
    process.env.SLACK_ENABLED = 'true';
    process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.test/main';
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
  });

  afterEach(() => {
    global.fetch = originalFetch;
    SLACK_ENV.forEach((k) => {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    });
  });

  test('POST /api/auth/register devuelve 201 aunque el webhook de Slack falle', async () => {
    // eslint-disable-next-line global-require
    const app = require('../src/app');

    User.findOne.mockResolvedValue(null); // email no registrado
    User.create.mockResolvedValue({
      _id: { toString: () => '665000000000000000000001' },
      name: 'Laura',
      email: 'laura@example.com',
      tier: 'free',
      location: null,
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Laura', email: 'laura@example.com', password: 'supersecret' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('laura@example.com');
  });
});
