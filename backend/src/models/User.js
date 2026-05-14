'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Sub-schemas ──────────────────────────────────────────────────────────────

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
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled', 'vencido', 'pending_vet_validation'],
      default: 'suggested',
    },
    source: { type: String, enum: ['manual', 'suggested', 'imported'], default: 'manual' },
    requiresVetValidation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const dewormingSchema = new Schema(
  {
    productName: { type: String, required: true, trim: true },
    parasiteType: {
      type: String,
      enum: ['internal', 'external', 'both'],
      default: 'internal',
    },
    dateAdministered: { type: Date, default: null },
    nextDueDate: { type: Date, default: null },
    nextReminderAt: { type: Date, default: null, index: true },
    veterinarian: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled', 'vencido', 'pending_vet_validation'],
      default: 'suggested',
    },
    source: { type: String, enum: ['manual', 'suggested', 'imported'], default: 'manual' },
    requiresVetValidation: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const medicationSchema = new Schema(
  {
    medicationName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    frequencyHours: {
      type: Number,
      required: true,
      min: 1,
      max: 168,
      validate: { validator: Number.isInteger, message: 'frequencyHours must be an integer' },
    },
    nextReminderAt: { type: Date, required: true, index: true },
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const appointmentSchema = new Schema(
  {
    clinicName: { type: String, required: true, trim: true },
    appointmentDate: { type: Date, required: true },
    reminderAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled'],
      default: 'suggested',
    },
    notes: { type: String, trim: true },
    source: { type: String, enum: ['manual', 'suggested', 'imported'], default: 'manual' },
  },
  { timestamps: true }
);

const symptomSchema = new Schema(
  {
    symptomType: { type: String, trim: true, default: '' },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    severity: { type: String, enum: ['mild', 'moderate', 'severe'], default: 'mild' },
    dateObserved: { type: Date, required: true },
    notes: { type: String, trim: true, default: '' },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const dogSchema = new Schema(
  {
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
    birthDateConfidence: {
      type: String,
      enum: ['exact', 'estimated', 'unknown'],
      default: 'exact',
    },
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
    medications: [medicationSchema],
    appointments: [appointmentSchema],
    symptoms: [symptomSchema],
  },
  { timestamps: true }
);

const notificationPreferencesSchema = new Schema(
  {
    enabled: { type: Boolean, default: true },
    vaccinationWindowDays: {
      type: Number,
      default: 7,
      min: 1,
      max: 30,
      validate: { validator: Number.isInteger, message: 'Must be an integer' },
    },
    appointmentWindowHours: {
      type: Number,
      default: 24,
      min: 1,
      max: 168,
      validate: { validator: Number.isInteger, message: 'Must be an integer' },
    },
  },
  { _id: false }
);

// ── User schema ───────────────────────────────────────────────────────────────

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    tier: { type: String, enum: ['free', 'premium'], default: 'free' },
    reminderWindowPreference: {
      type: Number,
      default: null,
      min: 1,
      max: 60,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: 'reminderWindowPreference must be an integer between 1 and 60',
      },
    },
    notificationPreferences: { type: notificationPreferencesSchema, default: () => ({}) },
    dogs: [dogSchema],
  },
  { timestamps: true }
);

// Never return passwordHash in JSON responses
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
