'use strict';

jest.mock('../../src/models/User', () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  exists: jest.fn(),
}));

jest.mock('../../src/models/CoTutorInvite', () => ({
  deleteMany: jest.fn().mockResolvedValue({}),
  create: jest.fn().mockResolvedValue({}),
  findOne: jest.fn(),
  updateMany: jest.fn(),
}));

const User = require('../../src/models/User');
const CoTutorInvite = require('../../src/models/CoTutorInvite');
const CoTutorService = require('../../src/services/CoTutorService');

function ownerUser(premium = true) {
  return {
    _id: 'owner-1',
    name: 'Julián',
    email: 'julian@example.com',
    isPremiumActive: () => premium,
  };
}

function dog(caregivers = []) {
  return { _id: 'dog-1', name: 'Milo', caregivers };
}

describe('CoTutorService.createInvite', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rechaza si el dueño no es Premium', async () => {
    await expect(
      CoTutorService.createInvite({ ownerUser: ownerUser(false), dog: dog(), email: 'maca@example.com' })
    ).rejects.toMatchObject({ status: 403, code: 'PREMIUM_REQUIRED' });
  });

  it('rechaza invitarse a uno mismo', async () => {
    await expect(
      CoTutorService.createInvite({ ownerUser: ownerUser(), dog: dog(), email: 'julian@example.com' })
    ).rejects.toMatchObject({ status: 400, code: 'CANNOT_INVITE_SELF' });
  });

  it('rechaza email inválido', async () => {
    await expect(
      CoTutorService.createInvite({ ownerUser: ownerUser(), dog: dog(), email: 'no-es-email' })
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
  });

  it('crea la invitación y marca isNewUser cuando el invitado no existe', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await CoTutorService.createInvite({ ownerUser: ownerUser(), dog: dog(), email: 'Maca@Example.com' });

    expect(res.isNewUser).toBe(true);
    expect(res.inviteeEmail).toBe('maca@example.com');
    expect(res.token).toEqual(expect.any(String));
    expect(CoTutorInvite.deleteMany).toHaveBeenCalled();
    expect(CoTutorInvite.create).toHaveBeenCalledWith(expect.objectContaining({
      ownerId: 'owner-1', dogId: 'dog-1', inviteeEmail: 'maca@example.com',
    }));
  });

  it('rechaza si el invitado ya es co-tutor', async () => {
    User.findOne.mockResolvedValue({ _id: 'maca-1' });
    await expect(
      CoTutorService.createInvite({ ownerUser: ownerUser(), dog: dog([{ userId: 'maca-1' }]), email: 'maca@example.com' })
    ).rejects.toMatchObject({ status: 409, code: 'ALREADY_COTUTOR' });
  });
});

describe('CoTutorService.acceptInvite', () => {
  beforeEach(() => jest.clearAllMocks());

  function pendingInvite(overrides = {}) {
    return {
      ownerId: 'owner-1', dogId: 'dog-1', dogName: 'Milo',
      inviteeEmail: 'maca@example.com',
      expiresAt: new Date(Date.now() + 1000 * 60),
      status: 'pending',
      save: jest.fn().mockResolvedValue({}),
      ...overrides,
    };
  }

  it('agrega el caregiver y marca la invitación aceptada', async () => {
    const invite = pendingInvite();
    CoTutorInvite.findOne.mockResolvedValue(invite);
    const caregivers = [];
    const owner = {
      _id: 'owner-1', name: 'Julián',
      dogs: { id: () => ({ _id: 'dog-1', name: 'Milo', caregivers }) },
      save: jest.fn().mockResolvedValue({}),
    };
    User.findById.mockResolvedValue(owner);
    const user = { _id: 'maca-1', email: 'maca@example.com' };

    const res = await CoTutorService.acceptInvite({ token: 'tok', user });

    expect(caregivers).toHaveLength(1);
    expect(String(caregivers[0].userId)).toBe('maca-1');
    expect(owner.save).toHaveBeenCalled();
    expect(invite.status).toBe('accepted');
    expect(res).toMatchObject({ dogId: 'dog-1', dogName: 'Milo', ownerName: 'Julián' });
  });

  it('rechaza si el email del usuario no coincide con el invitado', async () => {
    CoTutorInvite.findOne.mockResolvedValue(pendingInvite());
    const user = { _id: 'otro-1', email: 'otro@example.com' };
    await expect(CoTutorService.acceptInvite({ token: 'tok', user }))
      .rejects.toMatchObject({ status: 403, code: 'INVITE_EMAIL_MISMATCH' });
  });

  it('rechaza token inexistente', async () => {
    CoTutorInvite.findOne.mockResolvedValue(null);
    await expect(CoTutorService.acceptInvite({ token: 'tok', user: { email: 'x@x.com' } }))
      .rejects.toMatchObject({ status: 404, code: 'INVITE_NOT_FOUND' });
  });

  it('rechaza invitación vencida', async () => {
    CoTutorInvite.findOne.mockResolvedValue(pendingInvite({ expiresAt: new Date(Date.now() - 1000) }));
    await expect(CoTutorService.acceptInvite({ token: 'tok', user: { email: 'maca@example.com' } }))
      .rejects.toMatchObject({ status: 410, code: 'INVITE_EXPIRED' });
  });
});
