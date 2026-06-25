'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * BillingRecord — factura mensual al partner = setupFee (una vez) + activePets *
 * pricePerActivePet. Una fila por (partner, mes). En el MVP genera el reporte/
 * factura; el cobro automático al partner queda fuera de alcance.
 */
const billingRecordSchema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    month: { type: String, required: true }, // 'YYYY-MM'
    setupFeeApplied: { type: Number, default: 0 },
    activePets: { type: Number, default: 0 },
    pricePerActivePet: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    currency: { type: String, enum: ['ARS', 'UYU', 'USD'], default: 'USD' },
    status: { type: String, enum: ['draft', 'issued', 'paid', 'failed'], default: 'issued' },
    // Cobro automático al partner.
    chargedAt: { type: Date, default: null },
    chargeRef: { type: String, default: null }, // id del pago en el proveedor
    chargeError: { type: String, default: null },
    chargeAttempts: { type: Number, default: 0 },
  },
  { timestamps: true }
);

billingRecordSchema.index({ partnerId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('BillingRecord', billingRecordSchema);
