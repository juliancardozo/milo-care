'use strict';

const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'owner-1' };
  next();
});

// Habilitar el flag.
jest.mock('../../src/config/featureFlags', () => ({
  multiTutorEnabled: true,
}));

jest.mock('../../src/models/User', () => ({ findOne: jest.fn() }));
jest.mock('../../src/services/dogMembershipService');
jest.mock('../../src/services/dogAccessPolicy');

const User = require('../../src/models/User');
const policy = require('../../src/services/dogAccessPolicy');
const membership = require('../../src/services/dogMembershipService');
const app = require('../../src/app');

function makeOwnerUser(dogId = 'dog-1') {
  const dog = { _id: dogId };
  return {
    _id: 'owner-1',
    dogs: { id: (id) => (String(id) === String(dogId) ? dog : null) },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  User.findOne.mockResolvedValue(makeOwnerUser());
  policy.resolveDogAccess.mockResolvedValue({ allowed: true, role: 'owner', reason: null });
});

describe('Contract: dog members', () => {
  it('GET /members lista miembros activos', async () => {
    membership.listMembers.mockResolvedValue([
      { memberUserId: { _id: 'user-2', name: 'Ana', email: 'ana@test.com' }, role: 'editor', status: 'active' },
    ]);
    const res = await request(app).get('/api/dogs/dog-1/members');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.members)).toBe(true);
    expect(res.body.members[0].role).toBe('editor');
  });

  it('POST /members/invite retorna 201 con acceptUrl', async () => {
    membership.inviteMember.mockResolvedValue({
      access: { inviteEmail: 'bob@test.com', role: 'viewer' },
      plainToken: 'tok-abc',
    });
    const res = await request(app)
      .post('/api/dogs/dog-1/members/invite')
      .send({ inviteEmail: 'bob@test.com', role: 'viewer' });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending');
    expect(res.body.acceptUrl).toContain('tok-abc');
  });

  it('POST /members/invite 403 si no es owner', async () => {
    policy.resolveDogAccess.mockResolvedValue({ allowed: false, role: 'viewer', reason: 'insufficient_role' });
    const res = await request(app)
      .post('/api/dogs/dog-1/members/invite')
      .send({ inviteEmail: 'bob@test.com', role: 'viewer' });
    expect(res.status).toBe(403);
  });

  it('POST /members/accept acepta con token válido', async () => {
    membership.acceptInvite.mockResolvedValue({
      dogId: 'dog-1', role: 'viewer', acceptedAt: new Date(),
    });
    const res = await request(app)
      .post('/api/dogs/dog-1/members/accept')
      .send({ token: 'tok-abc' });
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(true);
    expect(res.body.role).toBe('viewer');
  });

  it('POST /members/accept 400 sin token', async () => {
    const res = await request(app).post('/api/dogs/dog-1/members/accept').send({});
    expect(res.status).toBe(400);
  });

  it('PATCH /members/:userId actualiza rol', async () => {
    membership.updateMemberRole.mockResolvedValue({ memberUserId: 'user-2', role: 'viewer' });
    const res = await request(app)
      .patch('/api/dogs/dog-1/members/user-2')
      .send({ role: 'viewer' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('viewer');
  });

  it('DELETE /members/:userId revoca acceso', async () => {
    membership.revokeMember.mockResolvedValue({});
    const res = await request(app).delete('/api/dogs/dog-1/members/user-2');
    expect(res.status).toBe(200);
    expect(res.body.active).toBe(false);
  });

  it('503 cuando flag está desactivado', async () => {
    jest.resetModules();
    jest.doMock('../../src/config/featureFlags', () => ({ multiTutorEnabled: false }));
    const appOff = require('../../src/app');
    const res = await request(appOff).get('/api/dogs/dog-1/members');
    expect(res.status).toBe(503);
    jest.resetModules();
  });
});
