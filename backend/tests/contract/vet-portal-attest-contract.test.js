'use strict';

const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Vet autenticado (requireVet real exige role 'vet').
jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'vet-1', role: 'vet' };
  next();
});

jest.mock('../../src/models/User', () => ({ findOne: jest.fn(), find: jest.fn(), create: jest.fn() }));
jest.mock('../../src/models/Clinic', () => ({ findOne: jest.fn() }));
jest.mock('../../src/services/AttestationService', () => ({
  attestItem: jest.fn(),
  certifierForVet: jest.fn(),
  ANONYMOUS: {},
}));
jest.mock('../../src/services/clinicService', () => ({ listAttestablePatients: jest.fn() }));

const User = require('../../src/models/User');
const Clinic = require('../../src/models/Clinic');
const AttestationService = require('../../src/services/AttestationService');
const clinicService = require('../../src/services/clinicService');
const app = require('../../src/app');

const CLINIC = { _id: 'clinic-1', name: 'Clínica Palermo', ownerVetUserId: 'vet-1' };

describe('Contract: vet-portal attestation (panel autenticado)', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/vet-portal/patients', () => {
    it('lista los pacientes atestables de la clínica del vet', async () => {
      Clinic.findOne.mockResolvedValue(CLINIC);
      clinicService.listAttestablePatients.mockResolvedValue([
        { dogId: 'dog-1', dogName: 'Luna', ownerFirstName: 'Ana', vaccinations: [{ kind: 'vaccination', itemId: 'v1', name: 'Rabia' }], deworming: [] },
      ]);

      const res = await request(app).get('/api/vet-portal/patients');
      expect(res.status).toBe(200);
      expect(res.body.patients).toHaveLength(1);
      expect(res.body.patients[0].dogName).toBe('Luna');
    });

    it('404 NO_CLINIC si el vet no tiene clínica', async () => {
      Clinic.findOne.mockResolvedValue(null);
      const res = await request(app).get('/api/vet-portal/patients');
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NO_CLINIC');
    });
  });

  describe('POST /api/vet-portal/dogs/:dogId/attest', () => {
    it('certifica un ítem de un paciente de su cohorte', async () => {
      Clinic.findOne.mockResolvedValue(CLINIC);
      const dog = { _id: 'dog-1', name: 'Luna' };
      User.findOne.mockResolvedValue({ _id: 'owner-1', dogs: { id: (i) => (i === 'dog-1' ? dog : null) } });
      AttestationService.attestItem.mockResolvedValue({
        item: { _id: 'v1', vetValidatedAt: new Date(), status: 'completed' },
        expiresAt: new Date('2027-01-01'),
      });

      const res = await request(app).post('/api/vet-portal/dogs/dog-1/attest').send({ kind: 'vaccination', itemId: 'v1' });
      expect(res.status).toBe(200);
      expect(res.body.attestation.source).toBe('vet_account');
      expect(res.body.attestation.clinicName).toBe('Clínica Palermo');
      expect(AttestationService.attestItem).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'vaccination', itemId: 'v1', certifier: expect.objectContaining({ clinicId: 'clinic-1' }) }),
      );
    });

    it('403 si el perro NO pertenece a la cohorte de su clínica', async () => {
      Clinic.findOne.mockResolvedValue(CLINIC);
      User.findOne.mockResolvedValue(null); // ningún paciente de esta clínica tiene ese perro

      const res = await request(app).post('/api/vet-portal/dogs/dog-x/attest').send({ kind: 'vaccination', itemId: 'v1' });
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(AttestationService.attestItem).not.toHaveBeenCalled();
    });

    it('400 si falta kind/itemId', async () => {
      const res = await request(app).post('/api/vet-portal/dogs/dog-1/attest').send({});
      expect(res.status).toBe(400);
    });
  });
});
