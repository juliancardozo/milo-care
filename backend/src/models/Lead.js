'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const leadSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    // 'bot' = capturado por Milo, el asistente de chat de la landing.
    tipo: { type: String, enum: ['signup', 'founder', 'bot'], required: true },
    nombreMascota: { type: String, trim: true, default: '' },
    nombre: { type: String, trim: true, default: '' },
    // ── Campos opcionales que Milo captura en conversación (solo tipo 'bot') ──
    tipoLead: { type: String, enum: ['tutor', 'veterinario', 'otro'], default: undefined },
    edadPerro: { type: String, trim: true, default: '' },
    ciudadPais: { type: String, trim: true, default: '' },
    dolorPrincipal: {
      type: String,
      enum: ['vacunas', 'medicamentos', 'citas', 'historial', 'sintomas', 'otro'],
      default: undefined,
    },
    interes: {
      type: String,
      enum: ['acceso_anticipado', 'premium', 'clinica_piloto', 'solo_info'],
      default: undefined,
    },
    notas: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
);

leadSchema.index({ email: 1, tipo: 1 });

module.exports = mongoose.model('Lead', leadSchema);
