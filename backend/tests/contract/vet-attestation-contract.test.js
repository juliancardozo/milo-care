'use strict';

const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// authenticate (usado por health-score) simulado; optionalAuth (usado por validate)
// es real y verifica el JWT con JWT_SECRET.
jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1' };
  next();
});

jest.mock('../../src/models/User', () => ({ findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../../src/models/Clinic', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/VetAttestation', () => ({ findOneAndUpdate: jest.fn(), find: jest.fn() }));
jest.mock('../../src/models/DailyCheckin', () => ({ find: jest.fn() }));
jest.mock('../../src/services/AuditService', () => ({ record: jest.fn() }));
jest.mock('../../src/services/DogAccess', () => ({ loadForRequest: jest.fn() }));

const User = require('../../src/models/User');
const Clinic = require('../../src/models/Clinic');
const VetAttestation = require('../../src/models/VetAttestation');
const DailyCheckin = require('../../src/models/DailyCheckin');
const AuditService = require('../../src/services/AuditService');
const DogAccess = require('../../src/services/DogAccess');
const app = require('../../src/app');

function buildUserWithDog() {
  const item = {
    _id: 'vac-1', vaccineName: 'Rabia', nextDueDate: new Date('2027-01-01'),
    status: 'pending_vet_validation', requiresVetValidation: true, vetValidatedAt: null,
  };
  const dog = {
    _id: 'dog-1', name: 'Luna', vetShareToken: 'tok-1',
    vaccinations: { id: (i) => (i === 'vac-1' ? item : null) },
    dewormingHistory: { id: () => null },
  };
  const user = { _id: 'user-1', name: 'Ana', dogs: [dog], save: jest.fn().mockResolvedValue(true) };
  return { user, dog, item };
}

describe('Contract: vet attestation + Health Score seal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    VetAttestation.findOneAndUpdate.mockResolvedValue({});
  });

  describe('POST /api/vet/:token/validate', () => {
    it('anónimo (solo token) → atesta verified, setea vetValidatedAt y audita', async () => {
      const { user, item } = buildUserWithDog();
      User.findOne.mockResolvedValue(user);

      const res = await request(app).post('/api/vet/tok-1/validate').send({ kind: 'vaccination', id: 'vac-1' });

      expect(res.status).toBe(200);
      expect(res.body.vetValidatedAt).toBeTruthy();
      expect(res.body.attestation.source).toBe('token');
      expect(res.body.attestation.clinicName).toBeNull();
      expect(item.vetValidatedAt).toBeTruthy();
      expect(VetAttestation.findOneAndUpdate).toHaveBeenCalled();
      expect(AuditService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'attestation_signed' }),
      );
    });

    it('vet logueado → atesta certified con su clínica', async () => {
      const { user } = buildUserWithDog();
      User.findOne.mockResolvedValue(user);
      Clinic.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'clinic-1', name: 'Clínica Palermo' }) });

      const vetToken = jwt.sign({ sub: 'vet-9', role: 'vet' }, process.env.JWT_SECRET);
      const res = await request(app)
        .post('/api/vet/tok-1/validate')
        .set('Authorization', `Bearer ${vetToken}`)
        .send({ kind: 'vaccination', id: 'vac-1' });

      expect(res.status).toBe(200);
      expect(res.body.attestation.source).toBe('vet_account');
      expect(res.body.attestation.clinicName).toBe('Clínica Palermo');
    });
  });

  describe('GET /api/dogs/:dogId/health-score', () => {
    it('incluye el sello de verificación derivado de las atestaciones', async () => {
      DogAccess.loadForRequest.mockResolvedValue({
        owner: { _id: 'user-1', notificationPreferences: {} },
        dog: { _id: 'dog-1', name: 'Luna' },
      });
      DailyCheckin.find.mockReturnValue({ select: () => ({ lean: () => Promise.resolve([]) }) });
      VetAttestation.find.mockReturnValue({
        lean: () => Promise.resolve([
          { status: 'active', kind: 'vaccination', itemId: 'v1', clinicId: 'c1', clinicName: 'Clínica Palermo', source: 'vet_account', attestedAt: new Date(), expiresAt: new Date('2027-01-01') },
        ]),
      });

      const res = await request(app).get('/api/dogs/dog-1/health-score');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('score');
      expect(res.body.verification.level).toBe('certified');
      expect(res.body.verification.certifiedBy).toBe('Clínica Palermo');
    });
  });
});
