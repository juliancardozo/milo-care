'use strict';

const OnboardingSession = require('../models/OnboardingSession');
const User = require('../models/User');
const TierService = require('./TierService');
const { ValidationError, NotFoundError } = require('../middleware/errorHandler');
const {
  validateStep,
  validateOwner,
  validateDogBasics,
  validateClinicalHistory,
  calculateAgeInMonths,
  lifeStageFromAgeMonths,
} = require('./ValidationService');
const { calculate } = require('./RiskProfileCalculator');
const { buildCalendar } = require('./CalendarEngine');

function normalizeList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item).trim());
  return [String(value).trim()].filter(Boolean);
}

function safeDate(date) {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function startSession(userId, ownerDefaults = {}) {
  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  const session = await OnboardingSession.create({
    userId,
    owner: {
      name: user.name || '',
      email: user.email || '',
      phone: ownerDefaults.phone || '',
      country: ownerDefaults.country || 'AR',
      city: ownerDefaults.city || '',
      timezone: ownerDefaults.timezone || '',
      disclaimerAccepted: false,
    },
    expiresAt,
  });

  return session;
}

async function getSession(sessionId, userId) {
  const session = await OnboardingSession.findOne({ _id: sessionId, userId });
  if (!session) throw new NotFoundError('Onboarding session not found.');
  return session;
}

async function saveStep(sessionId, userId, stepKey, payload) {
  const session = await getSession(sessionId, userId);
  const result = validateStep(stepKey, payload);
  if (!result.valid) {
    throw new ValidationError('Onboarding step validation failed.', result.errors);
  }

  if (stepKey === 'owner') {
    const ownerResult = validateOwner(payload);
    if (!ownerResult.valid) throw new ValidationError('Onboarding step validation failed.', ownerResult.errors);
    session.owner = {
      ...session.owner.toObject?.() || session.owner,
      ...ownerResult.owner,
    };
    session.owner.disclaimerAccepted = ownerResult.owner.disclaimerAccepted;
  }

  if (stepKey === 'dog-basic') {
    const dogResult = validateDogBasics(payload);
    if (!dogResult.valid) throw new ValidationError('Onboarding step validation failed.', dogResult.errors);
    session.dog = {
      ...session.dog.toObject?.() || session.dog,
      ...dogResult.dog,
      birthDate: dogResult.dog.birthDate || safeDate(payload.birthDate),
    };
  }

  if (stepKey === 'clinical-history') {
    const clinicalResult = validateClinicalHistory(payload);
    if (!clinicalResult.valid) throw new ValidationError('Onboarding step validation failed.', clinicalResult.errors);
    session.clinical = {
      ...(session.clinical.toObject?.() || session.clinical),
      hasVeterinarian: Boolean(payload.hasVeterinarian),
      veterinarianName: String(payload.veterinarianName || '').trim(),
      allergies: normalizeList(payload.allergies),
      conditions: normalizeList(payload.conditions),
      currentMedications: normalizeList(payload.currentMedications),
      previousVaccineReactions: String(payload.previousVaccineReactions || '').trim(),
      recentSymptoms: payload.recentSymptoms || payload.symptoms || {},
    };
    session.redFlags = clinicalResult.redFlags.findings || [];
    if (clinicalResult.redFlags.hasSevere) {
      session.status = 'blocked';
    }
  }

  if (stepKey === 'lifestyle') {
    session.lifestyle = {
      ...(session.lifestyle.toObject?.() || session.lifestyle),
      ...payload,
    };
  }

  if (stepKey === 'vaccines') {
    session.vaccines = payload.vaccines || payload.records || [];
  }

  if (stepKey === 'deworming') {
    session.deworming = payload.deworming || payload.records || [];
  }

  session.markModified('owner');
  session.markModified('dog');
  session.markModified('clinical');
  session.markModified('lifestyle');
  session.markModified('vaccines');
  session.markModified('deworming');
  await session.save();
  return session;
}

function buildDraft(session) {
  const ageMonths = calculateAgeInMonths(session.dog?.birthDate || null);
  const riskProfile = calculate(session.lifestyle || {});
  const dog = {
    ...session.dog.toObject?.() || session.dog,
    ageMonths,
    lifeStage: session.dog?.lifeStage || lifeStageFromAgeMonths(ageMonths),
    riskProfile: riskProfile.level,
  };

  return {
    sessionId: session._id,
    owner: session.owner,
    dog,
    clinical: session.clinical,
    lifestyle: session.lifestyle,
    vaccines: session.vaccines,
    deworming: session.deworming,
    redFlags: session.redFlags || [],
    status: session.status,
    expiresAt: session.expiresAt,
    riskProfile,
  };
}

async function getDraft(sessionId, userId) {
  const session = await getSession(sessionId, userId);
  return buildDraft(session);
}

async function getSummary(sessionId, userId) {
  const session = await getSession(sessionId, userId);
  const draft = buildDraft(session);
  const calendar = buildCalendar(
    {
      name: draft.dog.name,
      breed: draft.dog.breed,
      dateOfBirth: draft.dog.birthDate,
      birthDate: draft.dog.birthDate,
      birthDateConfidence: draft.dog.birthDateConfidence,
      countryProfile: draft.owner.country,
      city: draft.owner.city,
      timezone: draft.owner.timezone,
      sex: draft.dog.sex,
      neutered: draft.dog.neutered,
      weightKg: draft.dog.weightKg,
      microchipId: draft.dog.microchipId,
      lifeStage: draft.dog.lifeStage,
      riskProfile: draft.riskProfile.level,
      hasVeterinarian: Boolean(draft.clinical?.hasVeterinarian),
      veterinarianName: draft.clinical?.veterinarianName,
      vaccinations: draft.vaccines,
      dewormingHistory: draft.deworming,
      appointments: [],
      lifestyle: draft.lifestyle,
    },
    {
      riskProfile: draft.riskProfile,
      existingVaccines: draft.vaccines,
      existingDeworming: draft.deworming,
      existingAppointments: [],
    }
  );

  return {
    ...draft,
    calendar,
    missingData: calendar.missingData,
  };
}

async function confirmSession(sessionId, userId, options = {}) {
  const session = await getSession(sessionId, userId);

  // The route-level disclaimerConfirmed overrides the stored flag.
  // This handles cases where the owner step was saved before the disclaimer
  // checkbox was ticked but the user explicitly confirmed at the final step.
  const ownerPayload = options.disclaimerConfirmed
    ? { ...((session.owner.toObject?.() || session.owner)), disclaimerAccepted: true }
    : (session.owner.toObject?.() || session.owner);

  const ownerResult = validateOwner(ownerPayload);
  const dogResult = validateDogBasics({
    ...(session.dog || {}),
    birthDate: session.dog?.birthDate,
  });
  const clinicalResult = validateClinicalHistory(session.clinical || {});

  if (!ownerResult.valid) throw new ValidationError('Owner data is incomplete.', ownerResult.errors);
  if (!dogResult.valid) throw new ValidationError('Dog data is incomplete.', dogResult.errors);
  if (!options.allowPendingVetValidation && clinicalResult.redFlags?.hasSevere) {
    throw new ValidationError('Severe symptoms must be reviewed by a veterinarian before confirmation.', clinicalResult.errors);
  }

  const user = await User.findById(userId);
  if (!user) throw new NotFoundError('User not found.');
  TierService.assertCanAddDog(user);

  const summary = await getSummary(sessionId, userId);
  const calendar = summary.calendar;
  const dogAgeMonths = calculateAgeInMonths(dogResult.dog.birthDate);
  const dogLifeStage = lifeStageFromAgeMonths(dogAgeMonths);

  const dogDoc = {
    name: dogResult.dog.name,
    breed: dogResult.dog.breed,
    dateOfBirth: dogResult.dog.birthDate || new Date(),
    photoUrl: session.dog?.photoUrl || null,
    countryProfile: ownerResult.owner.country,
    city: ownerResult.owner.city,
    timezone: ownerResult.owner.timezone,
    sex: dogResult.dog.sex,
    neutered: dogResult.dog.neutered,
    weightKg: dogResult.dog.weightKg,
    microchipId: dogResult.dog.microchipId,
    birthDateConfidence: dogResult.dog.birthDateConfidence,
    estimatedAgeMonths: dogResult.dog.estimatedAgeMonths,
    lifeStage: dogLifeStage,
    riskProfile: calendar.riskProfile.level,
    allergies: normalizeList(session.clinical?.allergies),
    conditions: normalizeList(session.clinical?.conditions),
    lifestyle: session.lifestyle || {},
    hasVeterinarian: Boolean(session.clinical?.hasVeterinarian),
    veterinarianName: session.clinical?.veterinarianName || '',
    onboardingCompleted: true,
    onboardingCompletedAt: new Date(),
    vaccinations: calendar.vaccines.map((item) => ({
      vaccineName: item.vaccineType,
      dateAdministered: item.administeredAt || new Date(),
      nextDueDate: item.nextDueAt || null,
      nextReminderAt: item.nextDueAt || null,
      veterinarian: item.vetName || '',
      notes: item.notes || '',
      lotNumber: item.lotNumber || '',
      documentUrl: item.documentUrl || null,
      status: item.status || 'suggested',
      source: item.source || 'suggested',
      requiresVetValidation: Boolean(item.requiresVetValidation),
    })),
    dewormingHistory: calendar.deworming.map((item) => ({
      productName: item.productName,
      parasiteType: item.parasiteType || 'internal',
      dateAdministered: item.administeredAt || null,
      nextDueDate: item.nextDueAt || null,
      nextReminderAt: item.nextDueAt || null,
      veterinarian: item.vetName || '',
      notes: item.notes || '',
      status: item.status || 'suggested',
      source: item.source || 'suggested',
      requiresVetValidation: Boolean(item.requiresVetValidation),
    })),
    appointments: calendar.appointments.map((item) => ({
      clinicName: item.clinicName || 'Veterinario de confianza',
      appointmentDate: item.scheduledAt || item.reminderAt || new Date(),
      reminderAt: item.reminderAt || null,
      status: item.status || 'suggested',
      notes: item.notes || '',
      source: item.source || 'suggested',
    })),
  };

  user.dogs.push(dogDoc);
  session.status = 'confirmed';
  session.resultSummary = {
    dogName: dogDoc.name,
    riskProfile: calendar.riskProfile,
    remindersScheduled: calendar.vaccines.length + calendar.deworming.length + calendar.appointments.length,
  };
  await user.save();
  await session.deleteOne();

  const savedDog = user.dogs[user.dogs.length - 1];
  return {
    dog: savedDog,
    calendar,
    summary: session.resultSummary,
  };
}

module.exports = {
  startSession,
  saveStep,
  getDraft,
  getSummary,
  confirmSession,
  buildDraft,
};
