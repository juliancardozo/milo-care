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

function future(days) {
  return new Date(Date.now() + days * 24 * 3600 * 1000);
}

describe('Integration: full reminders list journey', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    User.findById.mockResolvedValue({
      _id: 'user-1',
      reminderWindowPreference: 30,
      dogs: [
        {
          _id: 'dog-1',
          name: 'Luna',
          vaccinations: [
            { _id: 'vax-1', vaccineName: 'Rabies', nextDueDate: future(1) },
            { _id: 'vax-2', vaccineName: 'Parvo', nextDueDate: future(10) },
          ],
          medications: [
            { _id: 'med-1', medicationName: 'Omega', nextReminderAt: future(2), status: 'active' },
            { _id: 'med-2', medicationName: 'Calm', nextReminderAt: future(13), status: 'active' },
          ],
          appointments: [
            { _id: 'appt-1', clinicName: 'Vet A', appointmentDate: future(3), status: 'upcoming' },
            { _id: 'appt-2', clinicName: 'Vet B', appointmentDate: future(15), status: 'upcoming' },
          ],
        },
        {
          _id: 'dog-2',
          name: 'Milo',
          vaccinations: [
            { _id: 'vax-3', vaccineName: 'Distemper', nextDueDate: future(4) },
          ],
          medications: [
            { _id: 'med-3', medicationName: 'Joint', nextReminderAt: future(5), status: 'active' },
          ],
          appointments: [],
        },
      ],
    });
  });

  it('returns all eligible reminders for user flow with more than five reminders', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full');

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(8);
    expect(res.body.reminders).toHaveLength(8);
  });

  it('filters by temporary window override', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full?windowDays=14');

    expect(res.status).toBe(200);
    expect(res.body.windowDays).toBe(14);
    expect(res.body.windowSource).toBe('temporary-override');
    expect(res.body.total).toBe(7);
  });
});
