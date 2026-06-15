'use strict';

const express = require('express');
const analytics = require('../services/analyticsService');

const router = express.Router();

// POST /api/notifications/clicked — el Service Worker reporta el clic de un push.
// Público (sin auth): el Service Worker no tiene el JWT. Los identificadores vienen
// en el payload que el backend mismo envió al dispositivo del usuario. Best-effort,
// solo analytics → responde 204 siempre y nunca lanza.
router.post('/clicked', (req, res) => {
  try {
    const { u, d, c } = req.body || {};
    if (u && c) {
      // analytics.track descarta campañas desconocidas (p. ej. push de prueba).
      analytics.track('notification_clicked', { userId: u, dogId: d || null, channel: 'push', meta: { campaign: c } });
    }
  } catch {
    // best-effort; nunca rompe
  }
  return res.status(204).end();
});

module.exports = router;
