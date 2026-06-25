'use strict';

const request = require('supertest');

process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

let mockActor;
jest.mock('../../src/middleware/auth', () => (req, _res, next) => { req.user = mockActor; next(); });

jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../../src/models/Partner', () => ({ findById: jest.fn() }));
jest.mock('../../src/services/MetricsService', () => ({ computeMetrics: jest.fn() }));
jest.mock('../../src/services/MeteringService', () => ({
  previousMonthKey: () => '2026-05',
  monthKey: () => '2026-06',
  generateBillingRecord: jest.fn(),
}));

const User = require('../../src/models/User');
const Partner = require('../../src/models/Partner');
const MetricsService = require('../../src/services/MetricsService');
const app = require('../../src/app');

const partnerAdmin = (partnerId) => { User.findById.mockReturnValue({ select: () => Promise.resolve({ partnerId }) }); };

describe('Contract: partner dashboard scoping (metrics/billing)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Partner.findById.mockResolvedValue({ _id: 'p1', name: 'Acme', contract: {} });
    MetricsService.computeMetrics.mockResolvedValue({ partnerId: 'p1', month: '2026-05', totalPets: 10, activePets: 7, adherenceRate: 0.6, retentionRate: 0.8, eventsByType: { vaccinations: 3 } });
  });

  it('admin ve las métricas de cualquier partner', async () => {
    mockActor = { id: 'admin-1', role: 'admin' };
    const res = await request(app).get('/api/partners/p1/metrics?month=2026-05');
    expect(res.status).toBe(200);
    expect(res.body.activePets).toBe(7);
    // solo agregados: sin nombres de perros/tutores
    expect(JSON.stringify(res.body)).not.toMatch(/name|dogName|owner/i);
  });

  it('partner_admin ve SOLO su propio partner', async () => {
    mockActor = { id: 'pa-1', role: 'partner_admin' };
    partnerAdmin('p1');
    const res = await request(app).get('/api/partners/p1/metrics');
    expect(res.status).toBe(200);
    expect(res.body.totalPets).toBe(10);
  });

  it('partner_admin de OTRO partner → 403 (aislamiento)', async () => {
    mockActor = { id: 'pa-9', role: 'partner_admin' };
    partnerAdmin('p9');
    const res = await request(app).get('/api/partners/p1/metrics');
    expect(res.status).toBe(403);
    expect(MetricsService.computeMetrics).not.toHaveBeenCalled();
  });

  it('rol user común → 403', async () => {
    mockActor = { id: 'u-1', role: 'user' };
    const res = await request(app).get('/api/partners/p1/billing');
    expect(res.status).toBe(403);
  });
});
