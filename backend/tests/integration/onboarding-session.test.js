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

jest.mock('../../src/services/OnboardingService', () => ({
  startSession: jest.fn(),
  saveStep: jest.fn(),
  getDraft: jest.fn(),
  getSummary: jest.fn(),
  confirmSession: jest.fn(),
}));

const User = require('../../src/models/User');
const OnboardingSession = require('../../src/models/OnboardingSession');
const service = require('../../src/services/OnboardingService');
const app = require('../../src/app');

describe('Integration: onboarding session flow', () => {
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

    service.startSession.mockResolvedValue({
      _id: 'sess-1',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    service.saveStep.mockResolvedValue({
      status: 'draft',
      updatedAt: new Date(),
      redFlags: [],
    });

    service.getDraft.mockResolvedValue({
      sessionId: 'sess-1',
      owner: { name: 'Owner' },
      dog: { name: 'Milo' },
      clinical: {},
      lifestyle: {},
      vaccines: [],
      deworming: [],
    });

    service.getSummary.mockResolvedValue({
      sessionId: 'sess-1',
      calendar: { vaccines: [], deworming: [], appointments: [], missingData: [] },
      redFlags: [],
    });

    service.confirmSession.mockResolvedValue({
      dog: { _id: 'dog-1', name: 'Milo', onboardingCompletedAt: new Date() },
      calendar: { vaccines: [], deworming: [], appointments: [], missingData: [], riskProfile: { level: 'low' } },
      summary: { remindersScheduled: 0 },
    });
  });

  it('supports start -> step save -> draft -> summary -> confirm flow', async () => {
    const startRes = await request(app).post('/api/onboarding/start').send({ owner: { country: 'AR' } });
    expect(startRes.status).toBe(201);

    const saveRes = await request(app)
      .post('/api/onboarding/sess-1/owner')
      .send({
        name: 'Owner',
        email: 'owner@example.com',
        country: 'AR',
        disclaimerAccepted: true,
      });
    expect(saveRes.status).toBe(200);

    const draftRes = await request(app).get('/api/onboarding/sess-1/draft');
    expect(draftRes.status).toBe(200);

    const summaryRes = await request(app).get('/api/onboarding/sess-1/summary');
    expect(summaryRes.status).toBe(200);

    const confirmRes = await request(app)
      .post('/api/onboarding/sess-1/confirm')
      .send({ disclaimerConfirmed: true, allowPendingVetValidation: true });
    expect(confirmRes.status).toBe(201);
    expect(confirmRes.body.success).toBe(true);
  });

  it('blocks confirmation when disclaimer is not confirmed', async () => {
    const res = await request(app).post('/api/onboarding/sess-1/confirm').send({ disclaimerConfirmed: false });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });
});
