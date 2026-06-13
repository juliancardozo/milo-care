'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const referralService = require('../services/referralService');
const analytics = require('../services/analyticsService');

const router = express.Router();

// GET /api/referrals/me — código del usuario + lista de referidos y su estado
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const hadCode = Boolean(user.referralCode);
    const data = await referralService.getForUser(user);
    if (!hadCode) await user.save(); // persistir el código recién generado

    return res.json(data);
  } catch (err) {
    next(err);
  }
});

// POST /api/referrals/shared — marca que el usuario compartió su link (telemetría)
router.post('/shared', authenticate, async (req, res) => {
  analytics.track('referral_link_shared', { userId: req.user.id, channel: req.body?.channel || 'app' });
  return res.json({ ok: true });
});

module.exports = router;
