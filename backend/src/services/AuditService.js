'use strict';

const AuditLog = require('../models/AuditLog');

/**
 * AuditService — punto único para escribir el registro de auditoría/consentimiento.
 *
 * `record` es resiliente: nunca debe tumbar el flujo de negocio. Si el log falla,
 * se loguea el error y se sigue (el evento de negocio ya ocurrió). Devuelve el doc
 * creado o null.
 */
async function record({ userId, action, meta = {} } = {}) {
  try {
    if (!userId || !action) return null;
    return await AuditLog.create({ userId, action, meta, at: new Date() });
  } catch (err) {
    console.error('[AuditService] failed to record', action, err.message);
    return null;
  }
}

module.exports = { record };
