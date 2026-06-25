'use strict';

const { describe, it, expect, beforeEach } = require('@jest/globals');

jest.mock('../../src/models/User', () => ({ find: jest.fn() }));
jest.mock('../../src/models/UsageRecord', () => ({ updateOne: jest.fn().mockResolvedValue({}) }));
jest.mock('../../src/models/BillingRecord', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../../src/models/InsuranceLead', () => ({ countDocuments: jest.fn() }));

const User = require('../../src/models/User');
const UsageRecord = require('../../src/models/UsageRecord');
const BillingRecord = require('../../src/models/BillingRecord');
const InsuranceLead = require('../../src/models/InsuranceLead');
const MeteringService = require('../../src/services/MeteringService');

const PARTNER = { _id: 'p1', contract: { setupFee: 100, pricePerActivePet: 5, currency: 'UYU', billingDay: 1 } };

function mockUsers() {
  // 3 perros del partner (2 activos en 2026-06) + 1 de otro partner (no cuenta).
  const users = [{
    _id: 'u1',
    dogs: [
      { _id: 'd1', partnerId: 'p1', vaccinations: [{ dateAdministered: new Date('2026-06-10') }] }, // activo
      { _id: 'd2', partnerId: 'p1', symptoms: [{ dateObserved: new Date('2026-06-02') }] }, // activo
      { _id: 'd3', partnerId: 'p1' }, // inactivo
      { _id: 'd4', partnerId: 'other', symptoms: [{ dateObserved: new Date('2026-06-02') }] }, // otro partner
    ],
  }];
  User.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(users) }) });
}

describe('MeteringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    UsageRecord.updateOne.mockResolvedValue({});
    InsuranceLead.countDocuments.mockResolvedValue(0);
    BillingRecord.findOneAndUpdate.mockImplementation((q, update) => Promise.resolve({ month: q.month, ...update.$set }));
  });

  it('computePartnerUsage cuenta solo los perros del partner y los activos del mes', async () => {
    mockUsers();
    const { activePets, totalPets } = await MeteringService.computePartnerUsage(PARTNER, '2026-06');
    expect(totalPets).toBe(3); // d1,d2,d3 (no d4)
    expect(activePets).toBe(2); // d1,d2
    expect(UsageRecord.updateOne).toHaveBeenCalledTimes(3);
  });

  it('primera factura del partner: aplica setupFee + activePets * price', async () => {
    mockUsers();
    BillingRecord.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve(null) }) }); // sin facturas previas
    const rec = await MeteringService.generateBillingRecord(PARTNER, '2026-06');
    expect(rec.setupFeeApplied).toBe(100);
    expect(rec.activePets).toBe(2);
    expect(rec.total).toBe(100 + 2 * 5); // 110
    expect(rec.currency).toBe('UYU');
  });

  it('facturas siguientes: NO reaplica setupFee', async () => {
    mockUsers();
    BillingRecord.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: 'prev' }) }) });
    const rec = await MeteringService.generateBillingRecord(PARTNER, '2026-06');
    expect(rec.setupFeeApplied).toBe(0);
    expect(rec.total).toBe(2 * 5); // 10
  });

  it('suma lead-gen: qualifiedLeads*CPL + convertedPolicies*CPA al total', async () => {
    mockUsers();
    BillingRecord.findOne.mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ _id: 'prev' }) }) }); // setupFee no aplica
    InsuranceLead.countDocuments.mockResolvedValueOnce(4).mockResolvedValueOnce(1); // 4 leads, 1 conversión
    const partner = { _id: 'p1', contract: { pricePerActivePet: 5, pricePerLead: 10, pricePerConversion: 40, currency: 'UYU' } };

    const rec = await MeteringService.generateBillingRecord(partner, '2026-06');
    expect(rec.qualifiedLeads).toBe(4);
    expect(rec.convertedPolicies).toBe(1);
    expect(rec.leadRevenue).toBe(4 * 10 + 1 * 40); // 80
    expect(rec.total).toBe(2 * 5 + 80); // 90 (2 activas x 5 + lead-gen)
  });

  it('previousMonthKey devuelve el mes anterior en UTC', () => {
    expect(MeteringService.previousMonthKey(new Date('2026-01-05T00:00:00Z'))).toBe('2025-12');
    expect(MeteringService.previousMonthKey(new Date('2026-07-15T00:00:00Z'))).toBe('2026-06');
  });
});
