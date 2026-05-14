'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const { getCatalog } = require('../config/vaccineCatalog');
const { getCatalog: getApptCatalog, GROUP_LABELS } = require('../config/appointmentCatalog');

const router = express.Router();

const GROUP_LABELS = {
  core_mandatory: 'Obligatoria SENASA / MGAP',
  core: 'Core — todos los perros (WSAVA)',
  regional_core: 'Core regional — riesgo ambiental',
  elective: 'Electiva — riesgo específico',
};

// GET /api/vaccines/catalog?country=AR
router.get('/catalog', authenticate, (req, res) => {
  const country = req.query.country || 'AR';
  const vaccines = getCatalog(country);

  // Group for easier consumption by the frontend combo
  const grouped = {};
  for (const v of vaccines) {
    if (!grouped[v.group]) grouped[v.group] = { label: GROUP_LABELS[v.group] || v.group, vaccines: [] };
    grouped[v.group].vaccines.push({
      id: v.id,
      name: v.name,
      shortName: v.shortName,
      antigens: v.antigens,
      senasaRequired: v.senasaRequired,
      wsavaClassification: v.wsavaClassification,
      schedule: v.schedule,
      notes: v.notes,
      route: v.route,
      riskFactors: v.riskFactors || [],
    });
  }

  return res.json({ country, groups: grouped });
});

// GET /api/vaccines/appointments/catalog
router.get('/appointments/catalog', authenticate, (_req, res) => {
  const appointments = getApptCatalog();
  const grouped = {};
  for (const a of appointments) {
    if (!grouped[a.group]) grouped[a.group] = { label: GROUP_LABELS[a.group] || a.group, items: [] };
    grouped[a.group].items.push({
      id: a.id,
      name: a.name,
      isWsavaRecommended: a.isWsavaRecommended,
      urgency: a.urgency,
      frequency: a.frequency,
      checklist: a.checklist,
      notes: a.notes,
      colorClass: a.colorClass,
    });
  }
  return res.json({ groups: grouped });
});

module.exports = router;
