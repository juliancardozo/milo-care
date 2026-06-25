'use strict';

const { describe, it, expect, afterEach } = require('@jest/globals');
const { deliver } = require('../../src/services/WebhookService');

const realFetch = global.fetch;
afterEach(() => { global.fetch = realFetch; });

describe('WebhookService.deliver', () => {
  it('entrega ok al primer intento', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });
    const r = await deliver('https://partner.test/hook', { a: 1 }, { baseDelayMs: 0 });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('reintenta ante fallo y registra el intento exitoso', async () => {
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const r = await deliver('https://partner.test/hook', { a: 1 }, { retries: 3, baseDelayMs: 0 });
    expect(r.ok).toBe(true);
    expect(r.attempts).toBe(2);
  });

  it('falla tras agotar reintentos', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    const r = await deliver('https://partner.test/hook', { a: 1 }, { retries: 2, baseDelayMs: 0 });
    expect(r.ok).toBe(false);
    expect(r.attempts).toBe(2);
  });

  it('sin url → no entrega', async () => {
    const r = await deliver('', { a: 1 });
    expect(r.ok).toBe(false);
  });
});
