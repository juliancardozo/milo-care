'use strict';

const crypto = require('crypto');
const validator = require('validator');
const User = require('../models/User');
const CoTutorInvite = require('../models/CoTutorInvite');

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 días

function httpError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function newToken() {
  return crypto.randomBytes(24).toString('base64url');
}

// Hash determinístico (no bcrypt) para poder buscar por token sin userId en la URL.
// El token tiene suficiente entropía para que SHA-256 sin sal sea seguro acá.
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function appUrl() {
  return (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function inviteUrl(token) {
  return `${appUrl()}/invite/${token}`;
}

/**
 * Crea (o reemplaza) una invitación de co-tutor para un perro. Solo el dueño,
 * y solo si es Premium efectivo. Devuelve el token en claro (para el email).
 *
 * @returns {Promise<{ token, url, isNewUser, inviteeEmail }>}
 */
async function createInvite({ ownerUser, dog, email }) {
  if (!ownerUser.isPremiumActive()) {
    throw httpError(403, 'PREMIUM_REQUIRED', 'Co-tutores is a Premium feature.');
  }
  const inviteeEmail = String(email || '').toLowerCase().trim();
  if (!inviteeEmail || !validator.isEmail(inviteeEmail)) {
    throw httpError(400, 'VALIDATION_ERROR', 'A valid email is required.');
  }
  if (inviteeEmail === ownerUser.email) {
    throw httpError(400, 'CANNOT_INVITE_SELF', 'You cannot invite yourself.');
  }

  // ¿El invitado ya tiene cuenta? Define la variante del email y permite detectar
  // si ya es co-tutor de este perro.
  const existingUser = await User.findOne({ email: inviteeEmail });
  if (existingUser && dog.caregivers.some((c) => String(c.userId) === String(existingUser._id))) {
    throw httpError(409, 'ALREADY_COTUTOR', 'This person is already a co-tutor of this dog.');
  }

  // Una sola invitación pendiente por perro+email: limpiamos las previas.
  await CoTutorInvite.deleteMany({ dogId: dog._id, inviteeEmail, status: 'pending' });

  const token = newToken();
  await CoTutorInvite.create({
    ownerId: ownerUser._id,
    dogId: dog._id,
    dogName: dog.name,
    inviterName: ownerUser.name,
    inviteeEmail,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  return { token, url: inviteUrl(token), isNewUser: !existingUser, inviteeEmail };
}

/**
 * Acepta una invitación con el usuario `user` (ya creado/logueado). Valida token,
 * vigencia y que el email del usuario coincida con el invitado. Materializa el
 * caregiver embebido en el perro del dueño.
 *
 * @returns {Promise<{ dogId, dogName, ownerName }>}
 */
async function acceptInvite({ token, user }) {
  if (!token) throw httpError(400, 'VALIDATION_ERROR', 'A token is required.');

  const invite = await CoTutorInvite.findOne({ tokenHash: hashToken(token), status: 'pending' });
  if (!invite) throw httpError(404, 'INVITE_NOT_FOUND', 'Invitation not found or already used.');
  if (invite.expiresAt <= new Date()) throw httpError(410, 'INVITE_EXPIRED', 'This invitation has expired.');
  if (invite.inviteeEmail !== user.email) {
    throw httpError(403, 'INVITE_EMAIL_MISMATCH', 'This invitation was sent to a different email.');
  }

  const owner = await User.findById(invite.ownerId);
  const dog = owner && owner.dogs.id(invite.dogId);
  if (!dog) {
    invite.status = 'revoked';
    await invite.save();
    throw httpError(404, 'DOG_NOT_FOUND', 'The shared dog no longer exists.');
  }

  // Idempotente: si ya es caregiver, no duplicamos.
  if (!dog.caregivers.some((c) => String(c.userId) === String(user._id))) {
    dog.caregivers.push({ userId: user._id });
    await owner.save();
  }

  invite.status = 'accepted';
  invite.acceptedBy = user._id;
  invite.acceptedAt = new Date();
  await invite.save();

  return { dogId: String(dog._id), dogName: dog.name, ownerName: owner.name };
}

/**
 * Previsualiza una invitación por token (para la pantalla /invite antes de
 * aceptar). No la consume.
 */
async function peekInvite(token) {
  if (!token) return null;
  const invite = await CoTutorInvite.findOne({ tokenHash: hashToken(token), status: 'pending' });
  if (!invite || invite.expiresAt <= new Date()) return null;
  const exists = await User.exists({ email: invite.inviteeEmail });
  return {
    dogName: invite.dogName,
    inviterName: invite.inviterName,
    inviteeEmail: invite.inviteeEmail,
    isNewUser: !exists,
  };
}

/**
 * Lista co-tutores aceptados + invitaciones pendientes de un perro (vista del dueño).
 */
async function listForDog(dog) {
  const userIds = dog.caregivers.map((c) => c.userId);
  const users = userIds.length
    ? await User.find({ _id: { $in: userIds } }).select('name email')
    : [];
  const byId = new Map(users.map((u) => [String(u._id), u]));

  const cotutores = dog.caregivers.map((c) => {
    const u = byId.get(String(c.userId));
    return { userId: String(c.userId), name: u?.name || '', email: u?.email || '', addedAt: c.addedAt };
  });

  const pending = await CoTutorInvite.find({ dogId: dog._id, status: 'pending' }).select('inviteeEmail createdAt expiresAt');
  return {
    cotutores,
    pending: pending.map((p) => ({ email: p.inviteeEmail, invitedAt: p.createdAt, expiresAt: p.expiresAt })),
  };
}

/**
 * Revoca el acceso de un co-tutor (o una invitación pendiente por email).
 * Solo el dueño.
 */
async function revoke({ ownerUser, dog, userId, email }) {
  let changed = false;
  if (userId) {
    const before = dog.caregivers.length;
    dog.caregivers = dog.caregivers.filter((c) => String(c.userId) !== String(userId));
    if (dog.caregivers.length !== before) { await ownerUser.save(); changed = true; }
  }
  if (email) {
    const res = await CoTutorInvite.updateMany(
      { dogId: dog._id, inviteeEmail: String(email).toLowerCase().trim(), status: 'pending' },
      { $set: { status: 'revoked' } }
    );
    if (res.modifiedCount > 0) changed = true;
  }
  return changed;
}

module.exports = {
  createInvite,
  acceptInvite,
  peekInvite,
  listForDog,
  revoke,
  inviteUrl,
  hashToken,
};
