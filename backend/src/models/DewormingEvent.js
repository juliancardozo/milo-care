'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const dewormingEventSchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, ref: 'Dog', index: true },
    productName: { type: String, required: true, trim: true },
    parasiteType: { type: String, enum: ['internal', 'external', 'both'], default: 'internal' },
    administeredAt: { type: Date, default: null },
    nextDueAt: { type: Date, default: null, index: true },
    vetName: { type: String, trim: true },
    status: { type: String, default: 'suggested' },
    source: { type: String, default: 'suggested' },
    requiresVetValidation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DewormingEvent', dewormingEventSchema);
