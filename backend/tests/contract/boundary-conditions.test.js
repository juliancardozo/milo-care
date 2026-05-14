'use strict';

const { buildEligibleReminderSet } = require('../../src/services/reminderFullList');

describe('Contract: boundary conditions for eligible reminder set', () => {
  it('includes reminder due exactly at window boundary', () => {
    const now = new Date('2026-05-14T10:00:00.000Z');
    const boundary = new Date('2026-05-21T10:00:00.000Z');

    const user = {
      dogs: [{
        _id: 'dog-1',
        name: 'Luna',
        vaccinations: [{ _id: 'vax-1', vaccineName: 'Rabies', nextDueDate: boundary }],
        medications: [],
        appointments: [],
      }],
    };

    const reminders = buildEligibleReminderSet({ user, windowDays: 7, now });
    expect(reminders).toHaveLength(1);
  });

  it('excludes reminder after boundary', () => {
    const now = new Date('2026-05-14T10:00:00.000Z');
    const afterBoundary = new Date('2026-05-21T10:00:00.001Z');

    const user = {
      dogs: [{
        _id: 'dog-1',
        name: 'Luna',
        vaccinations: [{ _id: 'vax-1', vaccineName: 'Rabies', nextDueDate: afterBoundary }],
        medications: [],
        appointments: [],
      }],
    };

    const reminders = buildEligibleReminderSet({ user, windowDays: 7, now });
    expect(reminders).toHaveLength(0);
  });

  it('includes overdue reminder regardless of window', () => {
    const now = new Date('2026-05-14T10:00:00.000Z');
    const overdue = new Date('2026-05-10T10:00:00.000Z');

    const user = {
      dogs: [{
        _id: 'dog-1',
        name: 'Luna',
        vaccinations: [],
        medications: [{ _id: 'med-1', medicationName: 'Omega', nextReminderAt: overdue, status: 'active' }],
        appointments: [],
      }],
    };

    const reminders = buildEligibleReminderSet({ user, windowDays: 1, now, includeOverdue: true });
    expect(reminders).toHaveLength(1);
    expect(reminders[0].status).toBe('overdue');
  });
});
