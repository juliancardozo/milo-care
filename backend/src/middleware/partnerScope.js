'use strict';

const User = require('../models/User');
const adminAuth = require('./adminAuth');

/**
 * Autoriza el acceso a recursos de un partner (`/api/partners/:id/...`).
 * Debe usarse después de `authenticate`.
 *
 *   - admin / adminVet           → acceso a cualquier partner.
 *   - partner_admin              → SOLO a su propio partner (`user.partnerId === :id`),
 *                                  si no → 403 (aislamiento multi-tenant estricto).
 *   - cualquier otro rol         → 403.
 */
async function partnerScope(req, res, next) {
  try {
    const role = req.user?.role;
    if (adminAuth.ADMIN_ROLES.includes(role)) return next();

    if (role === 'partner_admin') {
      const user = await User.findById(req.user.id).select('partnerId');
      if (user && user.partnerId && String(user.partnerId) === String(req.params.id)) {
        req.actorPartnerId = String(user.partnerId);
        return next();
      }
    }

    return res.status(403).json({ code: 'FORBIDDEN', message: 'You cannot access this partner.' });
  } catch (err) {
    return next(err);
  }
}

module.exports = partnerScope;
