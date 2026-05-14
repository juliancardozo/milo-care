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

function buildUser() {
  return {
    _id: 'user-1',
    reminderWindowPreference: 21,
    dogs: [
      {
        _id: 'dog-1',
        name: 'Luna',
        vaccinations: [
          { _id: 'vax-1', vaccineName: 'Rabies', nextDueDate: new Date(Date.now() + 2 * 24 * 3600 * 1000) },
        ],
        medications: [
          { _id: 'med-1', medicationName: 'Omega', nextReminderAt: new Date(Date.now() + 24 * 3600 * 1000), status: 'active' },
        ],
        appointments: [
          { _id: 'appt-1', clinicName: 'Vet Center', appointmentDate: new Date(Date.now() + 3 * 24 * 3600 * 1000), status: 'upcoming' },
        ],
      },
    ],
  };
}

describe('Contract: GET /api/dashboard/reminders/full', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockResolvedValue(buildUser());
  });

  it('returns response with required schema fields', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reminders');
    expect(res.body).toHaveProperty('total');
    expect(res.body).toHaveProperty('windowDays');
    expect(res.body).toHaveProperty('windowSource');
    expect(res.body).toHaveProperty('appliedAt');
    expect(Array.isArray(res.body.reminders)).toBe(true);
  });

  it('returns reminder items with eligible reminder fields', async () => {
    const res = await request(app).get('/api/dashboard/reminders/full');
    expect(res.status).toBe(200);

    const item = res.body.reminders[0];
    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('sourceType');
    expect(item).toHaveProperty('sourceId');
    expect(item).toHaveProperty('petId');
    expect(item).toHaveProperty('petName');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('dueAt');
    expect(item).toHaveProperty('status');
  });

  it('returns empty array when no reminders match', async () => {
    User.findById.mockResolvedValue({ _id: 'user-1', reminderWindowPreference: null, dogs: [] });

    const res = await request(app).get('/api/dashboard/reminders/full');
    expect(res.status).toBe(200);
    expect(res.body.reminders).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
