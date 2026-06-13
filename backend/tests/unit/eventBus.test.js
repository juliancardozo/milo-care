'use strict';

// Bus de eventos + adaptador legacy de analyticsService.

jest.mock('../../src/models/Event', () => ({ create: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({}) }));

const Event = require('../../src/models/Event');
const { emitEvent, deleteUserEvents } = require('../../src/core/events/eventBus');
const analytics = require('../../src/services/analyticsService');

beforeEach(() => jest.clearAllMocks());

describe('emitEvent', () => {
  test('persiste un evento válido', async () => {
    const ok = await emitEvent({ type: 'behavior.logged', userId: 'u1', dogId: 'd1', payload: { kind: 'logro' } });
    expect(ok).toBe(true);
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'behavior.logged', userId: 'u1', dogId: 'd1' }));
  });

  test('descarta un evento inválido sin persistir', async () => {
    const ok = await emitEvent({ type: 'behavior.logged', payload: { kind: 'inventado' } });
    expect(ok).toBe(false);
    expect(Event.create).not.toHaveBeenCalled();
  });

  test('no lanza si la persistencia falla', async () => {
    Event.create.mockRejectedValueOnce(new Error('db down'));
    await expect(emitEvent({ type: 'referral.signup', payload: {} })).resolves.toBe(false);
  });
});

describe('deleteUserEvents (GDPR)', () => {
  test('borra eventos por userId', async () => {
    await deleteUserEvents('u1');
    expect(Event.deleteMany).toHaveBeenCalledWith({ userId: 'u1' });
  });
});

describe('analyticsService.track → catálogo', () => {
  test('mapea checkin_answered legacy a checkin.answered', async () => {
    analytics.track('checkin_answered', { userId: 'u1', dogId: 'd1', channel: 'app', meta: { question: 'comida', answer: 'mal' } });
    await new Promise((r) => setImmediate(r));
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'checkin.answered',
      payload: { question: 'comida', answer: 'mal', channel: 'app' },
    }));
  });

  test('mapea quick_symptom_logged (tos → tos_respiracion)', async () => {
    analytics.track('quick_symptom_logged', { userId: 'u1', dogId: 'd1', meta: { quickType: 'tos' } });
    await new Promise((r) => setImmediate(r));
    expect(Event.create).toHaveBeenCalledWith(expect.objectContaining({
      type: 'symptom.logged',
      payload: { type: 'tos_respiracion', severity: 'media', entryMode: 'quick' },
    }));
  });

  test('descarta tipo legacy sin mapeo (checkin_streak_day)', async () => {
    analytics.track('checkin_streak_day', { userId: 'u1' });
    await new Promise((r) => setImmediate(r));
    expect(Event.create).not.toHaveBeenCalled();
  });
});
