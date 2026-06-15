'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const DailyCheckin = require('../models/DailyCheckin');
const { computeStreak } = require('../services/checkinAnalytics');
const { localDateString } = require('../utils/localTime');
const { computeHealthScore } = require('../services/healthScore');

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
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
