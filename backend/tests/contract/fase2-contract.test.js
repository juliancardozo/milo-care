'use strict';

// Test hermético de la Fase 2: registro rápido de síntomas + alerta acumulativa
// + CRUD de behaviors. Sin DB ni red reales.

process.env.JWT_SECRET = 'test-secret';

function mockMakeQuery(data) {
  const q = {};
  q.sort = () => q;
  q.lean = () => Promise.resolve(data);
  return q;
}

jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../../src/models/BehaviorLog', () => {
  const m = {
    create: jest.fn(),
    find: jest.fn(() => mockMakeQuery([])),
    findOne: jest.fn(),
    findOneAndDelete: jest.fn(),
  };
  m.KINDS = ['logro', 'travesura', 'momento'];
  return m;
});
jest.mock('../../src/services/EmailService', () => ({ sendSymptomAlert: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const BehaviorLog = require('../../src/models/BehaviorLog');
const EmailService = require('../../src/services/EmailService');
const app = require('../../src/app');

const USER_ID = '665000000000000000000001';
const DOG_ID = '665000000000000000000002';

function authToken() {
  return jwt.sign({ sub: USER_ID, email: 'u@test.com', tier: 'free' }, process.env.JWT_SECRET);
}

function mockUser({ seedSymptoms = [] } = {}) {
  const dog = {
    _id: DOG_ID,
    name: 'Milo',
    breed: 'Mestizo',
    dateOfBirth: '2021-01-01', // adulto
    symptoms: [...seedSymptoms],
  };
  return {
    _id: USER_ID,
    name: 'Juan',
    email: 'u@test.com',
    notificationPreferences: { enabled: true },
    dogs: { id: (x) => (String(x) === DOG_ID ? dog : null) },
    save: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  BehaviorLog.find.mockImplementation(() => mockMakeQuery([]));
});

describe('POST /api/dogs/:dogId/symptoms/quick', () => {
  test('registra un síntoma rápido (201) con payload mínimo', async () => {
    User.findById.mockResolvedValue(mockUser());

    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/symptoms/quick`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ quickType: 'vomito' });

    expect(res.status).toBe(201);
    expect(res.body.symptom.isQuickLog).toBe(true);
    expect(res.body.symptom.quickType).toBe('vomito');
    expect(res.body.alert.triggered).toBe(false);
    expect(EmailService.sendSymptomAlert).not.toHaveBeenCalled();
  });

  test('2 vómitos en 24h → alerta + email', async () => {
    const priorVomit = { quickType: 'vomito', dateObserved: new Date(Date.now() - 3 * 3600 * 1000) };
    User.findById.mockResolvedValue(mockUser({ seedSymptoms: [priorVomit] }));

    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/symptoms/quick`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ quickType: 'vomito' });

    expect(res.status).toBe(201);
    expect(res.body.alert.triggered).toBe(true);
    expect(res.body.alert.count).toBe(2);
    expect(EmailService.sendSymptomAlert).toHaveBeenCalledTimes(1);
  });

  test('quickType inválido → 400', async () => {
    User.findById.mockResolvedValue(mockUser());
    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/symptoms/quick`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ quickType: 'invento' });
    expect(res.status).toBe(400);
  });
});

describe('CRUD /api/dogs/:dogId/behaviors', () => {
  beforeEach(() => {
    User.findById.mockResolvedValue(mockUser());
  });

  test('POST crea un registro de álbum (201)', async () => {
    BehaviorLog.create.mockResolvedValue({ _id: 'b1', kind: 'logro', title: 'Aprendió a sentarse' });

    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/behaviors`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ kind: 'logro', title: 'Aprendió a sentarse' });

    expect(res.status).toBe(201);
    expect(BehaviorLog.create).toHaveBeenCalledTimes(1);
  });

  test('POST sin kind válido → 400', async () => {
    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/behaviors`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ title: 'algo' });
    expect(res.status).toBe(400);
  });

  test('POST sin title → 400', async () => {
    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/behaviors`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ kind: 'travesura' });
    expect(res.status).toBe(400);
  });

  test('GET devuelve el feed', async () => {
    BehaviorLog.find.mockImplementation(() => mockMakeQuery([{ _id: 'b1', kind: 'momento', title: 'Primer paseo' }]));

    const res = await request(app)
      .get(`/api/dogs/${DOG_ID}/behaviors`)
      .set('Authorization', `Bearer ${authToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.behaviors).toHaveLength(1);
  });
});
