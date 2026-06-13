'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Registro de vínculo / "Álbum" del perro (Fase 2).
 *
 * Separado del historial médico a propósito: es la capa cálida tipo feed
 * (logros, travesuras, momentos), no datos clínicos. Por eso vive en su propia
 * colección y no en User.dogs[].symptoms[].
 */

const KINDS = ['logro', 'travesura', 'momento'];

const behaviorLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    kind: { type: String, enum: KINDS, required: true },
    title: { type: String, trim: true, required: true, maxlength: 120 },
    note: { type: String, trim: true, default: '', maxlength: 1000 },
    photoUrl: { type: String, trim: true, default: null },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

behaviorLogSchema.index({ dogId: 1, date: -1 });

module.exports = mongoose.model('BehaviorLog', behaviorLogSchema);
module.exports.KINDS = KINDS;
