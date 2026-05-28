'use strict';

const mongoose = require('mongoose');

// Registra cada evento de webhook procesado para garantizar idempotency.
// El índice único en idempotencyKey asegura que eventos duplicados no muten el estado.
const billingWebhookEventSchema = new mongoose.Schema({
  idempotencyKey: { type: String, required: true, unique: true },
  provider: { type: String, required: true },
  providerEventId: { type: String },
  processingStatus: {
    type: String,
    enum: ['accepted', 'replayed', 'rejected', 'failed'],
    required: true,
  },
  receivedAt: { type: Date, default: Date.now },
  processedAt: { type: Date },
});

module.exports = mongoose.model('BillingWebhookEvent', billingWebhookEventSchema);
