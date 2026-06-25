'use strict';

const crypto = require('crypto');

/**
 * API keys de partner. Como son tokens de alta entropía, usamos SHA-256
 * determinístico (no bcrypt): permite lookup directo por hash en `apiKeyAuth`.
 * La key en claro solo se muestra una vez al crearla.
 */
function generateApiKey() {
  return `mp_${crypto.randomBytes(24).toString('hex')}`;
}

function hashApiKey(key) {
  return crypto.createHash('sha256').update(String(key)).digest('hex');
}

module.exports = { generateApiKey, hashApiKey };
