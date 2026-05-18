'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const validateOnboardingStep = require('../middleware/validateOnboardingStep');
const { ValidationError } = require('../middleware/errorHandler');
const OnboardingSession = require('../models/OnboardingSession');
const User = require('../models/User');
const {
  startSession,
  saveStep,
  getDraft,
  getSummary,
  confirmSession,
} = require('../services/OnboardingService');
const { validateUniqueEmail, ALLOWED_COUNTRIES } = require('../services/ValidationService');

const router = express.Router();

router.post('/start', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const owner = req.body?.owner || {};
    if (owner.country && !ALLOWED_COUNTRIES.includes(String(owner.country).toUpperCase())) {
      throw new ValidationError('Country must be AR or UY.', ['Country must be AR or UY.']);
    }

    const emailValidation = validateUniqueEmail(owner.email || user.email, user.email);
    if (!emailValidation.valid) {
      throw new ValidationError('Owner validation failed.', emailValidation.errors);
    }

    const existing = await OnboardingSession.findOne({ userId: req.user.id, status: { $in: ['draft', 'blocked'] } }).sort({ createdAt: -1 });
    if (existing && existing.expiresAt > new Date()) {
      return res.json({
        sessionId: existing._id,
        stepIndex: 0,
        stepKey: 'owner',
        expiresAt: existing.expiresAt,
        resumed: true,
      });
    }

    const session = await startSession(req.user.id, owner);
    return res.status(201).json({
      sessionId: session._id,
      stepIndex: 0,
      stepKey: 'owner',
      expiresAt: session.expiresAt,
      resumed: false,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId/draft', authenticate, async (req, res, next) => {
  try {
    const draft = await getDraft(req.params.sessionId, req.user.id);
    return res.json(draft);
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId/summary', authenticate, async (req, res, next) => {
  try {
    const summary = await getSummary(req.params.sessionId, req.user.id);
    return res.json(summary);
  } catch (err) {
    next(err);
  }
});

router.post('/:sessionId/confirm', authenticate, async (req, res, next) => {
  try {
    const disclaimerConfirmed = Boolean(req.body?.disclaimerConfirmed);
    if (!disclaimerConfirmed) {
      throw new ValidationError('The disclaimer must be confirmed before finalizing onboarding.', [
        'The disclaimer must be confirmed before finalizing onboarding.',
      ]);
    }

    const result = await confirmSession(req.params.sessionId, req.user.id, {
      allowPendingVetValidation: Boolean(req.body?.allowPendingVetValidation),
      disclaimerConfirmed: disclaimerConfirmed,
    });

    return res.status(201).json({
      success: true,
      dog: {
        id: result.dog._id,
        name: result.dog.name,
        onboardingCompletedAt: result.dog.onboardingCompletedAt,
      },
      calendar: {
        vaccineEvents: result.calendar.vaccines,
        dewormingEvents: result.calendar.deworming,
        appointments: result.calendar.appointments,
        pendingVetValidation: result.calendar.missingData.length > 0 || result.calendar.riskProfile.level === 'high',
      },
      remindersScheduled: result.summary.remindersScheduled,
      nextSteps: result.calendar.missingData.length
        ? ['complete_missing_profile_data', 'consult_trusted_veterinarian']
        : ['review_dashboard_reminders'],
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:sessionId/:stepKey', authenticate, validateOnboardingStep, async (req, res, next) => {
  try {
    const { sessionId, stepKey } = req.params;

    const saved = await saveStep(sessionId, req.user.id, stepKey, req.body || {});

    return res.json({
      valid: true,
      warnings: req.onboardingValidation?.warnings || [],
      redFlagsDetected: (saved.redFlags || []).length > 0,
      status: saved.status,
      nextStep: stepKey,
      updatedAt: saved.updatedAt,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
