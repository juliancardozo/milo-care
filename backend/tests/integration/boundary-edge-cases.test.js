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

describe('Integration: boundary and overdue edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const now = Date.now();
    User.findById.mockResolvedValue({
      _id: 'user-1',
      reminderWindowPreference: null,
      dogs: [
        {
          _id: 'dog-1',
          name: 'Luna',
          vaccinations: [
            { _id: 'vax-exact', vaccineName: 'Rabies', nextDueDate: new Date(now + 7 * 24 * 3600 * 1000) },
            { _id: 'vax-after', vaccineName: 'Parvo', nextDueDate: new Date(now + 7 * 24 * 3600 * 1000 + 1) },
          ],
          medications: [
            { _id: 'med-overdue', medicationName: 'Omega', nextReminderAt: new Date(now - 24 * 3600 * 1000), status: 'active' },
          ],
          appointments: [],
        },
      ],
    });
  });

  it('applies inclusive boundary and includes overdue', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=7');
    expect(res.status).toBe(200);

    const ids = res.body.reminders.map((r) => r.id);
    expect(ids).toContain('vaccination:vax-exact');
    expect(ids).toContain('medication:med-overdue');
  });

  it('applies default fallback when invalid window is provided', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=100');
    expect(res.status).toBe(200);
    expect(res.body.windowDays).toBe(7);
    expect(res.body.windowSource).toBe('default');
    expect(res.body.appliedFallback).toBeDefined();
  });
});
