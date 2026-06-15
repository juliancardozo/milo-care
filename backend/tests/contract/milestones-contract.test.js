'use strict';

process.env.JWT_SECRET = 'test-secret';

function mockMakeQuery(data) {
  const q = {};
  q.select = () => q;
  q.sort = () => q;
  q.lean = () => Promise.resolve(data);
  return q;
}

jest.mock('../../src/models/User', () => ({ findById: jest.fn(), findOne: jest.fn().mockResolvedValue(null) }));
jest.mock('../../src/models/Milestone', () => ({ updateOne: jest.fn(), find: jest.fn(), findOneAndUpdate: jest.fn() }));
jest.mock('../../src/models/DailyCheckin', () => ({ find: jest.fn(() => mockMakeQuery([])) }));
jest.mock('../../src/models/BehaviorLog', () => ({ countDocuments: jest.fn().mockResolvedValue(0) }));
jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const Milestone = require('../../src/models/Milestone');
const DailyCheckin = require('../../src/models/DailyCheckin');
const analytics = require('../../src/services/analyticsService');
const app = require('../../src/app');

const USER_ID = '665000000000000000000001';
const DOG_ID = '665000000000000000000002';
const token = jwt.sign({ sub: USER_ID, email: 'u@test.com', tier: 'free' }, process.env.JWT_SECRET);

function mockUser() {
  const dog = {
    _id: DOG_ID,
    name: 'Milo',
    photoUrl: null,
    createdAt: new Date(Date.now() - 200 * 86400000), // 200 días de antigüedad
    vaccinations: [],
    dateOfBirth: new Date('2022-03-01'),
  };
  return {
    _id: USER_ID,
    referralCode: 'MILO-ABCD',
    notificationPreferences: {},
    dogs: { id: (x) => (String(x) === DOG_ID ? dog : null) },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  DailyCheckin.find.mockImplementation(() => mockMakeQuery([]));
  User.findById.mockResolvedValue(mockUser());
});

describe('GET /api/dogs/:dogId/milestones', () => {
  test('detecta/persiste hitos y separa pendientes de historial', async () => {
    Milestone.updateOne.mockResolvedValue({});
    Milestone.find.mockImplementation(() => mockMakeQuery([
      { _id: 'm1', key: 'first_month', type: 'first_month', shownAt: null },
      { _id: 'm2', key: 'vaccines_100_days', type: 'vaccines_up_to_date', shownAt: new Date() },
    ]));

    const res = await request(app)
      .get(`/api/dogs/${DOG_ID}/milestones`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.referralCode).toBe('MILO-ABCD');
    expect(res.body.pending.map((m) => m.key)).toContain('first_month');
    expect(res.body.history.map((m) => m.key)).toContain('vaccines_100_days');
    // Se intentó persistir al menos un candidato (upsert idempotente).
    expect(Milestone.updateOne).toHaveBeenCalled();
  });
});

describe('POST /:key/seen', () => {
  test('marca como mostrado y emite milestone_shown', async () => {
    Milestone.findOneAndUpdate.mockResolvedValue({ _id: 'm1', key: 'first_month' });

    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/milestones/first_month/seen`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(analytics.track).toHaveBeenCalledWith('milestone_shown', expect.any(Object));
  });
});

describe('POST /:key/share', () => {
  test('descarga emite card_downloaded', async () => {
    Milestone.updateOne.mockResolvedValue({});
    const res = await request(app)
      .post(`/api/dogs/${DOG_ID}/milestones/first_month/share`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'downloaded' });

    expect(res.status).toBe(200);
    expect(analytics.track).toHaveBeenCalledWith('card_downloaded', expect.any(Object));
  });
});
