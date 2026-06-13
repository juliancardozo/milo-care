'use strict';

// Test hermético del flujo "interés en Premium" (sin red ni DB reales).
// Mockea el modelo User y EmailService; ejercita la ruta real + BillingService real.

process.env.JWT_SECRET = 'test-secret';
process.env.BILLING_NOTIFY_EMAIL = 'admin@milocura-test.com';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock('../../src/services/EmailService', () => ({
  sendPremiumInterestNotification: jest.fn().mockResolvedValue(undefined),
  sendPremiumInterestConfirmation: jest.fn().mockResolvedValue(undefined),
}));

const User = require('../../src/models/User');
const EmailService = require('../../src/services/EmailService');
const app = require('../../src/app');

const USER_ID = '665000000000000000000001';

function authToken(tier = 'free') {
  return jwt.sign({ sub: USER_ID, email: 'user@test.com', tier }, process.env.JWT_SECRET);
}

function mockUser(overrides = {}) {
  const tier = overrides.tier || 'free';
  return {
    _id: USER_ID,
    name: 'Juan',
    email: 'user@test.com',
    tier,
    dogs: [{}, {}],
    premiumInterestAt: null,
    premiumUntil: null,
    // Métodos del doc real usados por la ruta de billing.
    isPremiumActive() { return this.tier === 'premium' || (this.premiumUntil && this.premiumUntil > new Date()); },
    effectiveTier() { return this.isPremiumActive() ? 'premium' : 'free'; },
    ...overrides,
  };
}

describe('POST /api/billing/interest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findByIdAndUpdate.mockResolvedValue({});
  });

  test('401 sin token', async () => {
    const res = await request(app).post('/api/billing/interest');
    expect(res.status).toBe(401);
  });

  test('409 si el usuario ya es premium', async () => {
    User.findById.mockResolvedValue(mockUser({ tier: 'premium' }));

    const res = await request(app)
      .post('/api/billing/interest')
      .set('Authorization', `Bearer ${authToken('premium')}`);

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('ALREADY_PREMIUM');
    expect(EmailService.sendPremiumInterestNotification).not.toHaveBeenCalled();
  });

  test('registra interés: notifica al admin, confirma al usuario y guarda timestamp', async () => {
    User.findById.mockResolvedValue(mockUser());

    const res = await request(app)
      .post('/api/billing/interest')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'interest_registered', deduped: false });

    expect(EmailService.sendPremiumInterestNotification).toHaveBeenCalledTimes(1);
    expect(EmailService.sendPremiumInterestNotification).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'admin@milocura-test.com', userEmail: 'user@test.com', dogsCount: 2 })
    );
    expect(EmailService.sendPremiumInterestConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@test.com', userName: 'Juan' })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      USER_ID,
      expect.objectContaining({ premiumInterestAt: expect.any(Date) })
    );
  });

  test('deduplica: si ya pidió en las últimas 24h, no reenvía email', async () => {
    User.findById.mockResolvedValue(mockUser({ premiumInterestAt: new Date() }));

    const res = await request(app)
      .post('/api/billing/interest')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'interest_registered', deduped: true });
    expect(EmailService.sendPremiumInterestNotification).not.toHaveBeenCalled();
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  test('NO deduplica: si el último pedido fue hace más de 24h, reenvía', async () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    User.findById.mockResolvedValue(mockUser({ premiumInterestAt: old }));

    const res = await request(app)
      .post('/api/billing/interest')
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.deduped).toBe(false);
    expect(EmailService.sendPremiumInterestNotification).toHaveBeenCalledTimes(1);
  });
});
