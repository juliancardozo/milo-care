'use strict';

jest.mock('../../src/models/User', () => ({ find: jest.fn() }));
jest.mock('../../src/models/DailyCheckin', () => ({ findOne: jest.fn() }));
jest.mock('../../src/services/NotificationDispatcher', () => ({
  dispatchToDog: jest.fn().mockResolvedValue(undefined),
  dispatchToUser: jest.fn().mockResolvedValue(undefined),
  appUrl: () => 'https://app.test',
}));
// Hora local controlada: localHour=9 (coincide con reminderHour default).
jest.mock('../../src/utils/localTime', () => ({
  localHour: jest.fn(() => 9),
  localDateString: jest.fn(() => '2026-06-15'),
}));

const User = require('../../src/models/User');
const DailyCheckin = require('../../src/models/DailyCheckin');
const Notifier = require('../../src/services/NotificationDispatcher');
const { localHour } = require('../../src/utils/localTime');
const { processOverdue, processReengagement } = require('../../src/services/TriggeredCampaignsJob');

const NOW = new Date('2026-06-15T12:00:00Z');
const past = new Date('2026-06-01T00:00:00Z');

function makeUser(overrides = {}) {
  return {
    _id: 'u1', email: 'u1@example.com', name: 'Ana',
    notificationPreferences: { enabled: true, reminderHour: 9, checkinEnabled: true, timezone: 'America/Argentina/Buenos_Aires' },
    dogs: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function checkinChain(value) {
  return { sort: () => ({ select: () => ({ lean: () => Promise.resolve(value) }) }) };
}

describe('TriggeredCampaignsJob.processOverdue', () => {
  beforeEach(() => { jest.clearAllMocks(); localHour.mockReturnValue(9); });

  it('notifica una vacuna vencida y marca overdueNotifiedAt', async () => {
    const vax = { vaccineName: 'Rabia', nextDueDate: past, status: 'completed', overdueNotifiedAt: null };
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo', vaccinations: [vax], dewormingHistory: [] }] });
    User.find.mockResolvedValue([user]);

    await processOverdue(NOW);

    expect(Notifier.dispatchToDog).toHaveBeenCalledTimes(1);
    expect(vax.overdueNotifiedAt).toEqual(NOW);
    expect(user.save).toHaveBeenCalled();
  });

  it('no re-notifica si ya se avisó hace menos de 14 días', async () => {
    const recent = new Date(NOW.getTime() - 3 * 86400000);
    const vax = { vaccineName: 'Rabia', nextDueDate: past, status: 'completed', overdueNotifiedAt: recent };
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo', vaccinations: [vax], dewormingHistory: [] }] });
    User.find.mockResolvedValue([user]);

    await processOverdue(NOW);

    expect(Notifier.dispatchToDog).not.toHaveBeenCalled();
  });

  it('respeta la hora local del usuario (no es su hora → no envía)', async () => {
    localHour.mockReturnValue(15); // reminderHour del usuario es 9
    const vax = { vaccineName: 'Rabia', nextDueDate: past, status: 'completed', overdueNotifiedAt: null };
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo', vaccinations: [vax], dewormingHistory: [] }] });
    User.find.mockResolvedValue([user]);

    await processOverdue(NOW);

    expect(Notifier.dispatchToDog).not.toHaveBeenCalled();
  });

  it('no marca vencido si el último vencimiento es futuro', async () => {
    const future = new Date(NOW.getTime() + 10 * 86400000);
    const vax = { vaccineName: 'Rabia', nextDueDate: future, status: 'completed', overdueNotifiedAt: null };
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo', vaccinations: [vax], dewormingHistory: [] }] });
    User.find.mockResolvedValue([user]);

    await processOverdue(NOW);

    expect(Notifier.dispatchToDog).not.toHaveBeenCalled();
  });
});

describe('TriggeredCampaignsJob.processReengagement', () => {
  beforeEach(() => { jest.clearAllMocks(); localHour.mockReturnValue(9); });

  it('nudge cuando nunca hubo check-in', async () => {
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo' }] });
    User.find.mockResolvedValue([user]);
    DailyCheckin.findOne.mockReturnValue(checkinChain(null));

    await processReengagement(NOW);

    expect(Notifier.dispatchToUser).toHaveBeenCalledTimes(1);
    expect(user.notificationPreferences.lastReengagementOn).toBe('2026-06-15');
    expect(user.save).toHaveBeenCalled();
  });

  it('no nudge si hubo check-in reciente (<7 días)', async () => {
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo' }] });
    User.find.mockResolvedValue([user]);
    DailyCheckin.findOne.mockReturnValue(checkinChain({ createdAt: new Date(NOW.getTime() - 2 * 86400000) }));

    await processReengagement(NOW);

    expect(Notifier.dispatchToUser).not.toHaveBeenCalled();
  });

  it('no nudge si el usuario apagó el check-in', async () => {
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo' }] });
    user.notificationPreferences.checkinEnabled = false;
    User.find.mockResolvedValue([user]);

    await processReengagement(NOW);

    expect(DailyCheckin.findOne).not.toHaveBeenCalled();
    expect(Notifier.dispatchToUser).not.toHaveBeenCalled();
  });

  it('respeta cooldown de 7 días', async () => {
    const user = makeUser({ dogs: [{ _id: 'd1', name: 'Milo' }] });
    user.notificationPreferences.lastReengagementOn = '2026-06-10'; // hace 5 días
    User.find.mockResolvedValue([user]);

    await processReengagement(NOW);

    expect(Notifier.dispatchToUser).not.toHaveBeenCalled();
  });
});
