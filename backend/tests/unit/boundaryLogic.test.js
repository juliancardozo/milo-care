'use strict';

const { buildEligibleReminderSet } = require('../../src/services/reminderFullList');

describe('Unit: inclusive boundary and overdue behavior', () => {
  const now = new Date('2026-05-14T10:00:00.000Z');

  it('includes reminder exactly at boundary timestamp', () => {
    const exactBoundary = new Date('2026-05-21T10:00:00.000Z');

    const user = {
      dogs: [{
        _id: 'dog-1',
        name: 'Luna',
        vaccinations: [{ _id: 'vax-1', vaccineName: 'Rabies', nextDueDate: exactBoundary }],
        medications: [],
        appointments: [],
      }],
    };

    const reminders = buildEligibleReminderSet({ user, windowDays: 7, now, includeOverdue: true });
    expect(reminders).toHaveLength(1);
  });

  it('includes overdue undismissed reminders', () => {
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

  it('excludes reminders dismissed by the user (by dedupeKey)', () => {
    const overdue = new Date('2026-05-10T10:00:00.000Z');

    const user = {
      dismissedReminderKeys: ['dog-1:medication:med-1:2026-05-10'],
      dogs: [{
        _id: 'dog-1',
        name: 'Luna',
        vaccinations: [],
        medications: [{ _id: 'med-1', medicationName: 'Omega', nextReminderAt: overdue, status: 'active' }],
        appointments: [],
      }],
    };

    const reminders = buildEligibleReminderSet({ user, windowDays: 1, now, includeOverdue: true });
    expect(reminders).toHaveLength(0);
  });
});
