'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const onboardingSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    owner: {
      name: { type: String, trim: true, default: '' },
      email: { type: String, trim: true, lowercase: true, default: '' },
      phone: { type: String, trim: true, default: '' },
      country: { type: String, enum: ['AR', 'UY'], default: 'AR' },
      city: { type: String, trim: true, default: '' },
      timezone: { type: String, trim: true, default: '' },
      disclaimerAccepted: { type: Boolean, default: false },
    },
    dog: {
      name: { type: String, trim: true, default: '' },
      photoUrl: { type: String, trim: true, default: null },
      birthDate: { type: Date, default: null },
      birthDateConfidence: { type: String, enum: ['exact', 'estimated', 'unknown'], default: 'exact' },
      estimatedAgeMonths: { type: Number, default: null },
      breed: { type: String, trim: true, default: '' },
      size: { type: String, trim: true, default: '' },
      sex: { type: String, enum: ['male', 'female', 'unknown'], default: 'unknown' },
      neutered: { type: Boolean, default: false },
      weightKg: { type: Number, default: null },
      microchipId: { type: String, trim: true, default: '' },
    },
    clinical: {
      hasVeterinarian: { type: Boolean, default: false },
      veterinarianName: { type: String, trim: true, default: '' },
      allergies: [{ type: String, trim: true }],
      conditions: [{ type: String, trim: true }],
      currentMedications: [{ type: String, trim: true }],
      previousVaccineReactions: { type: String, trim: true, default: '' },
      recentSymptoms: { type: Schema.Types.Mixed, default: {} },
    },
    lifestyle: { type: Schema.Types.Mixed, default: {} },
    vaccines: { type: Schema.Types.Mixed, default: [] },
    deworming: { type: Schema.Types.Mixed, default: [] },
    redFlags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['draft', 'blocked', 'confirmed', 'expired'],
      default: 'draft',
      index: true,
    },
    expiresAt: { type: Date, required: true },
    resultSummary: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

onboardingSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OnboardingSession', onboardingSessionSchema);
