'use strict';

const mongoose = require('mongoose');

/**
 * Clínica veterinaria — entidad del Kit de Activación Veterinaria.
 *
 * Cada clínica tiene un `slug` único usado en el link/QR de atribución
 * (`/c/:slug`). En el piloto las crea el admin/adminVet; el autoservicio del
 * vet queda preparado pero secundario. El vet dueño (rol 'vet') accede a su
 * panel logueándose; `ownerVetUserId` lo vincula a su clínica.
 */
const clinicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    // Identificador del link/QR (ej. "clinica-palermo"). Único, minúsculas.
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },

    // Co-branding mostrado en el onboarding del dueño.
    logoUrl: { type: String, default: null },
    brandColor: { type: String, default: null },

    // Cohorte del experimento — texto libre (flexible, no enum).
    cohort: { type: String, default: null, trim: true },

    // Vet dueño que accede al panel (rol 'vet'). Opcional hasta que se asigne.
    ownerVetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },

    country: { type: String, enum: ['AR', 'UY'], default: 'AR' },
    city: { type: String, default: '', trim: true },
    whatsapp: { type: String, default: '', trim: true },
    contactEmail: { type: String, default: '', lowercase: true, trim: true },

    // Capa 2 del incentivo: días de premium gratis para pacientes de la clínica.
    // 0 = sin incentivo. Default 30 ("mes premium gratis").
    incentivePremiumDays: { type: Number, default: 30, min: 0, max: 365 },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Clinic', clinicSchema);
