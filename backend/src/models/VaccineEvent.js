'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const vaccineEventSchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, ref: 'Dog', index: true },
    vaccineType: { type: String, required: true, trim: true },
    antigens: [{ type: String, trim: true }],
    administeredAt: { type: Date, default: null },
    nextDueAt: { type: Date, default: null, index: true },
    lotNumber: { type: String, trim: true },
    vetName: { type: String, trim: true },
    documentUrl: { type: String, trim: true, default: null },
    status: { type: String, default: 'suggested' },
    source: { type: String, default: 'suggested' },
    requiresVetValidation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VaccineEvent', vaccineEventSchema);
