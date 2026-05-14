'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const riskProfileSchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, ref: 'Dog', index: true },
    level: { type: String, enum: ['low', 'medium', 'high'], required: true },
    score: { type: Number, required: true },
    factors: [{ type: String, trim: true }],
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('RiskProfile', riskProfileSchema);
