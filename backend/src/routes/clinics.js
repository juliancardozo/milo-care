'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const Clinic = require('../models/Clinic');
const User = require('../models/User');
const clinicService = require('../services/clinicService');

// Gestión de clínicas — sólo admin/adminVet. En el piloto el alta la hace el admin.
const router = express.Router();
router.use(authenticate, adminAuth);

// POST /api/admin/clinics — crea una clínica (y opcionalmente su vet dueño).
router.post('/', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name is required.' });
    }
    const { clinic, ownerVet } = await clinicService.createClinic(req.body, { source: 'admin' });
    return res.status(201).json({
      clinic,
      link: clinicService.clinicLink(clinic),
      whatsappCopy: clinicService.whatsappCopy(clinic),
      ownerVet: ownerVet ? { id: ownerVet._id, email: ownerVet.email, role: ownerVet.role } : null,
    });
  } catch (err) {
    if (err.statusCode === 400) return res.status(400).json({ code: 'VALIDATION_ERROR', message: err.message });
    if (err.code === 11000) return res.status(409).json({ code: 'CONFLICT', message: 'Clinic slug already exists.' });
    return next(err);
  }
});

// GET /api/admin/clinics — lista con conteo de referidos por clínica.
router.get('/', async (_req, res, next) => {
  try {
    const clinics = await Clinic.find().sort({ createdAt: -1 }).lean();
    const counts = await User.aggregate([
      { $match: { acquisitionClinicId: { $ne: null } } },
      { $group: { _id: '$acquisitionClinicId', total: { $sum: 1 } } },
    ]);
    const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.total]));
    return res.json({
      clinics: clinics.map((c) => ({
        ...c,
        link: `${(process.env.APP_URL || 'https://milocare.org').replace(/\/+$/, '')}/c/${c.slug}`,
        referidos: byId[String(c._id)] || 0,
      })),
    });
  } catch (err) {
    return next(err);
  }
});

// GET /api/admin/clinics/:id/panel — el admin puede ver el panel de cualquier clínica.
router.get('/:id/panel', async (req, res, next) => {
  try {
    const clinic = await Clinic.findById(req.params.id);
    if (!clinic) return res.status(404).json({ code: 'NOT_FOUND', message: 'Clinic not found.' });
    const panel = await clinicService.computePanel(clinic, { now: new Date() });
    return res.json(panel);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
