'use strict';

const validator = require('validator');
const { searchBreed, getBreed, validateBreedWeight } = require('./BreedDatabaseService');
const { detectSevereSymptoms } = require('./RedFlagDetector');

const ALLOWED_COUNTRIES = ['AR', 'UY'];
const ALLOWED_LIFE_STAGES = ['neonatal', 'early_puppy', 'late_puppy', 'young_adult', 'adult', 'senior', 'unknown'];

function validationResult(errors = [], warnings = []) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function validateOwner(payload = {}) {
  const errors = [];
  const warnings = [];
  const owner = {
    name: String(payload.name || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    phone: String(payload.phone || '').trim(),
    country: String(payload.country || '').trim().toUpperCase(),
    city: String(payload.city || '').trim(),
    timezone: String(payload.timezone || '').trim(),
    disclaimerAccepted: Boolean(payload.disclaimerAccepted),
  };

  if (!owner.name) errors.push('Owner name is required.');
  if (!owner.email || !validator.isEmail(owner.email)) errors.push('A valid email address is required.');
  if (!owner.country || !ALLOWED_COUNTRIES.includes(owner.country)) errors.push('Country must be AR or UY.');
  if (!owner.disclaimerAccepted) errors.push('The veterinarian disclaimer must be accepted before continuing.');

  return { ...validationResult(errors, warnings), owner };
}

function validateBirthDate(birthDate, estimatedAgeMonths) {
  const errors = [];
  const warnings = [];
  let normalizedBirthDate = null;

  if (birthDate) {
    const parsed = new Date(birthDate);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('Birth date must be a valid date.');
    } else if (parsed > new Date()) {
      errors.push('Birth date cannot be in the future.');
    } else {
      normalizedBirthDate = parsed;
    }
  } else if (estimatedAgeMonths !== null && estimatedAgeMonths !== undefined) {
    warnings.push('Birth date missing. Using estimated age for planning only.');
  } else {
    warnings.push('Birth date is missing. The calendar will require veterinarian validation.');
  }

  return {
    ...validationResult(errors, warnings),
    birthDate: normalizedBirthDate,
  };
}

function validateDogBasics(payload = {}) {
  const errors = [];
  const warnings = [];
  const name = String(payload.name || '').trim();
  const breed = String(payload.breed || '').trim();
  const size = String(payload.size || '').trim().toLowerCase();
  const sex = String(payload.sex || 'unknown').trim().toLowerCase();
  const birthDateConfidence = String(payload.birthDateConfidence || 'exact').trim().toLowerCase();
  const confidence = ['exact', 'estimated', 'unknown'].includes(birthDateConfidence) ? birthDateConfidence : 'exact';
  const ageValidation = validateBirthDate(payload.birthDate, payload.estimatedAgeMonths);
  const breedInfo = getBreed(breed);
  const weightKg = payload.weightKg === '' || payload.weightKg === null || payload.weightKg === undefined ? null : Number(payload.weightKg);
  const weightValidation = validateBreedWeight(breed, Number.isFinite(weightKg) ? weightKg : null);

  if (!name) errors.push('Dog name is required.');
  if (!breed) errors.push('Breed is required.');
  if (!size) warnings.push('Dog size is missing. The breed lookup will be used as a suggestion.');
  if (sex && !['male', 'female', 'unknown'].includes(sex)) errors.push('Sex must be male, female, or unknown.');
  if (weightKg !== null && (!Number.isFinite(weightKg) || weightKg <= 0)) errors.push('Weight must be a positive number.');
  if (breed && !breedInfo) warnings.push('Breed not found in the local database. The size suggestion may be approximate.');
  if (weightValidation.warning) warnings.push(weightValidation.warning);
  if (birthDateConfidence === 'estimated' && !payload.estimatedAgeMonths) {
    warnings.push('Estimated age confidence was selected but no estimated age was provided.');
  }

  return {
    ...validationResult([...errors, ...ageValidation.errors], [...warnings, ...ageValidation.warnings]),
    dog: {
      name,
      breed,
      size: size || (breedInfo?.size || 'medium'),
      sex: sex || 'unknown',
      neutered: Boolean(payload.neutered),
      weightKg: Number.isFinite(weightKg) ? weightKg : null,
      microchipId: String(payload.microchipId || '').trim(),
      birthDateConfidence: confidence,
      estimatedAgeMonths: payload.estimatedAgeMonths === '' || payload.estimatedAgeMonths === null || payload.estimatedAgeMonths === undefined
        ? null
        : Number(payload.estimatedAgeMonths),
      birthDate: ageValidation.birthDate,
    },
    suggestedSize: breedInfo?.size || weightValidation.suggestedSize || 'medium',
    weightWarning: weightValidation.warning,
  };
}

function validateClinicalHistory(payload = {}) {
  const symptoms = payload.recentSymptoms || payload.symptoms || {};
  const redFlags = detectSevereSymptoms(symptoms);
  const warnings = [];
  const errors = [];

  if (redFlags.hasSevere) {
    errors.push('Severe symptoms detected. Please consult a veterinarian before continuing.');
  }

  return {
    ...validationResult(errors, warnings),
    redFlags,
  };
}

function validateLifestyle(payload = {}) {
  const flags = Object.entries(payload)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);

  return validationResult([], flags.length ? [] : ['Lifestyle data is incomplete.']);
}

function validateStep(stepKey, payload = {}) {
  switch (stepKey) {
    case 'owner':
      return validateOwner(payload);
    case 'dog-basic':
      return validateDogBasics(payload);
    case 'clinical-history':
      return validateClinicalHistory(payload);
    case 'lifestyle':
      return validateLifestyle(payload);
    case 'vaccines':
    case 'deworming':
    case 'summary':
    case 'confirm':
      return validationResult([], []);
    default:
      return validationResult(['Unknown onboarding step.'], []);
  }
}

function validateUniqueEmail(email, userEmail) {
  if (!email) return validationResult(['Email is required.'], []);
  if (!validator.isEmail(email)) return validationResult(['A valid email address is required.'], []);
  if (userEmail && String(email).trim().toLowerCase() !== String(userEmail).trim().toLowerCase()) {
    return validationResult(['The onboarding email must match the current account email.'], []);
  }
  return validationResult([], []);
}

function calculateAgeInMonths(birthDate) {
  if (!birthDate) return null;
  const dob = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(dob.getTime())) return null;
  const diffMs = Date.now() - dob.getTime();
  return Math.max(0, Math.floor(diffMs / (30.4375 * 24 * 60 * 60 * 1000)));
}

function lifeStageFromAgeMonths(ageMonths) {
  if (ageMonths === null || ageMonths === undefined) return 'unknown';
  if (ageMonths < 2) return 'neonatal';
  if (ageMonths < 4) return 'early_puppy';
  if (ageMonths < 6) return 'late_puppy';
  if (ageMonths < 18) return 'young_adult';
  if (ageMonths < 84) return 'adult';
  return 'senior';
}

module.exports = {
  ALLOWED_COUNTRIES,
  ALLOWED_LIFE_STAGES,
  validateOwner,
  validateDogBasics,
  validateClinicalHistory,
  validateLifestyle,
  validateStep,
  validateUniqueEmail,
  validateBirthDate,
  calculateAgeInMonths,
  lifeStageFromAgeMonths,
};
