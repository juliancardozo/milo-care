'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * UsageRecord — metering B2B2C: si una mascota atribuida a un partner fue "activa"
 * (ver services/petActivity.isPetActive) en un mes calendario. Una fila por
 * (partner, perro, mes). El job mensual lo upsertea de forma idempotente.
 */
const usageRecordSchema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    month: { type: String, required: true }, // 'YYYY-MM'
    isActive: { type: Boolean, default: false },
    computedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

usageRecordSchema.index({ partnerId: 1, dogId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('UsageRecord', usageRecordSchema);
