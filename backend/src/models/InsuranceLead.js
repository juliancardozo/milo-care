'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * InsuranceLead — captura "¿necesito un seguro?": el tutor pide cotización y se
 * dispara un webhook al partner. `webhookDeliveredAt` registra la entrega exitosa.
 */
const insuranceLeadSchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', default: null, index: true },
    intent: { type: String, enum: ['wants_quote'], default: 'wants_quote' },
    contact: { type: Schema.Types.Mixed, default: {} }, // email/teléfono que el tutor consintió compartir
    status: { type: String, enum: ['new', 'delivered', 'failed', 'converted'], default: 'new' },
    webhookDeliveredAt: { type: Date, default: null },
    webhookAttempts: { type: Number, default: 0 },
    // Conversión a póliza (CPA): la reporta el partner por la API v1.
    convertedAt: { type: Date, default: null, index: true },
    externalPolicyRef: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InsuranceLead', insuranceLeadSchema);
