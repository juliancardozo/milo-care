'use strict';

/**
 * Require the authenticated user to have role === 'admin'.
 * Must be used after the `authenticate` middleware.
 */
function adminAuth(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin access required.' });
  }
  next();
}

module.exports = adminAuth;
