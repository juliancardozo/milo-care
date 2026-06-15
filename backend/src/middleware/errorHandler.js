'use strict';

class TierLimitError extends Error {
  constructor(message = 'Tier limit exceeded.') {
    super(message);
    this.name = 'TierLimitError';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  constructor(message = 'Validation failed.', details = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  if (err.name === 'TierLimitError') {
    return res.status(403).json({ code: 'TIER_LIMIT_EXCEEDED', message: err.message });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({ code: 'NOT_FOUND', message: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: err.message, details: err.details });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError' && err.errors) {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Validation failed.', details });
  }

  // Body parser: payload demasiado grande (p. ej. foto sin comprimir)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return res.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The uploaded content is too large. Please use a smaller image.',
    });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({ code: 'EMAIL_ALREADY_EXISTS', message: `${field} already exists.` });
  }

  // Errores de dominio con status/code explícitos (p. ej. CoTutorService).
  if (typeof err.status === 'number' && typeof err.code === 'string') {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }

  console.error('[ErrorHandler]', err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
}

module.exports = { errorHandler, TierLimitError, NotFoundError, ValidationError };
