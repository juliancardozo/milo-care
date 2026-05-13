'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router({ mergeParams: true });

function computeMedicationReminder(startDate, frequencyHours) {
  if (!startDate || !frequencyHours) return null;
  const reminder = new Date(startDate);
  reminder.setHours(reminder.getHours() + frequencyHours);
  return reminder > new Date() ? reminder : null;
}

// GET /api/dogs/:dogId/medications?active=true
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    let meds = dog.medications;
    if (req.query.active === 'true') meds = meds.filter((m) => m.isActive);

    return res.json({ medications: meds });
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs/:dogId/medications
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { medicationName, dosage, frequencyHours, startDate, endDate, notes } = req.body;

    if (!medicationName || !dosage || !frequencyHours || !startDate) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'medicationName, dosage, frequencyHours, and startDate are required.' });
    }
    if (!Number.isFinite(Number(frequencyHours)) || Number(frequencyHours) <= 0) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'frequencyHours must be a positive number.' });
    }

    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'startDate must be a valid date.' });
    }

    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const nextReminderAt = computeMedicationReminder(start, Number(frequencyHours));

    dog.medications.push({
      medicationName,
      dosage,
      frequencyHours: Number(frequencyHours),
      startDate: start,
      endDate: endDate ? new Date(endDate) : null,
      notes: notes || '',
      isActive: true,
      nextReminderAt,
    });
    await user.save();

    const newMed = dog.medications[dog.medications.length - 1];
    return res.status(201).json(newMed);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:dogId/medications/:medId
router.patch('/:medId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const med = dog.medications.id(req.params.medId);
    if (!med) return res.status(404).json({ code: 'NOT_FOUND', message: 'Medication not found.' });

    const { medicationName, dosage, frequencyHours, startDate, endDate, notes, isActive } = req.body;
    if (medicationName !== undefined) med.medicationName = medicationName;
    if (dosage !== undefined) med.dosage = dosage;
    if (frequencyHours !== undefined) med.frequencyHours = Number(frequencyHours);
    if (startDate !== undefined) med.startDate = new Date(startDate);
    if (endDate !== undefined) med.endDate = endDate ? new Date(endDate) : null;
    if (notes !== undefined) med.notes = notes;
    if (typeof isActive === 'boolean') {
      med.isActive = isActive;
      if (!isActive) med.nextReminderAt = null; // clear reminder when marking inactive
    }

    // Recompute reminder if frequency or start changed
    if (frequencyHours !== undefined || startDate !== undefined) {
      med.nextReminderAt = computeMedicationReminder(med.startDate, med.frequencyHours);
    }

    await user.save();
    return res.json(med);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:dogId/medications/:medId
router.delete('/:medId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const med = dog.medications.id(req.params.medId);
    if (!med) return res.status(404).json({ code: 'NOT_FOUND', message: 'Medication not found.' });

    med.deleteOne();
    await user.save();
    return res.json({ message: 'Medication record deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
