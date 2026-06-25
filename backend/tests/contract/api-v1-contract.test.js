'use strict';

const request = require('supertest');

process.env.COMPANION_ENABLED = 'true';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

jest.mock('../../src/models/Partner', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/PartnerEvent', () => ({ create: jest.fn() }));
jest.mock('../../src/models/User', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/VetAttestation', () => ({ find: jest.fn() }));
jest.mock('../../src/models/InsurancePolicy', () => ({ findOne: jest.fn() }));
jest.mock('../../src/services/CertificateService', () => ({ getActive: jest.fn(), shareableView: jest.fn() }));
jest.mock('../../src/services/ConsentService', () => ({ hasConsent: jest.fn() }));

const Partner = require('../../src/models/Partner');
const PartnerEvent = require('../../src/models/PartnerEvent');
const User = require('../../src/models/User');
const VetAttestation = require('../../src/models/VetAttestation');
const InsurancePolicy = require('../../src/models/InsurancePolicy');
const CertificateService = require('../../src/services/CertificateService');
const ConsentService = require('../../src/services/ConsentService');
const app = require('../../src/app');

const PARTNER = { _id: 'p1', name: 'Acme', status: 'active' };

describe('Contract: API v1 (auth por API key, aislada por partner)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/v1/events', () => {
    it('sin API key → 401', async () => {
      const res = await request(app).post('/api/v1/events').send({ type: 'x' });
      expect(res.status).toBe(401);
      expect(Partner.findOne).not.toHaveBeenCalled();
    });

    it('API key inválida → 401', async () => {
      Partner.findOne.mockResolvedValue(null);
      const res = await request(app).post('/api/v1/events').set('X-API-Key', 'mp_bad').send({ type: 'x' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_API_KEY');
    });

    it('API key válida → 201 y scoped al partner', async () => {
      Partner.findOne.mockResolvedValue(PARTNER);
      PartnerEvent.create.mockResolvedValue({ _id: 'ev-1' });
      const res = await request(app).post('/api/v1/events').set('Authorization', 'Bearer mp_good').send({ type: 'policy.updated', payload: { a: 1 } });
      expect(res.status).toBe(201);
      expect(res.body.received).toBe(true);
      expect(PartnerEvent.create).toHaveBeenCalledWith(expect.objectContaining({ partnerId: 'p1', type: 'policy.updated' }));
    });
  });

  describe('GET /api/v1/pets/:id', () => {
    it('perro del partner → vista consentida SIN dato clínico', async () => {
      Partner.findOne.mockResolvedValue(PARTNER);
      const dog = { _id: 'dog-1', name: 'Luna', breed: 'Mestizo', sponsorshipStatus: 'sponsored' };
      User.findOne.mockReturnValue({ select: () => Promise.resolve({ dogs: { id: (i) => (i === 'dog-1' ? dog : null) } }) });
      VetAttestation.find.mockReturnValue({ lean: () => Promise.resolve([]) });
      InsurancePolicy.findOne.mockReturnValue({ select: () => Promise.resolve(null) });

      const res = await request(app).get('/api/v1/pets/dog-1').set('X-API-Key', 'mp_good');
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Luna');
      expect(res.body.verification).toBeTruthy();
      // No expone historial clínico individual.
      expect(res.body).not.toHaveProperty('vaccinations');
      expect(res.body).not.toHaveProperty('symptoms');
    });

    it('perro de OTRO partner → 404 (aislamiento)', async () => {
      Partner.findOne.mockResolvedValue(PARTNER);
      User.findOne.mockReturnValue({ select: () => Promise.resolve(null) }); // $elemMatch no matchea
      const res = await request(app).get('/api/v1/pets/dog-x').set('X-API-Key', 'mp_good');
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/pets/:id/certificate', () => {
    const dog = { _id: 'dog-1', name: 'Luna' };
    beforeEach(() => {
      Partner.findOne.mockResolvedValue(PARTNER);
      User.findOne.mockReturnValue({ select: () => Promise.resolve({ dogs: { id: (i) => (i === 'dog-1' ? dog : null) } }) });
    });

    it('sin consentimiento del tutor → 403 NO_CONSENT', async () => {
      ConsentService.hasConsent.mockResolvedValue(false);
      const res = await request(app).get('/api/v1/pets/dog-1/certificate').set('X-API-Key', 'mp_good');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('NO_CONSENT');
    });

    it('con consentimiento → nivel del certificado (sin score)', async () => {
      ConsentService.hasConsent.mockResolvedValue(true);
      CertificateService.getActive.mockResolvedValue({ _id: 'c1' });
      CertificateService.shareableView.mockReturnValue({ confidenceLevel: 'certified', validUntil: new Date('2027-01-01'), certifiedBy: 'Clínica Palermo', attestedCount: 2 });
      const res = await request(app).get('/api/v1/pets/dog-1/certificate').set('X-API-Key', 'mp_good');
      expect(res.status).toBe(200);
      expect(res.body.confidenceLevel).toBe('certified');
      expect(res.body).not.toHaveProperty('score');
    });
  });
});
