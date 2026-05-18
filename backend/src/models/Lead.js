'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    tipo: { type: String, enum: ['signup', 'founder'], required: true },
    nombreMascota: { type: String, trim: true, default: '' },
    nombre: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

leadSchema.index({ email: 1, tipo: 1 });

module.exports = mongoose.model('Lead', leadSchema);
