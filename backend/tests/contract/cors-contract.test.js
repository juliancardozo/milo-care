'use strict';

// CORS: APP_URL + CORS_ALLOWED_ORIGINS (staging / rama develop de Amplify).

process.env.JWT_SECRET = 'test-secret';

const request = require('supertest');

function loadApp(env) {
  const saved = { APP_URL: process.env.APP_URL, CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS };
  Object.assign(process.env, env);
  let app;
  jest.isolateModules(() => { app = require('../../src/app'); });
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  return app;
}

describe('CORS', () => {
  const app = loadApp({
    APP_URL: 'https://milocare.org',
    CORS_ALLOWED_ORIGINS: 'https://develop.d2d3bj1p216a32.amplifyapp.com/, http://localhost:5173',
  });

  it.each([
    'https://milocare.org',
    'https://develop.d2d3bj1p216a32.amplifyapp.com',
    'http://localhost:5173',
  ])('permite %s', async (origin) => {
    const res = await request(app).options('/api/auth/login').set('Origin', origin).set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBe(origin);
  });

  it('no permite un origen desconocido', async () => {
    const res = await request(app).options('/api/auth/login').set('Origin', 'https://evil.example').set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sin CORS_ALLOWED_ORIGINS solo permite APP_URL', async () => {
    const prodApp = loadApp({ APP_URL: 'https://milocare.org', CORS_ALLOWED_ORIGINS: '' });
    const ok = await request(prodApp).options('/api/auth/login').set('Origin', 'https://milocare.org').set('Access-Control-Request-Method', 'POST');
    const ko = await request(prodApp).options('/api/auth/login').set('Origin', 'https://develop.d2d3bj1p216a32.amplifyapp.com').set('Access-Control-Request-Method', 'POST');
    expect(ok.headers['access-control-allow-origin']).toBe('https://milocare.org');
    expect(ko.headers['access-control-allow-origin']).toBeUndefined();
  });
});
