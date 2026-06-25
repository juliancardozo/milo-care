'use strict';

const request = require('supertest');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// Login no usa la DB cuando las credenciales son inválidas (user null → 401),
// así el limiter se ejercita sin tocar Mongo.
jest.mock('../../src/models/User', () => ({ findOne: jest.fn() }));

const User = require('../../src/models/User');
const app = require('../../src/app');

describe('Contract: rate limit de auth', () => {
  it('POST /api/auth/login bloquea (429) tras superar el límite de intentos', async () => {
    User.findOne.mockResolvedValue(null); // credenciales inválidas → 401
    const email = `brute-${Date.now()}@test.com`;

    let last;
    for (let i = 0; i < 11; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      last = await request(app).post('/api/auth/login').send({ email, password: 'wrong' });
    }
    expect(last.status).toBe(429);
    expect(last.body.code).toBe('RATE_LIMIT_EXCEEDED');
  });
});
