'use strict';

const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: '665000000000000000000001' };
  next();
});

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

jest.mock('../../src/models/OnboardingSession', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
}));

const User = require('../../src/models/User');
const OnboardingSession = require('../../src/models/OnboardingSession');
const app = require('../../src/app');

describe('Contract: onboarding endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({
      _id: '665000000000000000000001',
      email: 'owner@example.com',
      name: 'Owner',
      dogs: [],
    });
    OnboardingSession.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });
    OnboardingSession.create.mockResolvedValue({
      _id: 'sess-1',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
  });

  it('returns session metadata when onboarding starts', async () => {
    const res = await request(app).post('/api/onboarding/start').send({
      owner: {
        name: 'Owner',
        email: 'owner@example.com',
        country: 'AR',
      },
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('sessionId');
    expect(res.body).toHaveProperty('stepKey');
    expect(res.body).toHaveProperty('expiresAt');
  });

  it('rejects unsupported countries with validation shape', async () => {
    const res = await request(app).post('/api/onboarding/start').send({
      owner: {
        name: 'Owner',
        email: 'owner@example.com',
        country: 'BR',
      },
    });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.message).toMatch(/Country/);
  });
});
