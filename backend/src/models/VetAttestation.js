'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * VetAttestation — atestación discreta de un veterinario sobre UN hecho clínico
 * verificable del perro (una vacuna, una desparasitación). NO certifica el Health
 * Score (que sigue siendo nuestro cálculo): le pone un sello de confianza encima.
 *
 * Nivel de confianza derivado (ver services/petScoreVerification):
 *   - sin atestaciones            → 'self'      (auto-reportado)
 *   - atestación por link (token) → 'verified'  (un vet validó, sin clínica identificada)
 *   - atestación con clínica      → 'certified' (vet matriculado + clínica identificada)
 *
 * Inmutable salvo `status` (active → revoked/expired). El perro vive embebido en
 * User, por eso guardamos `ownerUserId` (doc contenedor) + `dogId` (subdoc).
 */
const vetAttestationSchema = new Schema(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },

    // Hecho atestado: tipo + id del subdoc del expediente que lo respalda.
    kind: { type: String, enum: ['vaccination', 'deworming'], required: true },
    itemId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String, trim: true, default: '' },

    // Identidad del certificador. null/null = atestación anónima por token → 'verified'.
    vetUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    clinicId: { type: Schema.Types.ObjectId, ref: 'Clinic', default: null, index: true },
    clinicName: { type: String, trim: true, default: null },
    source: { type: String, enum: ['token', 'vet_account'], default: 'token' },

    attestedAt: { type: Date, default: Date.now },
    // Vigencia: atada al refuerzo del ítem (nextDueDate) o, en su defecto, 1 año.
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active', index: true },
  },
  { timestamps: true }
);

// Una atestación activa por (perro, ítem): re-validar refresca, no duplica.
vetAttestationSchema.index({ dogId: 1, kind: 1, itemId: 1, status: 1 });

module.exports = mongoose.model('VetAttestation', vetAttestationSchema);
