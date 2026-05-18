'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const vaccinationSchema = new Schema(
  {
    vaccineName: { type: String, required: true, trim: true },
    catalogId: { type: String, trim: true, default: null },
    isCalendarRequired: { type: Boolean, default: false },
    antigenGroup: { type: String, trim: true, default: '' },
    administrationRoute: { type: String, trim: true, default: '' },
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
    title: { type: String, trim: true, default: '' },
    catalogId: { type: String, trim: true, default: null },
    isWsavaRecommended: { type: Boolean, default: false },
    appointmentType: { type: String, trim: true, default: '' },
    checklist: [{ type: String, trim: true }],
    clinicName: { type: String, trim: true, default: '' },
    vetName: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    appointmentDate: { type: Date, required: true },
    isCancelled: { type: Boolean, default: false },
    reminderAt: { type: Date, default: null, index: true },
    status: {
      type: String,
      enum: ['suggested', 'upcoming', 'programado', 'completed', 'cancelled'],
      default: 'upcoming',
    },
    notes: { type: String, trim: true, default: '' },
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

const consultationSchema = new Schema(
  {
    vetName: { type: String, trim: true, default: '' },
    clinicName: { type: String, trim: true, default: '' },
    reason: { type: String, required: true, trim: true },
    dateOfConsult: { type: Date, required: true },
    findings: { type: String, trim: true, default: '' },
    recommendations: { type: String, trim: true, default: '' },
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
    consultations: [consultationSchema],
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
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
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

// Migrate legacy appointments that have clinicName but no title (created before
// the title field was added). Runs on every save so no one-off migration script
// is needed.
userSchema.pre('validate', function () {
  for (const dog of this.dogs || []) {
    for (const appt of dog.appointments || []) {
      if (!appt.title) {
        appt.title = appt.clinicName || 'Consulta';
      }
    }
  }
});

module.exports = mongoose.model('User', userSchema);
