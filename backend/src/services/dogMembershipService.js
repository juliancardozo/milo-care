'use strict';

const crypto = require('crypto');
const DogAccess = require('../models/DogAccess');
const User = require('../models/User');

const INVITE_TTL_HOURS = 72;

// Genera token aleatorio y retorna { plainToken, tokenHash }.
function generateInviteToken() {
  const plain = crypto.randomBytes(24).toString('base64url');
  const hash  = crypto.createHash('sha256').update(plain).digest('hex');
  return { plainToken: plain, tokenHash: hash };
}

/**
 * Crea o reenvía una invitación.
 * Si ya existe una membresía activa para ese email lanza error.
 * Si existe una pendiente la renueva.
 *
 * @returns {Promise<{access: DogAccess, plainToken: string}>}
 */
async function inviteMember({ dogId, ownerUserId, inviteEmail, role }) {
  const email = String(inviteEmail || '').toLowerCase().trim();
  if (!email) throw Object.assign(new Error('inviteEmail is required.'), { status: 400 });
  if (!['editor', 'viewer'].includes(role)) {
    throw Object.assign(new Error('role must be editor or viewer.'), { status: 400 });
  }

  // Busca si ya existe el usuario invitado.
  const invitee = await User.findOne({ email }).select('_id').lean();

  // Detectar duplicado activo por userId (si ya tiene cuenta).
  if (invitee) {
    const active = await DogAccess.findOne({
      dogId, memberUserId: invitee._id, status: 'active',
    });
    if (active) {
      throw Object.assign(new Error('User already has active access to this dog.'), { status: 409 });
    }
  }

  const { plainToken, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 3600 * 1000);

  // Intentar reutilizar un pending existente para el mismo email.
  const existing = await DogAccess.findOne({ dogId, inviteEmail: email, status: 'pending' });
  if (existing) {
    existing.inviteTokenHash = tokenHash;
    existing.inviteExpiresAt = expiresAt;
    existing.role = role;
    existing.invitedByUserId = ownerUserId;
    await existing.save();
    return { access: existing, plainToken };
  }

  const access = await DogAccess.create({
    dogId,
    ownerUserId,
    memberUserId: invitee?._id ?? null,
    role,
    status: 'pending',
    inviteEmail: email,
    inviteTokenHash: tokenHash,
    inviteExpiresAt: expiresAt,
    invitedByUserId: ownerUserId,
  });

  return { access, plainToken };
}

/**
 * Acepta una invitación pendiente.
 * Verifica token, expiración y asigna memberUserId si aún era null.
 *
 * @returns {Promise<DogAccess>}
 */
async function acceptInvite({ actorUserId, plainToken }) {
  const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
  const access = await DogAccess.findOne({ inviteTokenHash: tokenHash });

  if (!access) {
    throw Object.assign(new Error('Invite not found.'), { status: 404 });
  }
  if (access.status !== 'pending') {
    throw Object.assign(new Error('Invite is no longer pending.'), { status: 409 });
  }
  if (access.inviteExpiresAt && access.inviteExpiresAt < new Date()) {
    throw Object.assign(new Error('Invite has expired.'), { status: 410 });
  }

  // Detectar colisión: el actor ya tiene acceso activo a este perro.
  const collision = await DogAccess.findOne({
    dogId: access.dogId, memberUserId: actorUserId, status: 'active',
  });
  if (collision) {
    throw Object.assign(new Error('You already have active access to this dog.'), { status: 409 });
  }

  access.status = 'active';
  access.memberUserId = actorUserId;
  access.acceptedAt = new Date();
  access.inviteTokenHash = null;
  access.inviteExpiresAt = null;
  await access.save();

  return access;
}

/**
 * Actualiza el rol de un miembro activo.
 * Solo el owner puede hacer esto.
 */
async function updateMemberRole({ dogId, memberUserId, newRole }) {
  if (!['editor', 'viewer'].includes(newRole)) {
    throw Object.assign(new Error('role must be editor or viewer.'), { status: 400 });
  }
  const access = await DogAccess.findOne({ dogId, memberUserId, status: 'active' });
  if (!access) throw Object.assign(new Error('Member not found.'), { status: 404 });
  if (access.role === 'owner') {
    throw Object.assign(new Error('Cannot change the owner role.'), { status: 403 });
  }
  access.role = newRole;
  await access.save();
  return access;
}

/**
 * Revoca el acceso de un miembro.
 */
async function revokeMember({ dogId, memberUserId, revokedByUserId }) {
  const access = await DogAccess.findOne({
    dogId,
    memberUserId,
    status: { $in: ['active', 'pending'] },
  });
  if (!access) throw Object.assign(new Error('Member not found.'), { status: 404 });
  if (access.role === 'owner') {
    throw Object.assign(new Error('Cannot revoke the owner.'), { status: 403 });
  }
  access.status = 'revoked';
  access.revokedAt = new Date();
  access.revokedByUserId = revokedByUserId;
  await access.save();
  return access;
}

/**
 * Lista miembros activos y pendientes de un perro.
 */
async function listMembers({ dogId }) {
  return DogAccess.find({ dogId, status: { $in: ['active', 'pending'] } })
    .populate('memberUserId', 'name email')
    .lean();
}

module.exports = { inviteMember, acceptInvite, updateMemberRole, revokeMember, listMembers };
