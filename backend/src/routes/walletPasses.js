'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const featureFlags = require('../config/featureFlags');
const GoogleWalletService = require('../services/GoogleWalletService');

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

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const dog = user.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const saveUrl = GoogleWalletService.generateSaveUrl(user, dog);
    return res.json({ saveUrl });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
