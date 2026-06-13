'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Check-in diario de bienestar de un perro.
 *
 * A diferencia del resto de la data de salud (embebida en User.dogs[]), los
 * check-ins son una serie temporal de crecimiento ilimitado (uno por perro/día),
 * por lo que viven en su propia colección. La unicidad diaria se garantiza con
 * un índice compuesto único sobre { dogId, localDate }.
 */

const QUESTIONS = ['comida', 'energia', 'agua', 'animo', 'digestion'];
const ANSWERS = ['bien', 'regular', 'mal'];

const dailyCheckinSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    // Fecha local del usuario en formato YYYY-MM-DD (no UTC) — ver utils/localTime.
    localDate: { type: String, required: true },
    question: { type: String, enum: QUESTIONS, required: true },
    answer: { type: String, enum: ANSWERS, required: true },
    note: { type: String, trim: true, default: '', maxlength: 500 },
    channel: { type: String, enum: ['app', 'email'], default: 'app' },
  },
  { timestamps: true }
);

// Un solo check-in por perro por día local.
dailyCheckinSchema.index({ dogId: 1, localDate: 1 }, { unique: true });

module.exports = mongoose.model('DailyCheckin', dailyCheckinSchema);
module.exports.QUESTIONS = QUESTIONS;
module.exports.ANSWERS = ANSWERS;
