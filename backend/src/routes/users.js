'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const analytics = require('../services/analyticsService');

const router = express.Router();

router.patch('/preferences/reminderWindow', authenticate, async (req, res, next) => {
  try {
    const { reminderWindowDays } = req.body;

    if (!Number.isInteger(reminderWindowDays) || reminderWindowDays < 1 || reminderWindowDays > 60) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'reminderWindowDays must be an integer between 1 and 60.',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    user.reminderWindowPreference = reminderWindowDays;
    await user.save();

    return res.json({ reminderWindowPreference: user.reminderWindowPreference });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/user/location ──────────────────────────────────────────────────
// Opt-in de zona del tutor. Solo país/región/ciudad — NUNCA coordenadas.
router.patch('/location', authenticate, async (req, res, next) => {
  try {
    const { country, region, city } = req.body || {};
    if (!['AR', 'UY'].includes(country)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'country must be AR or UY.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    user.location = {
      country,
      region: region ? String(region).trim().slice(0, 100) : '',
      city: city ? String(city).trim().slice(0, 100) : '',
    };
    user.locationConsentAt = new Date();
    await user.save();

    analytics.track('location_optin', { userId: user._id, meta: { country, region: user.location.region } });

    return res.json({ location: user.location, locationConsentAt: user.locationConsentAt });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/user/location ─────────────────────────────────────────────────
// Borra la zona en 1 tap (y se borra de verdad): deja de emitirse en eventos futuros.
router.delete('/location', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    user.location = null;
    user.locationConsentAt = null;
    await user.save();

    analytics.track('location_deleted', { userId: user._id });

    return res.json({ location: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
