'use strict';

/**
 * WebhookService — entrega webhooks salientes al partner (ej. leads de seguro) con
 * reintentos y backoff. Usa `fetch` global (Node 20). No lanza: devuelve el
 * resultado para que el caller registre la entrega.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {string} url
 * @param {object} payload
 * @param {object} [opts] { retries=3, baseDelayMs=500, timeoutMs=5000 }
 * @returns {Promise<{ ok:boolean, status?:number, attempts:number, error?:string }>}
 */
async function deliver(url, payload, { retries = 3, baseDelayMs = 500, timeoutMs = 5000 } = {}) {
  if (!url) return { ok: false, attempts: 0, error: 'no_webhook_url' };

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      if (res.ok) return { ok: true, status: res.status, attempts: attempt };
      lastError = `http_${res.status}`;
    } catch (err) {
      lastError = err.message;
    } finally {
      clearTimeout(timer); // siempre, también si fetch rechaza (evita timers colgados)
    }
    // Backoff exponencial entre reintentos (no después del último).
    if (attempt < retries && baseDelayMs > 0) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  return { ok: false, attempts: retries, error: lastError };
}

module.exports = { deliver };
