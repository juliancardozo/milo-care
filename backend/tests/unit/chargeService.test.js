'use strict';

const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../src/services/MercadoPagoService', () => ({ chargePartner: jest.fn() }));
const MercadoPagoService = require('../../src/services/MercadoPagoService');
const { chargeBillingRecord } = require('../../src/services/ChargeService');

const rec = (over = {}) => ({ status: 'issued', total: 100, currency: 'UYU', month: '2026-06', chargeAttempts: 0, save: jest.fn().mockResolvedValue(true), ...over });
const partnerAuto = { _id: 'p1', billing: { autoCharge: true, paymentToken: 'tok', payerEmail: 'pay@p.com' } };
const partnerManual = { _id: 'p1', billing: { autoCharge: false } };

describe('ChargeService.chargeBillingRecord', () => {
  beforeEach(() => jest.clearAllMocks());

  it('factura ya pagada → idempotente, no cobra', async () => {
    const r = await chargeBillingRecord(rec({ status: 'paid' }), partnerAuto);
    expect(r.alreadyPaid).toBe(true);
    expect(MercadoPagoService.chargePartner).not.toHaveBeenCalled();
  });

  it('total 0 → marca pagada sin cobrar', async () => {
    const record = rec({ total: 0 });
    const r = await chargeBillingRecord(record, partnerAuto);
    expect(r.zero).toBe(true);
    expect(record.status).toBe('paid');
  });

  it('partner sin autoCharge → queda manual (issued)', async () => {
    const record = rec();
    const r = await chargeBillingRecord(record, partnerManual);
    expect(r.reason).toBe('manual');
    expect(record.status).toBe('issued');
    expect(MercadoPagoService.chargePartner).not.toHaveBeenCalled();
  });

  it('pago aprobado → paid + chargeRef', async () => {
    MercadoPagoService.chargePartner.mockResolvedValue({ id: 'pay-1', status: 'approved' });
    const record = rec();
    const r = await chargeBillingRecord(record, partnerAuto);
    expect(r.charged).toBe(true);
    expect(record.status).toBe('paid');
    expect(record.chargeRef).toBe('pay-1');
    expect(record.chargeAttempts).toBe(1);
  });

  it('pago rechazado → failed', async () => {
    MercadoPagoService.chargePartner.mockResolvedValue({ id: 'pay-2', status: 'rejected' });
    const record = rec();
    await chargeBillingRecord(record, partnerAuto);
    expect(record.status).toBe('failed');
    expect(record.chargeError).toBe('payment_rejected');
  });

  it('error del proveedor → failed + error', async () => {
    MercadoPagoService.chargePartner.mockRejectedValue(Object.assign(new Error('x'), { code: 'NO_PAYMENT_METHOD' }));
    const record = rec();
    const r = await chargeBillingRecord(record, partnerAuto);
    expect(r.charged).toBe(false);
    expect(record.status).toBe('failed');
    expect(record.chargeError).toBe('NO_PAYMENT_METHOD');
  });
});
