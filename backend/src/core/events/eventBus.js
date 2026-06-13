'use strict';

const Event = require('../../models/Event');
const { validateEvent } = require('./catalog');

/**
 * Bus de eventos interno (data-model v1 §3.1).
 *
 * Los servicios de dominio escriben su documento (la verdad) Y emiten el evento.
 * Reglas:
 *  - El evento es DERIVADO: si falla, se loggea y se continúa; nunca rompe el flujo.
 *  - El payload se valida contra el catálogo tipado antes de persistir. Un evento
 *    inválido se descarta (con log), no se persiste basura.
 *  - `zoneId` se adjunta solo si el caller lo provee (opt-in de zona vigente).
 */

/**
 * Emite un evento al log. Fire-and-forget, no lanza.
 * @param {object} e - { type, userId?, dogId?, zoneId?, payload? }
 * @returns {Promise<boolean>} true si se persistió, false si fue inválido/falló
 */
async function emitEvent({ type, userId = null, dogId = null, zoneId = null, payload = {} }) {
  const { ok, errors } = validateEvent(type, payload);
  if (!ok) {
    console.error(`[eventBus] invalid event "${type}": ${errors.join('; ')}`);
    return false;
  }
  try {
    await Event.create({ type, userId, dogId, zoneId, payload, ts: new Date() });
    return true;
  } catch (err) {
    console.error(`[eventBus] persist failed for "${type}": ${err.message}`);
    return false;
  }
}

/** Borrado GDPR: elimina todos los eventos de un usuario. */
async function deleteUserEvents(userId) {
  try {
    await Event.deleteMany({ userId });
  } catch (err) {
    console.error(`[eventBus] GDPR delete failed for user ${userId}: ${err.message}`);
  }
}

module.exports = { emitEvent, deleteUserEvents };
