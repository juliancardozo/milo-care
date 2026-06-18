'use strict';

/**
 * Require the authenticated user to be a clinic-owner vet (role === 'vet').
 * Must be used after the `authenticate` middleware. Gates the vet panel, which
 * exposes patient aggregates and must only be visible to the owning vet.
 */
function requireVet(req, res, next) {
  if (req.user?.role !== 'vet') {
    return res.status(403).json({ code: 'FORBIDDEN', message: 'Vet access required.' });
  }
  next();
}

module.exports = requireVet;
