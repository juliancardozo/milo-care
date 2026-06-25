'use strict';

const jwt = require('jsonwebtoken');

/**
 * Identidad opcional: si viene un Bearer JWT válido, adjunta `req.user`; si no,
 * sigue sin error (a diferencia de `authenticate`, que bloquea). Sirve para rutas
 * públicas que se enriquecen cuando el solicitante está logueado — p. ej. un vet
 * que valida un expediente compartido y queda identificado para el sello.
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const payload = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email, tier: payload.tier, role: payload.role || 'user' };
    } catch {
      // Token inválido/expirado en ruta opcional → simplemente seguimos anónimos.
    }
  }
  next();
}

module.exports = optionalAuth;
