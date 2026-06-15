'use strict';

jest.mock('../../src/services/pushService', () => ({
  sendToUser: jest.fn(),
}));
jest.mock('../../src/models/User', () => ({
  find: jest.fn(),
}));

const pushService = require('../../src/services/pushService');
const User = require('../../src/models/User');
const Notifier = require('../../src/services/NotificationDispatcher');

function user(channel, enabled = true) {
  return { _id: 'u1', email: 'u1@example.com', name: 'Ana', notificationPreferences: { channel, enabled } };
}

describe('NotificationDispatcher.channelsFor', () => {
  it('mapea cada canal', () => {
    expect(Notifier.channelsFor(user('email'))).toMatchObject({ push: false, email: true });
    expect(Notifier.channelsFor(user('push'))).toMatchObject({ push: true, email: false, pushOnly: true });
    expect(Notifier.channelsFor(user('both'))).toMatchObject({ push: true, email: true });
  });
  it('enabled=false desactiva todo', () => {
    expect(Notifier.channelsFor(user('both', false))).toMatchObject({ push: false, email: false });
  });
  it('default email si no hay prefs', () => {
    expect(Notifier.channelsFor({})).toMatchObject({ push: false, email: true });
  });
});

describe('NotificationDispatcher.dispatchToUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('email: solo manda email', async () => {
    const email = jest.fn().mockResolvedValue();
    const res = await Notifier.dispatchToUser(user('email'), { push: { title: 'x' }, email });
    expect(pushService.sendToUser).not.toHaveBeenCalled();
    expect(email).toHaveBeenCalled();
    expect(res).toEqual({ push: 0, email: true });
  });

  it('push con suscripción: solo push, sin email', async () => {
    pushService.sendToUser.mockResolvedValue(1);
    const email = jest.fn().mockResolvedValue();
    const res = await Notifier.dispatchToUser(user('push'), { push: { title: 'x' }, email });
    expect(pushService.sendToUser).toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
    expect(res).toEqual({ push: 1, email: false });
  });

  it('push sin suscripción: cae a email (fallback)', async () => {
    pushService.sendToUser.mockResolvedValue(0);
    const email = jest.fn().mockResolvedValue();
    const res = await Notifier.dispatchToUser(user('push'), { push: { title: 'x' }, email });
    expect(email).toHaveBeenCalled();
    expect(res).toEqual({ push: 0, email: true });
  });

  it('both: manda push y email', async () => {
    pushService.sendToUser.mockResolvedValue(2);
    const email = jest.fn().mockResolvedValue();
    const res = await Notifier.dispatchToUser(user('both'), { push: { title: 'x' }, email });
    expect(pushService.sendToUser).toHaveBeenCalled();
    expect(email).toHaveBeenCalled();
    expect(res).toEqual({ push: 2, email: true });
  });

  it('enabled=false: no manda nada', async () => {
    const email = jest.fn();
    const res = await Notifier.dispatchToUser(user('both', false), { push: { title: 'x' }, email });
    expect(pushService.sendToUser).not.toHaveBeenCalled();
    expect(email).not.toHaveBeenCalled();
    expect(res).toEqual({ push: 0, email: false });
  });
});

describe('NotificationDispatcher.dispatchToDog', () => {
  beforeEach(() => jest.clearAllMocks());

  it('notifica al dueño y a cada co-tutor', async () => {
    pushService.sendToUser.mockResolvedValue(0);
    const owner = user('email');
    const dog = { _id: 'd1', name: 'Milo', caregivers: [{ userId: 'c1' }, { userId: 'c2' }] };
    User.find.mockResolvedValue([
      { _id: 'c1', email: 'c1@example.com', name: 'Maca', notificationPreferences: { channel: 'email' } },
      { _id: 'c2', email: 'c2@example.com', name: 'Leo', notificationPreferences: { channel: 'email' } },
    ]);

    const emails = [];
    await Notifier.dispatchToDog(owner, dog, (r) => ({
      push: { title: 'x' },
      email: () => { emails.push(r.email); return Promise.resolve(); },
    }));

    expect(User.find).toHaveBeenCalledWith({ _id: { $in: ['c1', 'c2'] } });
    expect(emails).toEqual(['u1@example.com', 'c1@example.com', 'c2@example.com']);
  });
});
