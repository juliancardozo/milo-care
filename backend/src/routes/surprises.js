'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const surpriseService = require('../services/surpriseService');

const router = express.Router({ mergeParams: true });

// GET /api/dogs/:dogId/surprise — tira por una sorpresa tras el check-in.
// Se llama DESPUÉS de la confirmación del check-in: nunca bloquea ese flujo.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const surprise = await surpriseService.rollForUser(user, dog);
    return res.json({ surprise: surprise || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
