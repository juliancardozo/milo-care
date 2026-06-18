'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const authenticate = require('../middleware/auth');
const requireVet = require('../middleware/requireVet');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const clinicService = require('../services/clinicService');
const referralService = require('../services/referralService');

const router = express.Router();
const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, tier: user.tier, role: user.role || 'user' },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── POST /api/vet-portal/register ────────────────────────────────────────────
// Autoservicio del vet. Construido y disponible, pero secundario: en el piloto
// el alta la hace el admin. Crea User(role:'vet') + Clinic.
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, clinicName } = req.body;
    if (!name || !email || !password || !clinicName) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name, email, password and clinicName are required.' });
    }
    if (!validator.isEmail(email)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid email format.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Password must be at least 8 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', message: 'This email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const ownerVet = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: 'vet',
      referralCode: await referralService.generateUniqueCode(),
    });

    const { clinic } = await clinicService.createClinic(
      { ...req.body, name: clinicName, ownerEmail: ownerVet.email },
      { source: 'self' }
    );
    // createClinic encontró al vet por email y lo dejó como owner.

    const token = signToken(ownerVet);
    return res.status(201).json({
      token,
      user: { id: ownerVet._id, name: ownerVet.name, email: ownerVet.email, role: ownerVet.role },
      clinic,
      link: clinicService.clinicLink(clinic),
    });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ code: 'CONFLICT', message: 'Clinic slug already exists.' });
    return next(err);
  }
});

// ── GET /api/vet-portal/panel ────────────────────────────────────────────────
// Panel del vet logueado: resuelve su clínica y devuelve las métricas de impacto.
router.get('/panel', authenticate, requireVet, async (req, res, next) => {
  try {
    const clinic = await Clinic.findOne({ ownerVetUserId: req.user.id });
    if (!clinic) return res.status(404).json({ code: 'NO_CLINIC', message: 'No clinic linked to this vet account.' });
    const panel = await clinicService.computePanel(clinic, { now: new Date() });
    return res.json(panel);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
