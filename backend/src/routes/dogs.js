'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const TierService = require('../services/TierService');
const User = require('../models/User');

const router = express.Router();

function dogResponse(dog) {
  const obj = dog.toObject ? dog.toObject() : dog;
  const dob = obj.dateOfBirth ? new Date(obj.dateOfBirth) : null;
  const ageYears = dob
    ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;
  return { id: obj._id, name: obj.name, breed: obj.breed, dateOfBirth: obj.dateOfBirth, photoUrl: obj.photoUrl, ageYears };
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

    const { name, breed, dateOfBirth, photoUrl } = req.body;
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
