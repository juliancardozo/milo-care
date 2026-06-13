'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Hito alcanzado por un perro (Fase 3). Un documento por (perro, hito) — el índice
 * único garantiza que cada hito se celebre y persista una sola vez.
 */

const milestoneSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    key: { type: String, required: true },
    type: { type: String, required: true },
    value: { type: Schema.Types.Mixed, default: {} },
    detectedAt: { type: Date, default: Date.now },
    shownAt: { type: Date, default: null },
    sharedAt: { type: Date, default: null },
    sharedAction: { type: String, enum: ['shared', 'downloaded', null], default: null },
  },
  { timestamps: true }
);

milestoneSchema.index({ dogId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Milestone', milestoneSchema);
