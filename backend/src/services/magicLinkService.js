'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const MagicLoginToken = require('../models/MagicLoginToken');

const SALT_ROUNDS = 12;
const MAGIC_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 min — login link de vida corta

// Crea un magic-login token de un solo uso para el usuario y devuelve la URL de
// ingreso (que canjea POST /api/auth/magic-login). Invalida cualquier token previo.
async function issueMagicLinkUrl(user) {
  await MagicLoginToken.deleteMany({ userId: user._id });

  const plainToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = await bcrypt.hash(plainToken, SALT_ROUNDS);
  const expiresAt = new Date(Date.now() + MAGIC_TOKEN_TTL_MS);
  await MagicLoginToken.create({ userId: user._id, tokenHash, expiresAt });

  const base = process.env.APP_URL || 'http://localhost:5173';
  return `${base}/magic-login?token=${plainToken}&userId=${user._id}`;
}

module.exports = { issueMagicLinkUrl, SALT_ROUNDS, MAGIC_TOKEN_TTL_MS };
