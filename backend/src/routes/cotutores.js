'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const CoTutorService = require('../services/CoTutorService');
const EmailService = require('../services/EmailService');
const User = require('../models/User');

// ── Gestión (dueño autenticado) — montado en /api/dogs/:dogId/cotutores ──────
const manageRouter = express.Router({ mergeParams: true });

// Solo el dueño gestiona co-tutores (invitar / listar / revocar).
async function loadOwnedDog(req, res) {
  const found = await DogAccess.loadForRequest(req, res);
  if (!found) return null;
  if (found.role !== 'owner') {
    res.status(403).json({ code: 'OWNER_ONLY', message: 'Only the dog owner can manage co-tutors.' });
    return null;
  }
  return found;
}

// GET → co-tutores aceptados + invitaciones pendientes
manageRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const found = await loadOwnedDog(req, res);
    if (!found) return;
    return res.json(await CoTutorService.listForDog(found.dog));
  } catch (err) { next(err); }
});

// POST { email } → genera invitación y manda el email
manageRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const found = await loadOwnedDog(req, res);
    if (!found) return;
    const { owner, dog } = found;

    const { url, isNewUser, inviteeEmail } = await CoTutorService.createInvite({
      ownerUser: owner, dog, email: req.body.email,
    });

    // Fire-and-forget: el email no debe bloquear ni romper la respuesta.
    EmailService.sendCoTutorInvite({
      to: inviteeEmail, inviterName: owner.name, dogName: dog.name, acceptUrl: url, isNewUser,
    }).catch((err) => console.error('[CoTutor] invite email failed:', err.message));

    // Devolvemos la URL para el fallback "copiar link" en la UI (el token se
    // guarda hasheado, así que esta es la única chance de mostrar el link).
    return res.status(201).json({ email: inviteeEmail, isNewUser, url });
  } catch (err) { next(err); }
});

// DELETE /:userId  ó  DELETE /?email=... → revoca co-tutor o invitación pendiente
manageRouter.delete('/:userId?', authenticate, async (req, res, next) => {
  try {
    const found = await loadOwnedDog(req, res);
    if (!found) return;
    const changed = await CoTutorService.revoke({
      ownerUser: found.owner, dog: found.dog, userId: req.params.userId, email: req.query.email,
    });
    if (!changed) return res.status(404).json({ code: 'NOT_FOUND', message: 'Co-tutor or invite not found.' });
    return res.json({ revoked: true });
  } catch (err) { next(err); }
});

// ── Aceptación / preview (token) — montado en /api/cotutores ─────────────────
const acceptRouter = express.Router();

// GET /:token → preview público de la invitación (para la pantalla /invite)
acceptRouter.get('/:token', async (req, res, next) => {
  try {
    const preview = await CoTutorService.peekInvite(req.params.token);
    if (!preview) return res.status(404).json({ code: 'INVITE_NOT_FOUND', message: 'Invitation not found or expired.' });
    return res.json(preview);
  } catch (err) { next(err); }
});

// POST /:token/accept → usuario logueado acepta y queda como co-tutor
acceptRouter.post('/:token/accept', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    const result = await CoTutorService.acceptInvite({ token: req.params.token, user });
    return res.json(result);
  } catch (err) { next(err); }
});

module.exports = { manageRouter, acceptRouter };
