'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const TierService = require('../services/TierService');
const User = require('../models/User');

const router = express.Router();

/**
 * Calendar-accurate age from a birth date.
 * Returns { years, months (remainder), totalMonths }.
 */
function calcAge(dob) {
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  return { years, months, totalMonths: Math.max(0, years * 12 + months) };
}

/**
 * Human-readable age string in Spanish, respecting birth-date confidence.
 *   exact     → "3 años" / "8 meses"
 *   estimated → "aprox. 3 años"
 *   unknown   → "Edad desconocida"
 */
function formatAge(obj) {
  const confidence = obj.birthDateConfidence || 'exact';

  if (confidence === 'unknown') return 'Edad desconocida';

  const prefix = confidence === 'estimated' ? 'aprox. ' : '';
  const dob = obj.dateOfBirth ? new Date(obj.dateOfBirth) : null;

  if (!dob || isNaN(dob.getTime())) {
    // Fall back to estimatedAgeMonths when birthDate is missing
    const em = obj.estimatedAgeMonths;
    if (!em) return 'Edad desconocida';
    const estYears = Math.floor(em / 12);
    if (em < 12) return `aprox. ${em} ${em === 1 ? 'mes' : 'meses'}`;
    return `aprox. ${estYears} ${estYears === 1 ? 'año' : 'años'}`;
  }

  const { years, totalMonths } = calcAge(dob);

  if (totalMonths < 1) return `${prefix}Recién nacido`;
  if (totalMonths < 12) return `${prefix}${totalMonths} ${totalMonths === 1 ? 'mes' : 'meses'}`;
  if (years === 1) return `${prefix}1 año`;
  return `${prefix}${years} años`;
}

function dogResponse(dog) {
  const obj = dog.toObject ? dog.toObject() : dog;
  const dob = obj.dateOfBirth ? new Date(obj.dateOfBirth) : null;
  const confidence = obj.birthDateConfidence || 'exact';
  const ageData = (dob && !isNaN(dob.getTime()) && confidence !== 'unknown')
    ? calcAge(dob)
    : null;
  const ageYears = ageData ? ageData.years : null;
  const ageDisplay = formatAge(obj);
  return {
    id: obj._id,
    name: obj.name,
    breed: obj.breed,
    dateOfBirth: obj.dateOfBirth,
    photoUrl: obj.photoUrl,
    ageYears,
    ageDisplay,
    sex: obj.sex || 'unknown',
    neutered: Boolean(obj.neutered),
    weightKg: obj.weightKg ?? null,
    microchipId: obj.microchipId || '',
    birthDateConfidence: obj.birthDateConfidence || 'exact',
    estimatedAgeMonths: obj.estimatedAgeMonths ?? null,
    countryProfile: obj.countryProfile || 'AR',
    city: obj.city || '',
    timezone: obj.timezone || '',
    hasVeterinarian: Boolean(obj.hasVeterinarian),
    veterinarianName: obj.veterinarianName || '',
    allergies: obj.allergies || [],
    conditions: obj.conditions || [],
  };
}

// GET /api/dogs
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });
    return res.json({ dogs: user.dogs.map(dogResponse) });
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, breed, dateOfBirth, photoUrl } = req.body;

    if (!name || !breed || !dateOfBirth) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'name, breed, and dateOfBirth are required.' });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'dateOfBirth must be a valid date.' });
    }
    if (dob > new Date()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'dateOfBirth must be in the past.' });
    }
    const thirtyYearsAgo = new Date();
    thirtyYearsAgo.setFullYear(thirtyYearsAgo.getFullYear() - 30);
    if (dob < thirtyYearsAgo) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'dateOfBirth cannot be more than 30 years ago.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    TierService.assertCanAddDog(user);

    user.dogs.push({ name: name.trim(), breed: breed.trim(), dateOfBirth: dob, photoUrl: photoUrl || null });
    await user.save();

    const newDog = user.dogs[user.dogs.length - 1];
    return res.status(201).json(dogResponse(newDog));
  } catch (err) {
    next(err);
  }
});

// GET /api/dogs/:dogId
router.get('/:dogId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    return res.json(dogResponse(dog));
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:dogId
router.patch('/:dogId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const {
      name, breed, dateOfBirth, photoUrl,
      sex, neutered, weightKg, microchipId, birthDateConfidence, estimatedAgeMonths,
      countryProfile, city, timezone,
      hasVeterinarian, veterinarianName,
      allergies, conditions,
    } = req.body;

    if (name !== undefined) dog.name = name.trim();
    if (breed !== undefined) dog.breed = breed.trim();
    if (dateOfBirth !== undefined) {
      const dob = new Date(dateOfBirth);
      if (isNaN(dob.getTime()) || dob > new Date()) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid dateOfBirth.' });
      }
      dog.dateOfBirth = dob;
    }
    if (photoUrl !== undefined) dog.photoUrl = photoUrl;

    if (sex !== undefined) {
      if (!['male', 'female', 'unknown'].includes(sex)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'sex must be male, female, or unknown.' });
      }
      dog.sex = sex;
    }
    if (neutered !== undefined) dog.neutered = Boolean(neutered);
    if (weightKg !== undefined) {
      const w = weightKg === null ? null : Number(weightKg);
      if (w !== null && (!Number.isFinite(w) || w <= 0 || w > 200)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'weightKg must be a positive number up to 200.' });
      }
      dog.weightKg = w;
    }
    if (microchipId !== undefined) dog.microchipId = String(microchipId).trim();
    if (birthDateConfidence !== undefined) {
      if (!['exact', 'estimated', 'unknown'].includes(birthDateConfidence)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'birthDateConfidence must be exact, estimated, or unknown.' });
      }
      dog.birthDateConfidence = birthDateConfidence;
    }
    if (estimatedAgeMonths !== undefined) dog.estimatedAgeMonths = estimatedAgeMonths === null ? null : Number(estimatedAgeMonths);

    if (countryProfile !== undefined) {
      if (!['AR', 'UY'].includes(String(countryProfile).toUpperCase())) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'countryProfile must be AR or UY.' });
      }
      dog.countryProfile = String(countryProfile).toUpperCase();
    }
    if (city !== undefined) dog.city = String(city).trim();
    if (timezone !== undefined) dog.timezone = String(timezone).trim();

    if (hasVeterinarian !== undefined) dog.hasVeterinarian = Boolean(hasVeterinarian);
    if (veterinarianName !== undefined) dog.veterinarianName = String(veterinarianName).trim();

    if (Array.isArray(allergies)) dog.allergies = allergies.map((a) => String(a).trim()).filter(Boolean);
    if (Array.isArray(conditions)) dog.conditions = conditions.map((c) => String(c).trim()).filter(Boolean);

    await user.save();
    return res.json(dogResponse(dog));
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:dogId
router.delete('/:dogId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    dog.deleteOne();
    await user.save();
    return res.json({ message: 'Dog profile deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
