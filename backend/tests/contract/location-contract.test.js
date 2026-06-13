'use strict';

// Test hermético de los endpoints de zona (opt-in / borrado).

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));
jest.mock('../../src/services/analyticsService', () => ({ track: jest.fn() }));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const User = require('../../src/models/User');
const analytics = require('../../src/services/analyticsService');
const app = require('../../src/app');

const USER_ID = '665000000000000000000001';
const token = jwt.sign({ sub: USER_ID, email: 'u@test.com', tier: 'free' }, process.env.JWT_SECRET);

function mockUser() {
  return {
    _id: USER_ID,
    location: null,
    locationConsentAt: null,
    save: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => jest.clearAllMocks());

describe('PATCH /api/user/location', () => {
  test('guarda la zona y registra consentimiento + evento', async () => {
    const user = mockUser();
    User.findById.mockResolvedValue(user);

    const res = await request(app)
      .patch('/api/user/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ country: 'AR', region: 'Buenos Aires', city: 'La Plata' });

    expect(res.status).toBe(200);
    expect(user.location).toEqual({ country: 'AR', region: 'Buenos Aires', city: 'La Plata' });
    expect(user.locationConsentAt).toBeInstanceOf(Date);
    expect(analytics.track).toHaveBeenCalledWith('location_optin', expect.any(Object));
  });

  test('country inválido → 400', async () => {
    User.findById.mockResolvedValue(mockUser());
    const res = await request(app)
      .patch('/api/user/location')
      .set('Authorization', `Bearer ${token}`)
      .send({ country: 'BR' });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/user/location', () => {
  test('borra la zona y el consentimiento + evento', async () => {
    const user = { ...mockUser(), location: { country: 'AR' }, locationConsentAt: new Date() };
    user.save = jest.fn().mockResolvedValue(undefined);
    User.findById.mockResolvedValue(user);

    const res = await request(app)
      .delete('/api/user/location')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(user.location).toBeNull();
    expect(user.locationConsentAt).toBeNull();
    expect(analytics.track).toHaveBeenCalledWith('location_deleted', expect.any(Object));
  });
});
