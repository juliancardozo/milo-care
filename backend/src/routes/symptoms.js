'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const EmailService = require('../services/EmailService');
const analytics = require('../services/analyticsService');
const { evaluateVomitRule } = require('../services/symptomAlertService');

const router = express.Router({ mergeParams: true });

// Etiquetas cálidas para el registro rápido (descripción autogenerada).
const QUICK_TYPES = {
  vomito: 'Vómito',
  diarrea: 'Diarrea',
  tos: 'Tos',
  cojera: 'Cojera',
  decaimiento: 'Decaimiento',
  inapetencia: 'Inapetencia',
  otro: 'Otro síntoma',
};

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
      symptomType: description,
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

// POST /api/dogs/:dogId/symptoms/quick — registro rápido (≤2 taps)
router.post('/quick', authenticate, async (req, res, next) => {
  try {
    const { quickType, photoUrl, notes } = req.body;

    if (!quickType || !QUICK_TYPES[quickType]) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: `quickType must be one of: ${Object.keys(QUICK_TYPES).join(', ')}.`,
      });
    }

    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const now = new Date();
    dog.symptoms.push({
      symptomType: QUICK_TYPES[quickType],
      description: `${QUICK_TYPES[quickType]} (registro rápido)`,
      quickType,
      severity: 'moderate',
      dateObserved: now,
      photoUrl: photoUrl || null,
      notes: notes || '',
      isQuickLog: true,
    });
    await user.save();

    const newSymptom = dog.symptoms[dog.symptoms.length - 1];
    analytics.track('quick_symptom_logged', { userId: user._id, dogId: dog._id, channel: 'app', meta: { quickType } });

    // Regla acumulativa de vómitos.
    const alert = evaluateVomitRule(dog, dog.symptoms, now);
    if (alert.triggered && user.notificationPreferences?.enabled !== false) {
      EmailService.sendSymptomAlert({
        to: user.email,
        userName: user.name,
        dogName: dog.name,
        count: alert.count,
        windowHours: alert.windowHours,
        isPuppy: alert.isPuppy,
      }).catch((err) => console.error('[symptoms/quick] alert email failed:', err.message));
    }

    return res.status(201).json({ symptom: newSymptom, alert });
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

    const { description, symptomType, severity, dateObserved, notes, photoUrl, resolved, isQuickLog } = req.body;
    const validSeverities = ['mild', 'moderate', 'severe'];
    if (description !== undefined) symptom.description = description;
    if (symptomType !== undefined) symptom.symptomType = symptomType;
    if (severity !== undefined) {
      if (!validSeverities.includes(severity)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: `severity must be one of: ${validSeverities.join(', ')}.` });
      }
      symptom.severity = severity;
    }
    if (dateObserved !== undefined) symptom.dateObserved = new Date(dateObserved);
    if (notes !== undefined) symptom.notes = notes;
    if (photoUrl !== undefined) symptom.photoUrl = photoUrl;
    if (resolved !== undefined) symptom.resolved = Boolean(resolved);
    // Completar un registro rápido lo saca del estado "quick".
    if (isQuickLog !== undefined) symptom.isQuickLog = Boolean(isQuickLog);

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
