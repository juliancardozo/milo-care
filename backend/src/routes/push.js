'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const pushService = require('../services/pushService');

const router = express.Router();

// GET /api/push/vapid-key — clave pública para suscribirse desde el navegador.
router.get('/vapid-key', (_req, res) => {
  const publicKey = pushService.getPublicKey();
  if (!publicKey) return res.status(503).json({ code: 'PUSH_UNAVAILABLE', message: 'Push not configured.' });
  return res.json({ publicKey });
});

// POST /api/push/subscribe — guarda la suscripción del navegador del usuario.
router.post('/subscribe', authenticate, async (req, res, next) => {
  try {
    const { subscription } = req.body || {};
    await pushService.saveSubscription(req.user.id, subscription, req.headers['user-agent'] || '');
    return res.status(201).json({ ok: true });
  } catch (err) {
    if (err.message === 'Invalid push subscription.') {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: err.message });
    }
    next(err);
  }
});

// POST /api/push/test — envía una notificación de prueba al propio usuario.
router.post('/test', authenticate, async (req, res, next) => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const delivered = await pushService.sendToUser(req.user.id, {
      type: 'test',
      title: '🐾 Milo Care',
      body: '¡Las notificaciones push están funcionando!',
      data: { url: `${appUrl}/dashboard` },
    });
    return res.json({ delivered });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/unsubscribe — elimina la suscripción del usuario.
router.post('/unsubscribe', authenticate, async (req, res, next) => {
  try {
    await pushService.removeSubscription(req.user.id, req.body?.endpoint);
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
