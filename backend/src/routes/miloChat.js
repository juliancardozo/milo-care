'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const MiloBotService = require('../services/MiloBotService');

const router = express.Router();

// Límite anti-abuso: es un endpoint público que gasta tokens de la API.
const miloLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 min
  max: 40, // 40 mensajes por IP cada 5 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'RATE_LIMITED', message: 'Demasiados mensajes. Probá de nuevo en un rato 🐾' },
});

const MAX_MESSAGES = 40;
const MAX_CONTENT_CHARS = 2000;

function validateMessages(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return 'messages debe ser un array no vacío.';
  if (raw.length > MAX_MESSAGES) return `Demasiados mensajes (máx ${MAX_MESSAGES}).`;
  for (const m of raw) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) {
      return "Cada mensaje necesita role 'user' o 'assistant'.";
    }
    if (typeof m.content !== 'string' || m.content.trim() === '') {
      return 'Cada mensaje necesita content de texto no vacío.';
    }
    if (m.content.length > MAX_CONTENT_CHARS) {
      return `Un mensaje supera el máximo de ${MAX_CONTENT_CHARS} caracteres.`;
    }
  }
  if (raw[raw.length - 1].role !== 'user') {
    return 'El último mensaje debe ser del usuario.';
  }
  return null;
}

// POST /api/milo-chat — un turno de conversación con Milo.
router.post('/', miloLimiter, async (req, res, next) => {
  if (!MiloBotService.isEnabled()) {
    return res.status(503).json({ code: 'MILO_DISABLED', message: 'El asistente no está disponible.' });
  }

  const { messages } = req.body || {};
  const validationError = validateMessages(messages);
  if (validationError) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: validationError });
  }

  try {
    const { reply, lead } = await MiloBotService.chat(
      messages.map((m) => ({ role: m.role, content: m.content.trim() })),
    );
    return res.status(200).json({ reply, lead });
  } catch (err) {
    console.error('[MiloBot] error en /api/milo-chat:', err.message);
    return next(err);
  }
});

module.exports = router;
