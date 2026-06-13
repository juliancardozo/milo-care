'use strict';

const { resolveDogAccess, ACTION_ROLES } = require('../../src/services/dogAccessPolicy');

jest.mock('../../src/models/DogAccess');
jest.mock('../../src/config/featureFlags', () => ({ multiTutorEnabled: true }));

const DogAccess = require('../../src/models/DogAccess');

const ACTOR   = 'actor-user';
const DOG_ID  = 'dog-1';
const OWNER   = 'owner-user';

describe('dogAccessPolicy — flag ON', () => {
  beforeEach(() => jest.clearAllMocks());

  // Helper: mockea findOne para que soporte .lean() (patrón Mongoose encadenado).
  function mockFindOne(value) {
    DogAccess.findOne.mockReturnValue({ lean: () => Promise.resolve(value) });
  }

  it('owner puede leer', async () => {
    mockFindOne({ role: 'owner', status: 'active' });
    const { allowed, role } = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.read', ownerUserId: OWNER });
    expect(allowed).toBe(true);
    expect(role).toBe('owner');
  });

  it('viewer puede leer pero no escribir', async () => {
    mockFindOne({ role: 'viewer', status: 'active' });
    const read  = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.read',  ownerUserId: OWNER });
    mockFindOne({ role: 'viewer', status: 'active' });
    const write = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.write', ownerUserId: OWNER });
    expect(read.allowed).toBe(true);
    expect(write.allowed).toBe(false);
    expect(write.reason).toBe('insufficient_role');
  });

  it('editor puede escribir pero no revocar', async () => {
    mockFindOne({ role: 'editor', status: 'active' });
    const write  = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.write',  ownerUserId: OWNER });
    mockFindOne({ role: 'editor', status: 'active' });
    const revoke = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.revoke', ownerUserId: OWNER });
    expect(write.allowed).toBe(true);
    expect(revoke.allowed).toBe(false);
  });

  it('sin membresía → no_membership', async () => {
    mockFindOne(null);
    const result = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.read', ownerUserId: OWNER });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('no_membership');
  });

  it('acción desconocida → denegada', async () => {
    const result = await resolveDogAccess({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.whatever', ownerUserId: OWNER });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('unknown_action');
  });
});

describe('dogAccessPolicy — flag OFF (fallback propietario único)', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../../src/config/featureFlags', () => ({ multiTutorEnabled: false }));
    jest.doMock('../../src/models/DogAccess', () => ({}));
  });
  afterEach(() => jest.resetModules());

  it('ownerUserId === actorUserId permite acción owner', async () => {
    const { resolveDogAccess: resolve } = require('../../src/services/dogAccessPolicy');
    const r = await resolve({ actorUserId: OWNER, dogId: DOG_ID, action: 'dog.read', ownerUserId: OWNER });
    expect(r.allowed).toBe(true);
    expect(r.role).toBe('owner');
  });

  it('otro userId deniega', async () => {
    const { resolveDogAccess: resolve } = require('../../src/services/dogAccessPolicy');
    const r = await resolve({ actorUserId: ACTOR, dogId: DOG_ID, action: 'dog.read', ownerUserId: OWNER });
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('not_owner');
  });
});

describe('ACTION_ROLES tabla completa', () => {
  it('todos los roles de owner tienen acceso dog.read', () => {
    expect(ACTION_ROLES['dog.read']).toContain('owner');
    expect(ACTION_ROLES['dog.read']).toContain('viewer');
  });
  it('solo owner puede eliminar', () => {
    expect(ACTION_ROLES['dog.delete']).toEqual(['owner']);
  });
});
