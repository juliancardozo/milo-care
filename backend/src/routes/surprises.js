'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const surpriseService = require('../services/surpriseService');

const router = express.Router({ mergeParams: true });

// GET /api/dogs/:dogId/surprise — tira por una sorpresa tras el check-in.
// Se llama DESPUÉS de la confirmación del check-in: nunca bloquea ese flujo.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const surprise = await surpriseService.rollForUser(user, dog);
    return res.json({ surprise: surprise || null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
