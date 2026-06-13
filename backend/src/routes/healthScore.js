'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const DailyCheckin = require('../models/DailyCheckin');
const { computeStreak } = require('../services/checkinAnalytics');
const { localDateString } = require('../utils/localTime');
const { computeHealthScore } = require('../services/healthScore');

// mergeParams: accede a :dogId desde la ruta padre montada en app.js.
const router = express.Router({ mergeParams: true });

// GET /api/dogs/:dogId/health-score
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const dog = user.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

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
