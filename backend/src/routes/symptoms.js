'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router({ mergeParams: true });

// GET /api/dogs/:dogId/symptoms (ordered by dateObserved desc)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const symptoms = [...dog.symptoms].sort((a, b) => new Date(b.dateObserved) - new Date(a.dateObserved));
    return res.json({ symptoms });
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs/:dogId/symptoms
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { description, severity, dateObserved, notes } = req.body;

    if (!description || !dateObserved) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'description and dateObserved are required.' });
    }

    const observedDate = new Date(dateObserved);
    if (isNaN(observedDate.getTime())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'dateObserved must be a valid date.' });
    }

    const validSeverities = ['mild', 'moderate', 'severe'];
    if (severity && !validSeverities.includes(severity)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: `severity must be one of: ${validSeverities.join(', ')}.` });
    }

    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    dog.symptoms.push({
      description,
      severity: severity || 'mild',
      dateObserved: observedDate,
      notes: notes || '',
    });
    await user.save();

    const newSymptom = dog.symptoms[dog.symptoms.length - 1];
    return res.status(201).json(newSymptom);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:dogId/symptoms/:symId
router.patch('/:symId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const symptom = dog.symptoms.id(req.params.symId);
    if (!symptom) return res.status(404).json({ code: 'NOT_FOUND', message: 'Symptom not found.' });

    const { description, severity, dateObserved, notes } = req.body;
    const validSeverities = ['mild', 'moderate', 'severe'];
    if (description !== undefined) symptom.description = description;
    if (severity !== undefined) {
      if (!validSeverities.includes(severity)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: `severity must be one of: ${validSeverities.join(', ')}.` });
      }
      symptom.severity = severity;
    }
    if (dateObserved !== undefined) symptom.dateObserved = new Date(dateObserved);
    if (notes !== undefined) symptom.notes = notes;

    await user.save();
    return res.json(symptom);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:dogId/symptoms/:symId
router.delete('/:symId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const symptom = dog.symptoms.id(req.params.symId);
    if (!symptom) return res.status(404).json({ code: 'NOT_FOUND', message: 'Symptom not found.' });

    symptom.deleteOne();
    await user.save();
    return res.json({ message: 'Symptom record deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
