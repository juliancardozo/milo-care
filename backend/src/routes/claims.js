'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const Claim = require('../models/Claim');
const DogAccess = require('../services/DogAccess');

const router = express.Router();

// GET /api/claims/:id — detalle de un reclamo (solo si el solicitante accede al perro).
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const claim = await Claim.findById(req.params.id).lean();
    if (!claim) return res.status(404).json({ code: 'NOT_FOUND', message: 'Claim not found.' });

    // Autorización: el solicitante debe tener acceso al perro del reclamo.
    const found = await DogAccess.resolveDog(req.user.id, claim.dogId);
    if (!found) return res.status(404).json({ code: 'NOT_FOUND', message: 'Claim not found.' });

    return res.json(claim);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
