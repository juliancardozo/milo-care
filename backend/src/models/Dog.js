'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const vaccinationSchema = new Schema(
  {
    vaccineName: { type: String, required: true, trim: true },
    dateAdministered: { type: Date, required: true },
    nextDueDate: { type: Date, default: null },
    nextReminderAt: { type: Date, default: null, index: true },
    veterinarian: { type: String, trim: true },
    notes: { type: String, trim: true },
    lotNumber: { type: String, trim: true },
    documentUrl: { type: String, trim: true, default: null },
    status: { type: String, default: 'suggested' },
    source: { type: String, default: 'manual' },
    requiresVetValidation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const dewormingSchema = new Schema(
  {
    productName: { type: String, required: true, trim: true },
    parasiteType: { type: String, enum: ['internal', 'external', 'both'], default: 'internal' },
    dateAdministered: { type: Date, default: null },
    nextDueDate: { type: Date, default: null },
    nextReminderAt: { type: Date, default: null },
    veterinarian: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, default: 'suggested' },
    source: { type: String, default: 'manual' },
    requiresVetValidation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const appointmentSchema = new Schema(
  {
    clinicName: { type: String, trim: true, default: '' },
    appointmentDate: { type: Date, required: true },
    reminderAt: { type: Date, default: null },
    status: { type: String, default: 'suggested' },
    notes: { type: String, trim: true },
    source: { type: String, default: 'manual' },
  },
  { timestamps: true }
);

const dogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    breed: { type: String, required: true, trim: true, maxlength: 100 },
    dateOfBirth: { type: Date, required: true },
    photoUrl: { type: String, trim: true, default: null },
    countryProfile: { type: String, enum: ['AR', 'UY'], default: 'AR' },
    city: { type: String, trim: true, default: '' },
    timezone: { type: String, trim: true, default: '' },
    sex: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
    neutered: { type: Boolean, default: false },
    weightKg: { type: Number, default: null },
    microchipId: { type: String, trim: true, default: null },
    birthDateConfidence: { type: String, enum: ['exact', 'estimated', 'unknown'], default: 'exact' },
    estimatedAgeMonths: { type: Number, default: null },
    lifeStage: { type: String, default: 'unknown' },
    riskProfile: { type: String, enum: ['low', 'medium', 'high', 'unknown'], default: 'unknown' },
    allergies: [{ type: String, trim: true }],
    conditions: [{ type: String, trim: true }],
    lifestyle: { type: Schema.Types.Mixed, default: {} },
    hasVeterinarian: { type: Boolean, default: false },
    veterinarianName: { type: String, trim: true, default: '' },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingCompletedAt: { type: Date, default: null },
    vaccinations: [vaccinationSchema],
    dewormingHistory: [dewormingSchema],
    appointments: [appointmentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Dog', dogSchema);
