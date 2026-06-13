'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Event log — columna vertebral del activo de datos (data-model v1 §2).
 *
 * Append-only: nunca se editan ni borran eventos individualmente. Única excepción:
 * el borrado total de cuenta (GDPR) elimina por `userId`.
 *
 * El payload está validado contra el catálogo tipado (core/events/catalog.js):
 * solo enums, números, booleanos y códigos controlados. Nada de texto libre, PII,
 * fotos ni nombres — eso vive en los documentos de dominio (capa privada).
 */

const eventSchema = new Schema(
  {
    type: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    dogId: { type: Schema.Types.ObjectId, default: null },
    // Adjuntado por el bus solo si el usuario tiene opt-in de zona vigente.
    zoneId: { type: String, default: null, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
    ts: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false, minimize: false }
);

module.exports = mongoose.model('Event', eventSchema);
