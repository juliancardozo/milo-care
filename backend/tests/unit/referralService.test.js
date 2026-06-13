'use strict';

// Tests del programa de referidos: anti-abuso + activación recíproca.
// Mockea los modelos y servicios externos; ejercita la lógica real del service.

jest.mock('../../src/models/User', () => ({ findOne: jest.fn(), findById: jest.fn() }));
jest.mock('../../src/models/Referral', () => ({ create: jest.fn(), findOne: jest.fn(), countDocuments: jest.fn(), find: jest.fn() }));
jest.mock('../../src/services/EmailService', () => ({ sendReferralActivated: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));

const User = require('../../src/models/User');
const Referral = require('../../src/models/Referral');
const EmailService = require('../../src/services/EmailService');
const referralService = require('../../src/services/referralService');

const NOW = new Date('2026-06-12T12:00:00.000Z');

function makeUser(id, email, overrides = {}) {
  return {
    _id: id,
    name: `User ${id}`,
    email,
    tier: 'free',
    premiumUntil: null,
    referralBoostUntil: null,
    grantPremiumDays(days, now = new Date()) {
      const base = this.premiumUntil && this.premiumUntil > now ? this.premiumUntil : now;
      this.premiumUntil = new Date(base.getTime() + days * 86400000);
    },
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => jest.clearAllMocks());

describe('registerReferral — anti-abuso', () => {
  test('crea un referral pendiente con código válido', async () => {
    const referrer = makeUser('ref1', 'referrer@test.com', { referralCode: 'MILO-ABCD' });
    User.findOne.mockResolvedValue(referrer);
    Referral.create.mockResolvedValue({ _id: 'r1', status: 'pending' });

    const newUser = makeUser('new1', 'nuevo@test.com');
    const result = await referralService.registerReferral({ code: 'MILO-ABCD', newUser });

    expect(result).toBeTruthy();
    expect(Referral.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', referrerUserId: 'ref1', referredUserId: 'new1' }));
  });

  test('rechaza auto-referencia (mismo usuario)', async () => {
    const referrer = makeUser('same', 'a@test.com', { referralCode: 'MILO-ABCD' });
    User.findOne.mockResolvedValue(referrer);
    const result = await referralService.registerReferral({ code: 'MILO-ABCD', newUser: referrer });
    expect(result).toBeNull();
    expect(Referral.create).not.toHaveBeenCalled();
  });

  test('rechaza mismo email', async () => {
    const referrer = makeUser('ref1', 'dup@test.com', { referralCode: 'MILO-ABCD' });
    User.findOne.mockResolvedValue(referrer);
    const newUser = makeUser('new1', 'DUP@test.com');
    const result = await referralService.registerReferral({ code: 'MILO-ABCD', newUser });
    expect(result).toBeNull();
  });

  test('código inexistente → null', async () => {
    User.findOne.mockResolvedValue(null);
    const result = await referralService.registerReferral({ code: 'MILO-ZZZZ', newUser: makeUser('n', 'n@test.com') });
    expect(result).toBeNull();
  });

  test('invitado ya referenciado (índice único) → null', async () => {
    User.findOne.mockResolvedValue(makeUser('ref1', 'r@test.com', { referralCode: 'MILO-ABCD' }));
    Referral.create.mockRejectedValue({ code: 11000 });
    const result = await referralService.registerReferral({ code: 'MILO-ABCD', newUser: makeUser('n', 'n@test.com') });
    expect(result).toBeNull();
  });
});

describe('activateForReferredUser — recompensa recíproca', () => {
  test('sin referral pendiente no hace nada', async () => {
    Referral.findOne.mockResolvedValue(null);
    const result = await referralService.activateForReferredUser(makeUser('u', 'u@test.com'), NOW);
    expect(result).toEqual({ activated: false });
  });

  test('activa y otorga 30 días a ambos (bajo el cap)', async () => {
    const referral = { referrerUserId: 'ref1', status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
    Referral.findOne.mockResolvedValue(referral);
    const referrer = makeUser('ref1', 'ref@test.com');
    User.findById.mockResolvedValue(referrer);
    Referral.countDocuments.mockResolvedValue(0);

    const referred = makeUser('new1', 'new@test.com');
    const result = await referralService.activateForReferredUser(referred, NOW);

    expect(result).toEqual({ activated: true, rewarded: true });
    expect(referral.status).toBe('activated');
    expect(referrer.premiumUntil.getTime()).toBe(NOW.getTime() + 30 * 86400000);
    expect(referred.premiumUntil.getTime()).toBe(NOW.getTime() + 30 * 86400000);
    expect(EmailService.sendReferralActivated).toHaveBeenCalledTimes(1);
  });

  test('código potenciado vigente → 45 días', async () => {
    const referral = { referrerUserId: 'ref1', status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
    Referral.findOne.mockResolvedValue(referral);
    const referrer = makeUser('ref1', 'ref@test.com', { referralBoostUntil: new Date(NOW.getTime() + 3600 * 1000) });
    User.findById.mockResolvedValue(referrer);
    Referral.countDocuments.mockResolvedValue(0);

    const referred = makeUser('new1', 'new@test.com');
    await referralService.activateForReferredUser(referred, NOW);

    expect(referred.premiumUntil.getTime()).toBe(NOW.getTime() + 45 * 86400000);
  });

  test('cap mensual alcanzado → activa pero no recompensa', async () => {
    const referral = { referrerUserId: 'ref1', status: 'pending', save: jest.fn().mockResolvedValue(undefined) };
    Referral.findOne.mockResolvedValue(referral);
    const referrer = makeUser('ref1', 'ref@test.com');
    User.findById.mockResolvedValue(referrer);
    Referral.countDocuments.mockResolvedValue(10); // cap = 10

    const referred = makeUser('new1', 'new@test.com');
    const result = await referralService.activateForReferredUser(referred, NOW);

    expect(result).toEqual({ activated: true, rewarded: false });
    expect(referred.premiumUntil).toBeNull();
    expect(referrer.premiumUntil).toBeNull();
    expect(EmailService.sendReferralActivated).not.toHaveBeenCalled();
  });
});
