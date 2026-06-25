'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * PartnerEvent — eventos que el partner empuja por la API v1 (`POST /api/v1/events`).
 * Siempre scoped por `partnerId` (aislamiento multi-tenant).
 */
const partnerEventSchema = new Schema(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', required: true, index: true },
    type: { type: String, required: true, trim: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PartnerEvent', partnerEventSchema);
