'use strict';

const express = require('express');
const Lead = require('../models/Lead');

const router = express.Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// POST /api/signup — free email capture
router.post('/signup', async (req, res, next) => {
  const { email, nombre_cachorro } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Email inválido.' });
  }
  try {
    await Lead.create({ email: email.trim(), tipo: 'signup', nombreMascota: nombre_cachorro || '' });
    // TODO: wire up email provider (Resend / Mailchimp / Loops / ConvertKit)
    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/founder-interest — Founder Plan waitlist
router.post('/founder-interest', async (req, res, next) => {
  const { email, name } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Email inválido.' });
  }
  try {
    await Lead.create({ email: email.trim(), tipo: 'founder', nombre: name || '' });
    // TODO: wire up payment provider and notify team
    return res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
