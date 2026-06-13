'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Proyección de acceso multi-tutor. Un documento por (dogId, memberUserId).
// Los perros siguen embebidos en User; este modelo solo registra quién puede
// acceder a cuál perro y con qué rol.
//
// La colección se crea al primer insert: no requiere migración del schema de User.

const dogAccessSchema = new Schema(
  {
    // ID del subdocumento dog dentro del User propietario.
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    // User dueño canónico del perro.
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // User con acceso (puede coincidir con ownerUserId para rol owner).
    memberUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: {
      type: String,
      enum: ['owner', 'editor', 'viewer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'revoked'],
      default: 'active',
    },
    // Campos de ciclo de vida de invitación (solo presentes cuando status=pending).
    inviteEmail: { type: String, lowercase: true, trim: true, default: null },
    inviteTokenHash: { type: String, default: null },
    inviteExpiresAt: { type: Date, default: null },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Unicidad: un usuario no puede tener dos accesos activos/pendientes al mismo perro.
dogAccessSchema.index({ dogId: 1, memberUserId: 1 }, { unique: true });

module.exports = mongoose.model('DogAccess', dogAccessSchema);
