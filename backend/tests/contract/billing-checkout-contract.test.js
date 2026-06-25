'use strict';

const request = require('supertest');

process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1', role: 'admin' };
  next();
});

jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../../src/models/Partner', () => ({ findById: jest.fn() }));
jest.mock('../../src/services/MercadoPagoService', () => ({
  isConfigured: jest.fn(),
  createCheckout: jest.fn(),
  getPayment: jest.fn(),
}));
jest.mock('../../src/services/MeteringService', () => ({
  previousMonthKey: () => '2026-05',
  generateBillingRecord: jest.fn(),
}));

const User = require('../../src/models/User');
const Partner = require('../../src/models/Partner');
const MercadoPagoService = require('../../src/services/MercadoPagoService');
const MeteringService = require('../../src/services/MeteringService');
const app = require('../../src/app');

describe('Contract: billing checkout + webhook + partner billing', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/billing/checkout', () => {
    it('MP configurado → devuelve checkoutUrl', async () => {
      MercadoPagoService.isConfigured.mockReturnValue(true);
      User.findById.mockResolvedValue({ _id: 'user-1', isPremiumActive: () => false });
      MercadoPagoService.createCheckout.mockResolvedValue({ checkoutUrl: 'https://mp/checkout/x', preferenceId: 'pref-1' });

      const res = await request(app).post('/api/billing/checkout');
      expect(res.status).toBe(200);
      expect(res.body.checkoutUrl).toContain('https://mp/checkout');
    });

    it('MP no configurado → 503', async () => {
      MercadoPagoService.isConfigured.mockReturnValue(false);
      const res = await request(app).post('/api/billing/checkout');
      expect(res.status).toBe(503);
      expect(res.body.code).toBe('MP_NOT_CONFIGURED');
    });
  });

  describe('POST /api/billing/webhook', () => {
    it('pago aprobado → otorga Premium al usuario (idempotente)', async () => {
      MercadoPagoService.getPayment.mockResolvedValue({ status: 'approved', external_reference: 'user-9' });
      const user = { _id: 'user-9', premiumPaymentRef: null, grantPremiumDays: jest.fn(), save: jest.fn().mockResolvedValue(true) };
      User.findById.mockResolvedValue(user);

      const res = await request(app).post('/api/billing/webhook').send({ type: 'payment', data: { id: 'pay-1' } });
      expect(res.status).toBe(200);
      expect(user.grantPremiumDays).toHaveBeenCalled();
      expect(user.premiumPaymentRef).toBe('pay-1');
      expect(user.save).toHaveBeenCalled();
    });

    it('mismo payment id ya procesado → no vuelve a otorgar', async () => {
      MercadoPagoService.getPayment.mockResolvedValue({ status: 'approved', external_reference: 'user-9' });
      const user = { _id: 'user-9', premiumPaymentRef: 'pay-1', grantPremiumDays: jest.fn(), save: jest.fn() };
      User.findById.mockResolvedValue(user);

      const res = await request(app).post('/api/billing/webhook').send({ type: 'payment', data: { id: 'pay-1' } });
      expect(res.status).toBe(200);
      expect(user.grantPremiumDays).not.toHaveBeenCalled();
    });

    it('pago no aprobado → no otorga (200 para no provocar reintentos)', async () => {
      MercadoPagoService.getPayment.mockResolvedValue({ status: 'pending', external_reference: 'user-9' });
      const res = await request(app).post('/api/billing/webhook').send({ type: 'payment', data: { id: 'pay-2' } });
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/partners/:id/billing', () => {
    it('devuelve setupFee + activePets * price', async () => {
      Partner.findById.mockResolvedValue({ _id: 'p1', contract: { setupFee: 100, pricePerActivePet: 5 } });
      MeteringService.generateBillingRecord.mockResolvedValue({
        month: '2026-05', setupFeeApplied: 100, activePets: 2, pricePerActivePet: 5, total: 110, currency: 'UYU', status: 'issued',
      });

      const res = await request(app).get('/api/partners/p1/billing?month=2026-05');
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(110);
      expect(res.body.activePets).toBe(2);
      expect(res.body.setupFeeApplied).toBe(100);
    });
  });
});
