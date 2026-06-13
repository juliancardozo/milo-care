'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const featureFlags = require('../config/featureFlags');
const { resolveDogAccess } = require('../services/dogAccessPolicy');
const {
  listMembers, inviteMember, acceptInvite, updateMemberRole, revokeMember,
} = require('../services/dogMembershipService');
const User = require('../models/User');

const router = express.Router({ mergeParams: true });

// Guarda que todos los endpoints requieren multi-tutor habilitado.
router.use((_req, res, next) => {
  if (!featureFlags.multiTutorEnabled) {
    return res.status(503).json({ code: 'FEATURE_DISABLED', message: 'Multi-tutor is not enabled.' });
  }
  return next();
});

// Carga owner + dog y verifica acción requerida.
async function loadAndAuthorize(req, res, action) {
  const ownerUser = await User.findOne({ 'dogs._id': req.params.dogId });
  if (!ownerUser) {
    res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    return null;
  }
  const dog = ownerUser.dogs.id(req.params.dogId);
  if (!dog) {
    res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    return null;
  }
  const { allowed, reason } = await resolveDogAccess({
    actorUserId: req.user.id,
    dogId: req.params.dogId,
    action,
    ownerUserId: ownerUser._id,
  });
  if (!allowed) {
    const status = reason === 'no_membership' ? 404 : 403;
    const code   = reason === 'no_membership' ? 'DOG_NOT_FOUND' : 'FORBIDDEN';
    res.status(status).json({ code, message: 'Access denied.' });
    return null;
  }
  return { ownerUser, dog };
}

// GET /api/dogs/:dogId/members
router.get('/', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadAndAuthorize(req, res, 'dog.share');
    if (!ctx) return;
    const members = await listMembers({ dogId: req.params.dogId });
    return res.json({ members });
  } catch (err) { next(err); }
});

// POST /api/dogs/:dogId/members/invite
router.post('/invite', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadAndAuthorize(req, res, 'dog.share');
    if (!ctx) return;

    const { inviteEmail, role } = req.body || {};
    const baseUrl = (process.env.APP_URL || 'http://localhost:5173').replace(/\/+$/, '');

    const { access, plainToken } = await inviteMember({
      dogId: req.params.dogId,
      ownerUserId: ctx.ownerUser._id,
      inviteEmail,
      role,
    });

    const acceptUrl = `${baseUrl}/dogs/${req.params.dogId}/invite/accept?token=${plainToken}`;
    return res.status(201).json({ active: false, status: 'pending', inviteEmail: access.inviteEmail, role: access.role, acceptUrl });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ code: 'VALIDATION_ERROR', message: err.message });
    next(err);
  }
});

// POST /api/dogs/:dogId/members/accept
router.post('/accept', authenticate, async (req, res, next) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'token is required.' });

    const access = await acceptInvite({ actorUserId: req.user.id, plainToken: token });
    return res.json({ active: true, dogId: access.dogId, role: access.role, acceptedAt: access.acceptedAt });
  } catch (err) {
    if (err.status) {
      const statusMap = { 404: 'NOT_FOUND', 409: 'CONFLICT', 410: 'EXPIRED' };
      return res.status(err.status).json({ code: statusMap[err.status] || 'ERROR', message: err.message });
    }
    next(err);
  }
});

// PATCH /api/dogs/:dogId/members/:memberUserId
router.patch('/:memberUserId', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadAndAuthorize(req, res, 'dog.share');
    if (!ctx) return;

    const { role } = req.body || {};
    const access = await updateMemberRole({
      dogId: req.params.dogId,
      memberUserId: req.params.memberUserId,
      newRole: role,
    });
    return res.json({ memberUserId: access.memberUserId, role: access.role });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ code: 'VALIDATION_ERROR', message: err.message });
    next(err);
  }
});

// DELETE /api/dogs/:dogId/members/:memberUserId
router.delete('/:memberUserId', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadAndAuthorize(req, res, 'dog.revoke');
    if (!ctx) return;

    await revokeMember({
      dogId: req.params.dogId,
      memberUserId: req.params.memberUserId,
      revokedByUserId: req.user.id,
    });
    return res.json({ active: false, memberUserId: req.params.memberUserId });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ code: 'VALIDATION_ERROR', message: err.message });
    next(err);
  }
});

module.exports = router;
