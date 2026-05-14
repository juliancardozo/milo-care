'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const featureFlags = require('../config/featureFlags');
const { resolveWindow } = require('../services/windowResolution');
const { buildEligibleReminderSet } = require('../services/reminderFullList');

const router = express.Router();

router.get('/full', authenticate, async (req, res, next) => {
  try {
    if (!featureFlags.reminderFullListEnabled) {
      return res.status(404).json({ code: 'FEATURE_DISABLED', message: 'Reminder full list is disabled.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    }

    const requestedWindow = req.query.windowDays !== undefined ? Number(req.query.windowDays) : null;
    const includeOverdue = req.query.includeOverdue !== 'false';

    const resolved = resolveWindow({
      tempWindowDays: requestedWindow,
      userPreference: user.reminderWindowPreference,
      now: new Date(),
    });

    const reminders = buildEligibleReminderSet({
      user,
      windowDays: resolved.windowDays,
      includeOverdue,
      now: resolved.appliedAt,
    });

    return res.json({
      reminders,
      total: reminders.length,
      windowDays: resolved.windowDays,
      windowSource: resolved.windowSource,
      appliedAt: resolved.appliedAt,
      ...(resolved.fallbackReason ? { appliedFallback: resolved.fallbackReason } : {}),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
