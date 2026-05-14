'use strict';

const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1' };
  next();
});

jest.mock('../../src/models/User', () => ({
  findById: jest.fn(),
}));

const User = require('../../src/models/User');
const app = require('../../src/app');

describe('Integration: precedence scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Scenario A: temporary override only', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: null, dogs: [] });
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=14');
    expect(res.body.windowSource).toBe('temporary-override');
    expect(res.body.windowDays).toBe(14);
  });

  it('Scenario B: saved preference only', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: 30, dogs: [] });
    const res = await request(app).get('/api/dashboard/reminders/full');
    expect(res.body.windowSource).toBe('user-preference');
    expect(res.body.windowDays).toBe(30);
  });

  it('Scenario C: both override and preference -> override wins', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: 30, dogs: [] });
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=14');
    expect(res.body.windowSource).toBe('temporary-override');
    expect(res.body.windowDays).toBe(14);
  });

  it('Scenario D: neither -> default', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: null, dogs: [] });
    const res = await request(app).get('/api/dashboard/reminders/full');
    expect(res.body.windowSource).toBe('default');
    expect(res.body.windowDays).toBe(7);
  });
});
