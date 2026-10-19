'use strict';

// Contrato del cron externo: POST /api/internal/cron/:job (sin DB ni red).
// Mockea las funciones run* de los jobs; ejercita el router real montado en app.

process.env.JWT_SECRET = 'test-secret';

jest.mock('../../src/services/ReminderJob', () => ({ startReminderJob: jest.fn(), runReminders: jest.fn() }));
jest.mock('../../src/services/CheckinJob', () => ({ startCheckinJob: jest.fn(), runCheckins: jest.fn() }));
jest.mock('../../src/services/TriggeredCampaignsJob', () => ({
  startTriggeredCampaignsJob: jest.fn(),
  runTriggeredCampaigns: jest.fn(),
}));
jest.mock('../../src/services/MeteringJob', () => ({ startMeteringJob: jest.fn(), runMetering: jest.fn() }));

const request = require('supertest');
const app = require('../../src/app');
const featureFlags = require('../../src/config/featureFlags');
const jobLock = require('../../src/services/jobLock');
const { runReminders } = require('../../src/services/ReminderJob');
const { runCheckins } = require('../../src/services/CheckinJob');
const { runTriggeredCampaigns } = require('../../src/services/TriggeredCampaignsJob');
const { runMetering } = require('../../src/services/MeteringJob');

const SECRET = 'cron-test-secret-0123456789';
const ORIGINAL_FLAGS = { ...featureFlags };

beforeEach(() => {
  jest.clearAllMocks();
  jobLock._reset();
  process.env.CRON_SECRET = SECRET;
  Object.assign(featureFlags, ORIGINAL_FLAGS);
  [runReminders, runCheckins, runTriggeredCampaigns, runMetering].forEach((fn) => fn.mockResolvedValue(undefined));
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

describe('POST /api/internal/cron/:job', () => {
  it('404 si CRON_SECRET no está configurado (aunque se mande un header)', async () => {
    delete process.env.CRON_SECRET;
    const res = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    expect(res.status).toBe(404);
    expect(runReminders).not.toHaveBeenCalled();
  });

  it('401 sin header de secreto', async () => {
    const res = await request(app).post('/api/internal/cron/reminders');
    expect(res.status).toBe(401);
    expect(runReminders).not.toHaveBeenCalled();
  });

  it('401 con secreto incorrecto (mismo largo y distinto largo)', async () => {
    const sameLength = 'x'.repeat(SECRET.length);
    for (const bad of [sameLength, 'short', `${SECRET}-extra`]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', bad);
      expect(res.status).toBe(401);
    }
    expect(runReminders).not.toHaveBeenCalled();
  });

  it('404 UNKNOWN_JOB para un job desconocido (con secreto correcto)', async () => {
    for (const name of ['nope', '__proto__', 'constructor']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post(`/api/internal/cron/${name}`).set('X-Cron-Secret', SECRET);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('UNKNOWN_JOB');
    }
  });

  it('GET no está expuesto', async () => {
    const res = await request(app).get('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    expect(res.status).toBe(404);
  });

  it('202 con secreto correcto y dispara runReminders', async () => {
    const res = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ job: 'reminders', status: 'started' });
    expect(runReminders).toHaveBeenCalledTimes(1);
  });

  it('202 para campaigns', async () => {
    const res = await request(app).post('/api/internal/cron/campaigns').set('X-Cron-Secret', SECRET);
    expect(res.status).toBe(202);
    expect(runTriggeredCampaigns).toHaveBeenCalledTimes(1);
  });

  it('respeta feature flags: checkins y metering responden disabled si el flag está off', async () => {
    featureFlags.checkinEnabled = false;
    featureFlags.companionEnabled = false;
    const a = await request(app).post('/api/internal/cron/checkins').set('X-Cron-Secret', SECRET);
    const b = await request(app).post('/api/internal/cron/metering').set('X-Cron-Secret', SECRET);
    expect(a.status).toBe(200);
    expect(a.body.status).toBe('disabled');
    expect(b.body.status).toBe('disabled');
    expect(runCheckins).not.toHaveBeenCalled();
    expect(runMetering).not.toHaveBeenCalled();
  });

  it('con el flag on, checkins y metering se disparan', async () => {
    featureFlags.checkinEnabled = true;
    featureFlags.companionEnabled = true;
    const a = await request(app).post('/api/internal/cron/checkins').set('X-Cron-Secret', SECRET);
    const b = await request(app).post('/api/internal/cron/metering').set('X-Cron-Secret', SECRET);
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(runCheckins).toHaveBeenCalledTimes(1);
    expect(runMetering).toHaveBeenCalledTimes(1);
  });

  it('no ejecuta dos veces en paralelo: la segunda llamada responde already_running', async () => {
    let finish;
    runReminders.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));

    const first = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    const second = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    expect(first.status).toBe(202);
    expect(second.status).toBe(200);
    expect(second.body.status).toBe('already_running');
    expect(runReminders).toHaveBeenCalledTimes(1);

    finish();
    await new Promise((r) => setImmediate(r));
    const third = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    expect(third.status).toBe(202);
    expect(runReminders).toHaveBeenCalledTimes(2);
  });

  it('el lock es compartido con el cron in-process (mismo nombre de job)', async () => {
    let finish;
    const inProcess = jobLock.runExclusive('reminders', () => new Promise((resolve) => { finish = resolve; }));
    expect(inProcess.started).toBe(true);

    const res = await request(app).post('/api/internal/cron/reminders').set('X-Cron-Secret', SECRET);
    expect(res.body.status).toBe('already_running');
    expect(runReminders).not.toHaveBeenCalled();
    finish();
    await inProcess.promise;
  });
});

describe('jobLock', () => {
  beforeEach(() => jobLock._reset());

  it('libera el lock aunque el job falle', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { promise } = jobLock.runExclusive('x', () => Promise.reject(new Error('boom')));
    await promise;
    expect(jobLock.isRunning('x')).toBe(false);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
