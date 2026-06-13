'use strict';

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../src/services/pushService', () => ({
  getPublicKey: jest.fn(() => 'PUBLIC_KEY'),
  saveSubscription: jest.fn().mockResolvedValue(undefined),
  removeSubscription: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const pushService = require('../../src/services/pushService');
const app = require('../../src/app');

const token = jwt.sign({ sub: '665000000000000000000001', email: 'u@test.com', tier: 'free' }, process.env.JWT_SECRET);
const SUB = { endpoint: 'https://push.example/abc', keys: { p256dh: 'k', auth: 'a' } };

beforeEach(() => jest.clearAllMocks());

describe('GET /api/push/vapid-key', () => {
  test('devuelve la clave pública', async () => {
    const res = await request(app).get('/api/push/vapid-key');
    expect(res.status).toBe(200);
    expect(res.body.publicKey).toBe('PUBLIC_KEY');
  });

  test('503 si push no está configurado', async () => {
    pushService.getPublicKey.mockReturnValueOnce(null);
    const res = await request(app).get('/api/push/vapid-key');
    expect(res.status).toBe(503);
  });
});

describe('POST /api/push/subscribe', () => {
  test('guarda la suscripción (201)', async () => {
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ subscription: SUB });
    expect(res.status).toBe(201);
    expect(pushService.saveSubscription).toHaveBeenCalled();
  });

  test('401 sin token', async () => {
    const res = await request(app).post('/api/push/subscribe').send({ subscription: SUB });
    expect(res.status).toBe(401);
  });

  test('400 si la suscripción es inválida', async () => {
    pushService.saveSubscription.mockRejectedValueOnce(new Error('Invalid push subscription.'));
    const res = await request(app)
      .post('/api/push/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ subscription: {} });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/push/unsubscribe', () => {
  test('elimina la suscripción', async () => {
    const res = await request(app)
      .post('/api/push/unsubscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ endpoint: SUB.endpoint });
    expect(res.status).toBe(200);
    expect(pushService.removeSubscription).toHaveBeenCalledWith('665000000000000000000001', SUB.endpoint);
  });
});
