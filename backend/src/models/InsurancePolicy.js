'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// Ítem de cobertura estructurado. `carenciaDays` = período de carencia desde el alta.
const coverageItemSchema = new Schema(
  {
    item: { type: String, required: true, trim: true }, // ej. 'accidente', 'cirugia', 'consulta'
    covered: { type: Boolean, default: true },
    limit: { type: Number, default: null },
    currency: { type: String, enum: ['ARS', 'UYU', 'USD'], default: 'UYU' },
    carenciaDays: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

/**
 * InsurancePolicy — póliza de mascota vinculada a un perro (y a un partner
 * aseguradora). El helper de cobertura (CoverageService) lee `coverage` para
 * orientar al tutor — nunca es vinculante.
 */
const insurancePolicySchema = new Schema(
  {
    dogId: { type: Schema.Types.ObjectId, required: true, index: true },
    ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner', default: null, index: true },
    policyNumber: { type: String, trim: true, default: '' },
    productName: { type: String, trim: true, default: '' },
    coverage: { type: [coverageItemSchema], default: [] },
    reimbursementModel: { type: String, enum: ['reimbursement', 'direct'], default: 'reimbursement' },
    startDate: { type: Date, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
