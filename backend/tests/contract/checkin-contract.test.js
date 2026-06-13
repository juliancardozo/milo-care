'use strict';

// Test hermético del flujo de check-in (sin DB ni red reales).
// Mockea User, DailyCheckin y analyticsService; ejercita las rutas reales.

process.env.JWT_SECRET = 'test-secret';

// Prefijo `mock` + function declaration: permitido por babel-plugin-jest-hoist.
function mockMakeQuery(data) {
  const q = {};
  q.sort = () => q;
  q.select = () => q;
  q.lean = () => Promise.resolve(data);
  return q;
}

jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../../src/models/DailyCheckin', () => {
  const m = { create: jest.fn(), find: jest.fn(() => mockMakeQuery([])) };
  m.QUESTIONS = ['comida', 'energia', 'agua', 'animo', 'digestion'];
  m.ANSWERS = ['bien', 'regular', 'mal'];
  return m;
});
jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));
// La activación de referidos es fire-and-forget en el check-in; la mockeamos para
// no tocar el modelo Referral (sin DB) en este contrato.
jest.mock('../../src/services/referralService', () => ({ activateForReferredUser: jest.fn().mockResolvedValue({ activated: false }) }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const DailyCheckin = require('../../src/models/DailyCheckin');
const { generateResponseToken } = require('../../src/services/checkinTokenService');
const app = require('../../src/app');

const USER_ID = '665000000000000000000001';
const DOG_ID = '665000000000000000000002';

function authToken() {
  return jwt.sign({ sub: USER_ID, email: 'u@test.com', tier: 'free' }, process.env.JWT_SECRET);
}

function mockUser() {
  const dog = { _id: DOG_ID, name: 'Milo', breed: 'Mestizo', lifestyle: {} };
  return {
    _id: USER_ID,
    name: 'Juan',
    email: 'u@test.com',
    notificationPreferences: { timezone: 'America/Argentina/Buenos_Aires' },
    dogs: { id: (x) => (String(x) === DOG_ID ? dog : null) },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockResolvedValue(mockUser());
  DailyCheckin.find.mockImplementation(() => mockMakeQuery([]));
});

describe('POST /api/dogs/:dogId/checkins', () => {
  test('registra el check-in del día (201)', async () => {
    DailyCheckin.create.mockResolvedValue({ _id: 'c1', answer: 'bien', question: 'comida' });

    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/checkins`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ answer: 'bien' });

    expect(res.status).toBe(201);
    expect(DailyCheckin.create).toHaveBeenCalledTimes(1);
  });

  test('rechaza un segundo check-in el mismo día (409)', async () => {
    DailyCheckin.create.mockRejectedValue({ code: 11000 });

    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/checkins`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ answer: 'bien' });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('CHECKIN_ALREADY_EXISTS');
  });

  test('rechaza answer inválido (400)', async () => {
    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/checkins`)
      .set('Authorization', `Bearer ${authToken()}`)
      .send({ answer: 'excelente' });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/checkins/respond', () => {
  function validToken(answer = 'bien') {
    return generateResponseToken({ userId: USER_ID, dogId: DOG_ID, localDate: '2026-06-12', question: 'energia', answer });
  }

  test('token válido registra el check-in y muestra confirmación cálida', async () => {
    DailyCheckin.create.mockResolvedValue({ _id: 'c1' });

    const res = await request(app).get('/api/checkins/respond').query({ token: validToken('bien') });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Gracias por cuidar a Milo');
    expect(DailyCheckin.create).toHaveBeenCalledTimes(1);
  });

  test('token reusado (día ya respondido) muestra "ya respondiste" sin error', async () => {
    DailyCheckin.create.mockRejectedValue({ code: 11000 });

    const res = await request(app).get('/api/checkins/respond').query({ token: validToken('bien') });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Ya tenías el check-in de hoy');
  });

  test('token expirado muestra enlace vencido (400)', async () => {
    const expired = jwt.sign(
      { t: 'checkin_response', uid: USER_ID, did: DOG_ID, date: '2026-06-12', q: 'energia', a: 'bien', f: null },
      process.env.JWT_SECRET,
      { expiresIn: '-10s' }
    );

    const res = await request(app).get('/api/checkins/respond').query({ token: expired });

    expect(res.status).toBe(400);
    expect(res.text).toContain('Enlace vencido');
    expect(DailyCheckin.create).not.toHaveBeenCalled();
  });

  test('token con tipo equivocado se rechaza', async () => {
    const wrong = jwt.sign({ t: 'other', uid: USER_ID }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const res = await request(app).get('/api/checkins/respond').query({ token: wrong });
    expect(res.status).toBe(400);
    expect(res.text).toContain('Enlace vencido');
  });
});
