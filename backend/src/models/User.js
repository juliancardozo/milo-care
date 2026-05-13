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
    status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

const symptomSchema = new Schema(
  {
    symptomType: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    dateObserved: { type: Date, required: true },
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
    vaccinations: [vaccinationSchema],
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
