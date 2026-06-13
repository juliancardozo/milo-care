'use strict';

// Tests del pushService: guarda suscripciones, envía y limpia las expiradas.

process.env.VAPID_PUBLIC_KEY = 'BIGnr-xOleaIaZaLbmay8ozICJgRtLqGTvgVD_CIQ5BUq5bwyg1ctS_HSrl6ZYRiyANSgwutMK_9_MxaOKXZwEA';
process.env.VAPID_PRIVATE_KEY = 'aRoSQKuheqF25vR5Giv3gZXqI2K1jV_lBin0ZqPdufc';

jest.mock('web-push', () => ({ setVapidDetails: jest.fn(), sendNotification: jest.fn() }));
jest.mock('../../src/models/PushSubscription', () => ({
  updateOne: jest.fn().mockResolvedValue({}),
  deleteOne: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({}),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

const webpush = require('web-push');
const PushSubscription = require('../../src/models/PushSubscription');
const pushService = require('../../src/services/pushService');

const SUB = { endpoint: 'https://push.example/abc', keys: { p256dh: 'k', auth: 'a' } };

beforeEach(() => jest.clearAllMocks());

describe('configuración', () => {
  test('está configurado con claves VAPID presentes', () => {
    expect(pushService.isConfigured()).toBe(true);
    expect(pushService.getPublicKey()).toBe(process.env.VAPID_PUBLIC_KEY);
  });
});

describe('saveSubscription', () => {
  test('hace upsert por endpoint', async () => {
    await pushService.saveSubscription('u1', SUB, 'UA');
    expect(PushSubscription.updateOne).toHaveBeenCalledWith(
      { endpoint: SUB.endpoint },
      expect.objectContaining({ $set: expect.objectContaining({ userId: 'u1' }) }),
      { upsert: true }
    );
  });

  test('rechaza suscripción inválida', async () => {
    await expect(pushService.saveSubscription('u1', { endpoint: '' })).rejects.toThrow('Invalid push subscription.');
  });
});

describe('sendToUser', () => {
  test('envía a todas las suscripciones del usuario', async () => {
    PushSubscription.find.mockReturnValue({ lean: () => Promise.resolve([
      { _id: 's1', endpoint: SUB.endpoint, keys: SUB.keys },
      { _id: 's2', endpoint: 'https://push.example/def', keys: SUB.keys },
    ]) });
    webpush.sendNotification.mockResolvedValue({});

    const n = await pushService.sendToUser('u1', { title: 'hola' });
    expect(n).toBe(2);
    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  test('limpia las suscripciones expiradas (410)', async () => {
    PushSubscription.find.mockReturnValue({ lean: () => Promise.resolve([
      { _id: 's1', endpoint: SUB.endpoint, keys: SUB.keys },
    ]) });
    webpush.sendNotification.mockRejectedValue({ statusCode: 410, message: 'gone' });

    const n = await pushService.sendToUser('u1', { title: 'hola' });
    expect(n).toBe(0);
    expect(PushSubscription.deleteOne).toHaveBeenCalledWith({ _id: 's1' });
  });

  test('sin suscripciones devuelve 0', async () => {
    PushSubscription.find.mockReturnValue({ lean: () => Promise.resolve([]) });
    expect(await pushService.sendToUser('u1', {})).toBe(0);
  });
});
