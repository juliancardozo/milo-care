'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const DailyCheckin = require('../models/DailyCheckin');
const featureFlags = require('../config/featureFlags');
const GoogleWalletService = require('../services/GoogleWalletService');
const { computeStreak } = require('../services/checkinAnalytics');
const { localDateString } = require('../utils/localTime');

// mergeParams: para acceder a :dogId desde la ruta padre montada en app.js
// (igual que vaccinations/medications/appointments).
const router = express.Router({ mergeParams: true });

// POST /api/dogs/:dogId/wallet-pass
// Genera un pase de Google Wallet (snapshot) para el perro y devuelve { saveUrl }.
// Disponible para todos los usuarios (free y premium).
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!featureFlags.googleWalletEnabled) {
      return res.status(503).json({
        code: 'FEATURE_DISABLED',
        message: 'Google Wallet passes are not enabled.',
      });
    }

    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    // Datos de reconocimiento social para la tarjeta.
    const now = new Date();
    const tz = user.notificationPreferences?.timezone || 'America/Argentina/Buenos_Aires';
    const [checkinDates, totalCheckins] = await Promise.all([
      DailyCheckin.find({ dogId: dog._id }).select('localDate').lean(),
      DailyCheckin.countDocuments({ dogId: dog._id }),
    ]);
    const meta = {
      streak: computeStreak(checkinDates.map((d) => d.localDate), localDateString(tz, now)),
      totalCheckins,
      isPremium: typeof user.isPremiumActive === 'function' ? user.isPremiumActive(now) : user.tier === 'premium',
      memberSince: dog.createdAt || user.createdAt || now,
    };

    const saveUrl = GoogleWalletService.generateSaveUrl(user, dog, now, meta);
    return res.json({ saveUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
