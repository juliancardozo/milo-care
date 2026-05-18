'use strict';

const express = require('express');
const router = express.Router();

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// POST /api/signup — free email capture
router.post('/signup', (req, res) => {
  const { email, nombre_cachorro } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Email inválido.' });
  }
  // TODO: wire up email provider (Resend / Mailchimp / Loops / ConvertKit)
  console.log('[signup] new lead:', { email: email.trim(), nombre_cachorro });
  res.status(200).json({ ok: true });
});

// POST /api/founder-interest — Founder Plan waitlist
router.post('/founder-interest', (req, res) => {
  const { email, name } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ code: 'INVALID_EMAIL', message: 'Email inválido.' });
  }
  // TODO: wire up payment provider (Stripe / Mercado Pago) and notify team via Resend/Slack
  console.log('[founder-interest] new founder:', { email: email.trim(), name });
  res.status(200).json({ ok: true });
});

module.exports = router;
