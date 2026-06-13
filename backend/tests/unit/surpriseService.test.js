'use strict';

jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));

const surpriseService = require('../../src/services/surpriseService');

const NOW = new Date('2026-06-12T22:00:00.000Z');

function makeUser(overrides = {}) {
  return {
    _id: 'u1',
    notificationPreferences: { timezone: 'America/Argentina/Buenos_Aires' },
    lastSurpriseOn: null,
    referralBoostUntil: null,
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const dog = { _id: 'd1', breed: 'Border Collie' };

describe('surpriseService.rollForUser', () => {
  test('no entrega sorpresa si la tirada supera la probabilidad', async () => {
    const user = makeUser();
    const res = await surpriseService.rollForUser(user, dog, { now: NOW, rng: () => 0.99, probability: 0.15 });
    expect(res).toBeNull();
    expect(user.save).not.toHaveBeenCalled();
  });

  test('entrega sorpresa cuando la tirada cae bajo la probabilidad', async () => {
    const user = makeUser();
    const res = await surpriseService.rollForUser(user, dog, { now: NOW, rng: () => 0, probability: 1 });
    expect(res).toBeTruthy();
    expect(user.lastSurpriseOn).toBeTruthy();
    expect(user.save).toHaveBeenCalledTimes(1);
  });

  test('máximo una sorpresa por día (lastSurpriseOn de hoy)', async () => {
    const localDate = require('../../src/utils/localTime').localDateString('America/Argentina/Buenos_Aires', NOW);
    const user = makeUser({ lastSurpriseOn: localDate });
    const res = await surpriseService.rollForUser(user, dog, { now: NOW, rng: () => 0, probability: 1 });
    expect(res).toBeNull();
  });

  test('sorpresa de código potenciado setea referralBoostUntil', async () => {
    const user = makeUser();
    // gate (0 < prob) y luego pickFromPool con 0.95 → boosted_referral
    const seq = [0, 0.95];
    let i = 0;
    const rng = () => seq[Math.min(i++, seq.length - 1)];
    const res = await surpriseService.rollForUser(user, dog, { now: NOW, rng, probability: 1 });
    expect(res.type).toBe('boosted_referral');
    expect(user.referralBoostUntil).toBeInstanceOf(Date);
    expect(res.rewardDays).toBe(45);
  });
});

describe('surpriseService.pickFromPool', () => {
  test('respeta los pesos del pool', () => {
    expect(surpriseService.pickFromPool(() => 0)).toBe('breed_fact'); // primer item, mayor peso
    expect(surpriseService.pickFromPool(() => 0.95)).toBe('boosted_referral'); // cola del pool
  });
});
