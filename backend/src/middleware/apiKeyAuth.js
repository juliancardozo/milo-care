'use strict';

const Partner = require('../models/Partner');
const { hashApiKey } = require('../services/apiKey');

/**
 * Autentica una request de la API v1 por API key del partner. Acepta la key en
 * `X-API-Key` o `Authorization: Bearer <key>`. Resuelve el partner por hash y lo
 * adjunta en `req.partner` → todas las queries v1 quedan aisladas por partner.
 */
async function apiKeyAuth(req, res, next) {
  try {
    const fromBearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null;
    const key = req.headers['x-api-key'] || fromBearer;
    if (!key) return res.status(401).json({ code: 'API_KEY_REQUIRED', message: 'API key required.' });

    const partner = await Partner.findOne({ apiKeyHash: hashApiKey(key), status: 'active' });
    if (!partner) return res.status(401).json({ code: 'INVALID_API_KEY', message: 'Invalid API key.' });

    req.partner = partner;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = apiKeyAuth;
