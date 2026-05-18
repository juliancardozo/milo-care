'use strict';

const jwt = require('jsonwebtoken');

/**
 * Require a valid Bearer JWT. Attaches `req.user = { id, email, tier }`.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required.' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, tier: payload.tier, role: payload.role || 'user' };
    next();
  } catch {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Token is invalid or expired.' });
  }
}

module.exports = authenticate;
