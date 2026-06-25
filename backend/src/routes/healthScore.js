'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const DailyCheckin = require('../models/DailyCheckin');
const { computeStreak } = require('../services/checkinAnalytics');
const { localDateString } = require('../utils/localTime');
const { computeHealthScore } = require('../services/healthScore');
const { deriveVerification } = require('../services/petScoreVerification');
const VetAttestation = require('../models/VetAttestation');
const featureFlags = require('../config/featureFlags');

// mergeParams: accede a :dogId desde la ruta padre montada en app.js.
const router = express.Router({ mergeParams: true });

// GET /api/dogs/:dogId/health-score
router.get('/', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const now = new Date();
    const tz = user.notificationPreferences?.timezone || 'America/Argentina/Buenos_Aires';
    const checkinDates = await DailyCheckin.find({ dogId: dog._id }).select('localDate').lean();
    const streak = computeStreak(checkinDates.map((d) => d.localDate), localDateString(tz, now));

    const result = computeHealthScore(dog, { now, streak });

    // Sello de confianza encima del score (no altera el número). Derivado de las
    // atestaciones discretas del vet sobre vacunas/desparasitación.
    let verification = deriveVerification([], now);
    if (featureFlags.vetSealEnabled) {
      const attestations = await VetAttestation.find({ dogId: dog._id }).lean();
      verification = deriveVerification(attestations, now);
    }

    return res.json({ ...result, verification });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
