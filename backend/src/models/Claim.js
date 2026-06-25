'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Evento del historial enlazado al reclamo (referencia liviana al subdoc del perro).
const linkedEventSchema = new Schema(
  {
    kind: { type: String, enum: ['vaccination', 'deworming', 'medication', 'appointment', 'symptom', 'consultation'], required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String, trim: true, default: '' },
    date: { type: Date, default: null },
  },
  { _id: false }
);

/**
 * Claim — borrador de reclamo (Claims Assistant v0). Arma desde el historial un
 * resumen ORDENADO de eventos para presentar a la aseguradora. Es informativo:
 * no diagnostica ni decide cobertura; la decisión es de la aseguradora.
 */
const claimSchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    policyId: { type: Schema.Types.ObjectId, ref: 'InsurancePolicy', default: null },
    type: { type: String, enum: ['accident', 'illness'], required: true },
    linkedEvents: { type: [linkedEventSchema], default: [] },
    documents: { type: [String], default: [] }, // urls de adjuntos
    generatedSummary: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'submitted', 'closed'], default: 'draft' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Claim', claimSchema);
