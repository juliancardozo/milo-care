'use strict';

const request = require('supertest');

jest.mock('../../src/middleware/auth', () => (req, _res, next) => {
  req.user = { id: 'user-1' };
  next();
});

jest.mock('../../src/models/User', () => ({ findById: jest.fn() }));

jest.mock('../../src/config/featureFlags', () => ({
  reminderFullListEnabled: true,
  googleWalletEnabled: true,
}));

// El servicio real necesita credenciales reales; lo stubeamos para el contrato de la ruta.
jest.mock('../../src/services/GoogleWalletService', () => ({
  generateSaveUrl: jest.fn(() => 'https://pay.google.com/gp/v/save/fake.jwt.token'),
}));

const User = require('../../src/models/User');
const featureFlags = require('../../src/config/featureFlags');
const GoogleWalletService = require('../../src/services/GoogleWalletService');
const app = require('../../src/app');

function buildUser() {
  const dog = { _id: 'dog-1', name: 'Luna', breed: 'Beagle' };
  return {
    _id: 'user-1',
    name: 'Ana',
    dogs: { id: (id) => (id === 'dog-1' ? dog : null) },
  };
}

describe('Contract: POST /api/dogs/:dogId/wallet-pass', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    featureFlags.googleWalletEnabled = true;
    User.findById.mockResolvedValue(buildUser());
  });

  it('returns { saveUrl } for a valid dog', async () => {
    const res = await request(app).post('/api/dogs/dog-1/wallet-pass');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('saveUrl');
    expect(res.body.saveUrl).toContain('pay.google.com/gp/v/save/');
    expect(GoogleWalletService.generateSaveUrl).toHaveBeenCalledTimes(1);
  });

  it('returns 404 for an unknown dog', async () => {
    const res = await request(app).post('/api/dogs/nope/wallet-pass');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe('DOG_NOT_FOUND');
  });

  it('returns 503 when the feature flag is disabled', async () => {
    featureFlags.googleWalletEnabled = false;

    const res = await request(app).post('/api/dogs/dog-1/wallet-pass');

    expect(res.status).toBe(503);
    expect(res.body.code).toBe('FEATURE_DISABLED');
  });
});
