'use strict';

const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1' };
  next();
});

jest.mock('../../src/models/User', () => ({ findById: jest.fn(), findOne: jest.fn() }));
jest.mock('../../src/services/PaddleService', () => ({
  isConfigured: jest.fn(),
  createCheckout: jest.fn(),
  verifyWebhook: jest.fn(),
  cancelSubscription: jest.fn(),
}));
// El router también importa estos; los dejamos inertes para este test.
jest.mock('../../src/services/MercadoPagoService', () => ({ isConfigured: jest.fn(), createCheckout: jest.fn(), getPayment: jest.fn() }));
jest.mock('../../src/services/BillingService', () => ({ requestUpgrade: jest.fn() }));

const User = require('../../src/models/User');
const PaddleService = require('../../src/services/PaddleService');
const app = require('../../src/app');

describe('Contract: billing Paddle (Merchant of Record)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.BILLING_PROVIDER = 'paddle';
  });
  afterAll(() => { delete process.env.BILLING_PROVIDER; });

  describe('POST /api/billing/checkout', () => {
    it('Paddle configurado → devuelve checkoutUrl hosted', async () => {
      PaddleService.isConfigured.mockReturnValue(true);
      User.findById.mockResolvedValue({ _id: 'user-1', email: 'a@b.com', isPremiumActive: () => false });
      PaddleService.createCheckout.mockResolvedValue({ checkoutUrl: 'https://pay.paddle.com/checkout/x' });

      const res = await request(app).post('/api/billing/checkout');
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('paddle');
      expect(res.body.checkoutUrl).toContain('paddle.com');
    });

    it('Paddle no configurado → 503 (el front cae al flujo de interés)', async () => {
      PaddleService.isConfigured.mockReturnValue(false);
      const res = await request(app).post('/api/billing/checkout');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('PADDLE_NOT_CONFIGURED');
    });

    it('usuario ya premium → 409', async () => {
      PaddleService.isConfigured.mockReturnValue(true);
      User.findById.mockResolvedValue({ _id: 'user-1', isPremiumActive: () => true });
      const res = await request(app).post('/api/billing/checkout');
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('ALREADY_PREMIUM');
    });
  });

  describe('POST /api/billing/paddle/webhook', () => {
    it('firma inválida → 401', async () => {
      PaddleService.verifyWebhook.mockReturnValue(false);
      const res = await request(app)
        .post('/api/billing/paddle/webhook')
        .set('Paddle-Signature', 'ts=1;h1=bad')
        .send({ event_type: 'transaction.completed' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_SIGNATURE');
    });

    it('subscription.created → setea provider, id y consentimiento', async () => {
      PaddleService.verifyWebhook.mockReturnValue(true);
      const user = { _id: 'user-9', consentAt: null, save: jest.fn().mockResolvedValue(true) };
      User.findById.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/billing/paddle/webhook')
        .set('Paddle-Signature', 'ts=1;h1=ok')
        .send({
          event_type: 'subscription.created',
          data: { id: 'sub_1', status: 'active', custom_data: { user_id: 'user-9' } },
        });

      expect(res.status).toBe(200);
      expect(user.subscriptionProvider).toBe('paddle');
      expect(user.subscriptionId).toBe('sub_1');
      expect(user.subscriptionStatus).toBe('active');
      expect(user.consentAt).toBeInstanceOf(Date);
      expect(user.consentVersion).toBeTruthy();
      expect(user.save).toHaveBeenCalled();
    });

    it('transaction.completed → otorga Premium (idempotente por transacción)', async () => {
      PaddleService.verifyWebhook.mockReturnValue(true);
      const user = { _id: 'user-9', premiumPaymentRef: null, grantPremiumDays: jest.fn(), save: jest.fn().mockResolvedValue(true) };
      User.findById.mockResolvedValue(user);

      const payload = {
        event_type: 'transaction.completed',
        data: { id: 'txn_1', subscription_id: 'sub_1', custom_data: { user_id: 'user-9' } },
      };
      const res = await request(app).post('/api/billing/paddle/webhook').set('Paddle-Signature', 'ts=1;h1=ok').send(payload);
      expect(res.status).toBe(200);
      expect(user.grantPremiumDays).toHaveBeenCalled();
      expect(user.premiumPaymentRef).toBe('pd_txn_1');

      // Reintento de la misma transacción → no vuelve a otorgar.
      user.grantPremiumDays.mockClear();
      await request(app).post('/api/billing/paddle/webhook').set('Paddle-Signature', 'ts=1;h1=ok').send(payload);
      expect(user.grantPremiumDays).not.toHaveBeenCalled();
    });

    it('subscription.canceled → marca estado y cancelRequestedAt', async () => {
      PaddleService.verifyWebhook.mockReturnValue(true);
      const user = { _id: 'user-9', cancelRequestedAt: null, save: jest.fn().mockResolvedValue(true) };
      User.findById.mockResolvedValue(user);

      const res = await request(app)
        .post('/api/billing/paddle/webhook')
        .set('Paddle-Signature', 'ts=1;h1=ok')
        .send({ event_type: 'subscription.canceled', data: { id: 'sub_1', status: 'canceled', custom_data: { user_id: 'user-9' } } });

      expect(res.status).toBe(200);
      expect(user.subscriptionStatus).toBe('cancelled');
      expect(user.cancelRequestedAt).toBeInstanceOf(Date);
    });
  });

  describe('POST /api/billing/cancel', () => {
    it('con suscripción Paddle → cancela en el MoR y conserva premiumUntil', async () => {
      const until = new Date(Date.now() + 10 * 86400000);
      const user = { _id: 'user-1', subscriptionProvider: 'paddle', subscriptionId: 'sub_1', premiumUntil: until, save: jest.fn().mockResolvedValue(true) };
      User.findById.mockResolvedValue(user);
      PaddleService.cancelSubscription.mockResolvedValue({});

      const res = await request(app).post('/api/billing/cancel');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
      expect(PaddleService.cancelSubscription).toHaveBeenCalledWith('sub_1');
      expect(user.subscriptionStatus).toBe('cancelled');
      expect(user.cancelRequestedAt).toBeInstanceOf(Date);
    });

    it('sin suscripción → 409', async () => {
      User.findById.mockResolvedValue({ _id: 'user-1', subscriptionProvider: null, subscriptionId: null });
      const res = await request(app).post('/api/billing/cancel');
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('NO_SUBSCRIPTION');
    });
  });
});
