'use strict';

const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1' };
  next();
});

jest.mock('../../src/models/User', () => ({ findById: jest.fn(), findOne: jest.fn() }));
// Colaboradores del flujo de atestación (sello de verificación). Sin DB en contract.
jest.mock('../../src/models/Clinic', () => ({ findOne: jest.fn() }));
jest.mock('../../src/models/VetAttestation', () => ({ findOneAndUpdate: jest.fn().mockResolvedValue({}), find: jest.fn() }));
jest.mock('../../src/services/AuditService', () => ({ record: jest.fn() }));

const User = require('../../src/models/User');
const app = require('../../src/app');

function buildOwnDog() {
  return { _id: 'dog-1', name: 'Luna', vetShareToken: null, vetShareCreatedAt: null };
}

function buildUserWithOwnDog(dog) {
  return {
    _id: 'user-1',
    name: 'Ana Pérez',
    dogs: { id: (id) => (id === 'dog-1' ? dog : null) },
    save: jest.fn().mockResolvedValue(true),
  };
}

describe('Contract: vet share', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST genera un token y devuelve la url', async () => {
    const dog = buildOwnDog();
    User.findById.mockResolvedValue(buildUserWithOwnDog(dog));

    const res = await request(app).post('/api/dogs/dog-1/vet-share');
    expect(res.status).toBe(201);
    expect(res.body.active).toBe(true);
    expect(res.body.token).toBeTruthy();
    expect(res.body.url).toContain('/vet/');
    expect(dog.vetShareToken).toBeTruthy();
  });

  it('DELETE revoca el link', async () => {
    const dog = { ...buildOwnDog(), vetShareToken: 'abc' };
    User.findById.mockResolvedValue(buildUserWithOwnDog(dog));

    const res = await request(app).delete('/api/dogs/dog-1/vet-share');
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
    expect(dog.vetShareToken).toBeNull();
  });

  it('GET público devuelve el expediente read-only por token', async () => {
    const dog = {
      _id: 'dog-1', name: 'Luna', breed: 'Beagle', vetShareToken: 'tok-123',
      vaccinations: [], dewormingHistory: [], medications: [], appointments: [], symptoms: [], consultations: [],
    };
    User.findOne.mockResolvedValue({ name: 'Ana Pérez', dogs: [dog] });

    const res = await request(app).get('/api/vet/tok-123');
    expect(res.status).toBe(200);
    expect(res.body.dog.name).toBe('Luna');
    expect(res.body.tutor.name).toBe('Ana'); // solo el nombre de pila
    expect(Array.isArray(res.body.vaccinations)).toBe(true);
  });

  it('GET público 404 si el token no existe', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).get('/api/vet/nope');
    expect(res.status).toBe(404);
  });

  it('POST validate marca la vacuna como validada', async () => {
    const vac = { _id: 'vac-1', status: 'pending_vet_validation', requiresVetValidation: true, vetValidatedAt: null };
    const dog = {
      _id: 'dog-1', name: 'Luna', vetShareToken: 'tok-123',
      vaccinations: { id: (id) => (id === 'vac-1' ? vac : null) },
      dewormingHistory: { id: () => null },
    };
    User.findOne.mockResolvedValue({ name: 'Ana', dogs: [dog], save: jest.fn().mockResolvedValue(true) });

    const res = await request(app).post('/api/vet/tok-123/validate').send({ kind: 'vaccination', id: 'vac-1' });
    expect(res.status).toBe(200);
    expect(vac.requiresVetValidation).toBe(false);
    expect(vac.status).toBe('completed');
    expect(vac.vetValidatedAt).toBeTruthy();
  });

  it('POST validate 400 sin kind/id', async () => {
    const res = await request(app).post('/api/vet/tok-123/validate').send({});
    expect(res.status).toBe(400);
  });
});
