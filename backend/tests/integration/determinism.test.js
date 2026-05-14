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

describe('Integration: deterministic ordering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const sameDue = new Date('2026-05-20T10:00:00Z');

    User.findById.mockResolvedValue({
      _id: 'user-1',
      reminderWindowPreference: 21,
      dogs: [
        {
          _id: 'dog-1',
          name: 'Luna',
          vaccinations: [{ _id: 'b-vax', vaccineName: 'V2', nextDueDate: sameDue }],
          medications: [{ _id: 'a-med', medicationName: 'M1', nextReminderAt: sameDue, status: 'active' }],
          appointments: [{ _id: 'c-appt', clinicName: 'A1', appointmentDate: sameDue, status: 'upcoming' }],
        },
      ],
    });
  });

  it('returns identical ordering across repeated calls', async () => {
    const results = [];

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).get('/api/dashboard/reminders/full');
      expect(res.status).toBe(200);
      results.push(res.body.reminders.map((item) => item.id));
    }

    const first = JSON.stringify(results[0]);
    for (let i = 1; i < results.length; i += 1) {
      expect(JSON.stringify(results[i])).toBe(first);
    }
  });
});
