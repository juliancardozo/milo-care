'use strict';

const DogAccess = require('../models/DogAccess');
const featureFlags = require('../config/featureFlags');

// Permisos por acción.
const ACTION_ROLES = {
  'dog.read':   ['owner', 'editor', 'viewer'],
  'dog.write':  ['owner', 'editor'],
  'dog.share':  ['owner'],
  'dog.revoke': ['owner'],
  'dog.delete': ['owner'],
};

/**
 * Resuelve si `actorUserId` puede ejecutar `action` sobre `dogId`.
 *
 * Con flag apagado usa el fallback de propietario único (behavior actual).
 * Con flag activo consulta DogAccess y deniega si no hay membresía activa
 * con el rol adecuado.
 *
 * @param {object} opts
 * @param {string|import('mongoose').Types.ObjectId} opts.actorUserId
 * @param {string|import('mongoose').Types.ObjectId} opts.dogId
 * @param {string} opts.action  - una de las claves de ACTION_ROLES
 * @param {string|import('mongoose').Types.ObjectId} [opts.ownerUserId]
 *   - solo requerido para el fallback (cuando el flag está apagado)
 * @returns {Promise<{allowed: boolean, role: string|null, reason: string|null}>}
 */
async function resolveDogAccess({ actorUserId, dogId, action, ownerUserId }) {
  const allowedRoles = ACTION_ROLES[action];
  if (!allowedRoles) {
    return { allowed: false, role: null, reason: 'unknown_action' };
  }

  // ── Fallback: flag apagado → lógica actual (dueño único) ────────────────
  if (!featureFlags.multiTutorEnabled) {
    // El caller debe pasar ownerUserId (el userId del documento User que tiene el perro).
    const isOwner = ownerUserId && String(ownerUserId) === String(actorUserId);
    return {
      allowed: isOwner && allowedRoles.includes('owner'),
      role: isOwner ? 'owner' : null,
      reason: isOwner ? null : 'not_owner',
    };
  }

  // ── Flag activo: consultar DogAccess ────────────────────────────────────
  const entry = await DogAccess.findOne({
    dogId,
    memberUserId: actorUserId,
    status: 'active',
  }).lean();

  if (!entry) {
    return { allowed: false, role: null, reason: 'no_membership' };
  }

  const allowed = allowedRoles.includes(entry.role);
  return {
    allowed,
    role: entry.role,
    reason: allowed ? null : 'insufficient_role',
  };
}

module.exports = { resolveDogAccess, ACTION_ROLES };
