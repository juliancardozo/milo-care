'use strict';

// Roles con privilegios de administración. 'adminVet' es un superconjunto de
// 'admin' (todas sus funcionalidades) + gestión de clínicas del Kit Veterinario.
const ADMIN_ROLES = ['admin', 'adminVet'];

/**
 * Require the authenticated user to have an admin-level role.
 * Must be used after the `authenticate` middleware.
 */
function adminAuth(req, res, next) {
  if (!ADMIN_ROLES.includes(req.user?.role)) {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Admin access required.' });
  }
  next();
}

adminAuth.ADMIN_ROLES = ADMIN_ROLES;
module.exports = adminAuth;
