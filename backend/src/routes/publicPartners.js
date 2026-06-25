'use strict';

const express = require('express');
const Partner = require('../models/Partner');

const router = express.Router();

// GET /api/public/partners/by-slug/:slug/theme
// Público (sin auth): el frontend resuelve el branding white-label por slug/subdominio.
// Si no existe o el partner está pausado → 404 y el frontend cae al branding Milo Care.
router.get('/by-slug/:slug/theme', async (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').toLowerCase().trim();
    const partner = await Partner.findOne({ slug, status: 'active' }).select('name slug type branding');
    if (!partner) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Partner not found.' });
    }

    const b = partner.branding || {};
    return res.json({
      slug: partner.slug,
      type: partner.type,
      branding: {
        appName: b.appName || partner.name,
        logoUrl: b.logoUrl || null,
        primaryColor: b.primaryColor || null,
        secondaryColor: b.secondaryColor || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
