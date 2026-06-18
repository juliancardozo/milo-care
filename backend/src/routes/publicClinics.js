'use strict';

const express = require('express');
const clinicService = require('../services/clinicService');

// Lectura pública de una clínica por slug — para el co-branding del onboarding.
// Sin autenticación; sólo expone datos de marca (nombre, logo, ciudad).
const router = express.Router();

router.get('/:slug', async (req, res, next) => {
  try {
    const clinic = await clinicService.resolveBySlug(req.params.slug);
    if (!clinic) return res.status(404).json({ code: 'NOT_FOUND', message: 'Clinic not found.' });
    return res.json({ clinic: clinicService.publicView(clinic) });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
