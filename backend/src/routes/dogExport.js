'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const EntitlementService = require('../services/EntitlementService');
const PdfService = require('../services/PdfService');
const ShareService = require('../services/ShareService');
const Partner = require('../models/Partner');

const router = express.Router({ mergeParams: true });

// Resuelve el nombre de app white-label si el perro pertenece a un partner.
async function resolveAppName(dog) {
  if (!dog.partnerId) return 'Milo Care';
  const partner = await Partner.findById(dog.partnerId).select('name branding');
  return partner?.branding?.appName || partner?.name || 'Milo Care';
}

// GET /api/dogs/:dogId/export.pdf
// Carnet/historial en PDF. Gated por entitlement (premium del tutor O patrocinio
// del perro). Sin entitlement → 403 UPGRADE_REQUIRED.
router.get('/export.pdf', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;

    EntitlementService.assertCan(owner, dog, 'pdfExport');

    const appName = await resolveAppName(dog);
    const pdf = await PdfService.generateDogHealthPdf(dog, { appName });

    const safeName = String(dog.name || 'mascota').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="carnet-${safeName}.pdf"`);
    return res.send(pdf);
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs/:dogId/share/whatsapp
// Devuelve { text, link } para compartir el resumen por WhatsApp. Gated igual.
router.post('/share/whatsapp', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner, dog } = found;

    EntitlementService.assertCan(owner, dog, 'whatsappShare');

    const appName = await resolveAppName(dog);
    const share = ShareService.buildWhatsappShare(dog, {
      appName,
      recordUrl: req.body?.recordUrl || null,
    });
    return res.json(share);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
