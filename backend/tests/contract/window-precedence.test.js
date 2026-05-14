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

describe('Contract: window precedence metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: 21, dogs: [] });
  });

  it('uses temporary override when provided', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=14');
    expect(res.status).toBe(200);
    expect(res.body.windowDays).toBe(14);
    expect(res.body.windowSource).toBe('temporary-override');
  });

  it('uses user preference when override is absent', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full');
    expect(res.status).toBe(200);
    expect(res.body.windowDays).toBe(21);
    expect(res.body.windowSource).toBe('user-preference');
  });

  it('uses default when neither override nor preference exists', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: null, dogs: [] });

    const res = await request(app).get('/api/dashboard/reminders/full');
    expect(res.status).toBe(200);
    expect(res.body.windowDays).toBe(7);
    expect(res.body.windowSource).toBe('default');
  });

  it('returns fallback metadata when override is invalid', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=200');
    expect(res.status).toBe(200);
    expect(res.body.windowDays).toBe(7);
    expect(res.body.windowSource).toBe('default');
    expect(res.body.appliedFallback).toBeDefined();
  });
});
