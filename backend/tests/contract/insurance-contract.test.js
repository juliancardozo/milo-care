'use strict';

const request = require('supertest');

process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1' };
  next();
});

jest.mock('../../src/services/DogAccess', () => ({ loadForRequest: jest.fn(), resolveDog: jest.fn() }));
jest.mock('../../src/models/InsurancePolicy', () => ({ findOne: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../../src/models/Claim', () => ({ create: jest.fn(), find: jest.fn(), findById: jest.fn() }));
jest.mock('../../src/models/InsuranceLead', () => ({ create: jest.fn() }));
jest.mock('../../src/models/Partner', () => ({ findById: jest.fn() }));
jest.mock('../../src/services/WebhookService', () => ({ deliver: jest.fn() }));
jest.mock('../../src/services/AuditService', () => ({ record: jest.fn() }));

const DogAccess = require('../../src/services/DogAccess');
const InsurancePolicy = require('../../src/models/InsurancePolicy');
const Claim = require('../../src/models/Claim');
const InsuranceLead = require('../../src/models/InsuranceLead');
const Partner = require('../../src/models/Partner');
const WebhookService = require('../../src/services/WebhookService');
const app = require('../../src/app');

const DOG = {
  _id: 'dog-1', name: 'Luna', partnerId: 'p1',
  symptoms: [{ _id: 's1', symptomType: 'cojera', dateObserved: new Date() }],
  appointments: [], consultations: [], medications: [],
};
const OWNER = { _id: 'user-1', email: 'ana@test.com', partnerId: 'p1' };

const POLICY = {
  _id: 'pol-1', dogId: 'dog-1', startDate: new Date('2026-06-01'),
  coverage: [{ item: 'accidente', covered: true, limit: 50000, currency: 'UYU', carenciaDays: 0 }],
  toObject() { return { ...this }; },
};

describe('Contract: Insurance Companion (póliza, coverage-check, claims, lead)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    DogAccess.loadForRequest.mockResolvedValue({ owner: OWNER, dog: DOG });
  });

  it('POST /policy crea la póliza', async () => {
    InsurancePolicy.findOneAndUpdate.mockResolvedValue(POLICY);
    const res = await request(app).post('/api/dogs/dog-1/policy').send({ policyNumber: 'X1', coverage: POLICY.coverage });
    expect(res.status).toBe(201);
    expect(res.body.coverage).toHaveLength(1);
  });

  it('GET coverage-check responde con disclaimer y nunca afirma cobertura vinculante', async () => {
    InsurancePolicy.findOne.mockResolvedValue(POLICY);
    const res = await request(app).get('/api/dogs/dog-1/policy/coverage-check?event=accidente');
    expect(res.status).toBe(200);
    expect(res.body.disclaimer).toBeTruthy();
    expect(res.body.disclaimer.toLowerCase()).toContain('no es una confirmación');
    expect(res.body.likelyCovered).toBe(true);
  });

  it('POST /claims arma un borrador con eventos del historial enlazados', async () => {
    InsurancePolicy.findOne.mockReturnValue({ select: () => Promise.resolve({ _id: 'pol-1' }) });
    Claim.create.mockImplementation((doc) => Promise.resolve({ ...doc, _id: 'claim-1', toObject() { return { ...doc, _id: 'claim-1' }; } }));
    const res = await request(app).post('/api/dogs/dog-1/claims').send({ type: 'accident' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('draft');
    expect(res.body.linkedEvents.length).toBeGreaterThan(0);
    expect(res.body.disclaimer).toBeTruthy();
  });

  it('POST /insurance-lead crea el lead y dispara el webhook al partner', async () => {
    const lead = { _id: 'lead-1', createdAt: new Date(), intent: 'wants_quote', contact: {}, webhookAttempts: 0, status: 'new', save: jest.fn().mockResolvedValue(true) };
    InsuranceLead.create.mockResolvedValue(lead);
    Partner.findById.mockReturnValue({ select: () => Promise.resolve({ webhookUrl: 'https://partner.test/hook' }) });
    WebhookService.deliver.mockResolvedValue({ ok: true, attempts: 1, status: 200 });

    const res = await request(app).post('/api/dogs/dog-1/insurance-lead').send({});
    expect(res.status).toBe(201);
    expect(WebhookService.deliver).toHaveBeenCalledWith('https://partner.test/hook', expect.objectContaining({ event: 'insurance_lead.created' }));
    expect(res.body.webhookDelivered).toBe(true);
    expect(lead.webhookDeliveredAt).toBeTruthy();
  });
});
