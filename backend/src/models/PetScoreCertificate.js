'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Snapshot de un ítem atestado al momento de emitir (sin exponer dato clínico
// crudo: solo tipo, etiqueta y clínica que lo certificó).
const attestedItemSnapshot = new Schema(
  { kind: String, label: String, clinicName: { type: String, default: null } },
  { _id: false }
);

/**
 * PetScoreCertificate — snapshot INMUTABLE del Health Score + nivel de confianza
 * de un perro en un momento dado. No se reescribe: emitir uno nuevo "supersede" al
 * anterior. Es la base verificable para compartir el NIVEL (no el dato clínico) con
 * una aseguradora, siempre con consentimiento explícito del tutor.
 */
const petScoreCertificateSchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Snapshot del score (para el tutor; NO se comparte con la aseguradora).
    scoreSnapshot: { score: Number, grade: String },
    confidenceLevel: { type: String, enum: ['self', 'verified', 'certified'], required: true },
    certifiedBy: { type: String, default: null }, // clínica
    attestedCount: { type: Number, default: 0 },
    attestedItems: { type: [attestedItemSnapshot], default: [] },
    issuedAt: { type: Date, default: Date.now },
    validUntil: { type: Date, default: null },
    status: { type: String, enum: ['active', 'superseded', 'expired', 'revoked'], default: 'active', index: true },
    revocationReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PetScoreCertificate', petScoreCertificateSchema);
