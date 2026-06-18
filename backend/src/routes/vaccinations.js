'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const DogAccess = require('../services/DogAccess');
const notificationTracking = require('../services/notificationTracking');
const { nextVaccineDueDate } = require('../services/preventiveScheduling');
const { calculateAgeInMonths } = require('../services/ValidationService');

const router = express.Router({ mergeParams: true });

function computeVaccinationReminder(nextDueDate, windowDays) {
  if (!nextDueDate) return null;
  const reminderDate = new Date(nextDueDate);
  reminderDate.setDate(reminderDate.getDate() - (windowDays || 7));
  return reminderDate > new Date() ? reminderDate : null;
}

// GET /api/dogs/:dogId/vaccinations
router.get('/', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { dog } = found;
    return res.json({ vaccinations: dog.vaccinations });
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs/:dogId/vaccinations
router.post('/', authenticate, async (req, res, next) => {
  try {
    const {
      vaccineName, dateAdministered, nextDueDate, notes,
      catalogId, isCalendarRequired, antigenGroup, administrationRoute,
      lotNumber, veterinarian,
    } = req.body;

    if (!vaccineName || !dateAdministered) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'vaccineName and dateAdministered are required.' });
    }

    const adminDate = new Date(dateAdministered);
    if (isNaN(adminDate.getTime())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'dateAdministered must be a valid date.' });
    }

    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const duplicate = dog.vaccinations.some(
      (v) =>
        v.vaccineName.toLowerCase() === vaccineName.toLowerCase() &&
        new Date(v.dateAdministered).toISOString().split('T')[0] === adminDate.toISOString().split('T')[0]
    );
    if (duplicate) {
      return res.status(409).json({ code: 'DUPLICATE_VACCINATION', message: 'A vaccination with this name and date already exists.' });
    }

    // Cuidado preventivo proactivo: si el usuario no indicó la próxima dosis,
    // la derivamos del catálogo clínico (rabia anual, core 3 años, lepto anual…),
    // según país y etapa de vida. Así no se procrastina el refuerzo.
    let effectiveNextDue = nextDueDate ? new Date(nextDueDate) : null;
    let autoNote = '';
    if (!effectiveNextDue) {
      const ageMonths = calculateAgeInMonths(dog.birthDate || dog.dateOfBirth);
      const suggestion = nextVaccineDueDate({
        vaccineName,
        fromDate: adminDate,
        country: dog.countryProfile || 'AR',
        ageMonths,
      });
      if (suggestion) {
        effectiveNextDue = suggestion.dueDate;
        autoNote = suggestion.note;
      }
    }

    const windowDays = user.notificationPreferences?.vaccinationWindowDays || 7;
    const nextReminderAt = effectiveNextDue ? computeVaccinationReminder(effectiveNextDue, windowDays) : null;

    dog.vaccinations.push({
      vaccineName,
      catalogId: catalogId || null,
      isCalendarRequired: Boolean(isCalendarRequired),
      antigenGroup: antigenGroup || '',
      administrationRoute: administrationRoute || '',
      dateAdministered: adminDate,
      nextDueDate: effectiveNextDue,
      notes: notes || autoNote || '',
      lotNumber: lotNumber || '',
      veterinarian: veterinarian || '',
      nextReminderAt,
      status: 'completed',
      source: 'manual',
    });
    await user.save();

    // Conversion tracking (Fase 4): cargar una vacuna cierra el embudo de los
    // recordatorios/avisos de vencido de vacunación. Fire-and-forget.
    notificationTracking.recordConversion(user._id, dog._id, ['vaccination', 'overdue']);

    const newVac = dog.vaccinations[dog.vaccinations.length - 1];
    return res.status(201).json(newVac);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:dogId/vaccinations/:vacId
router.patch('/:vacId', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const vac = dog.vaccinations.id(req.params.vacId);
    if (!vac) return res.status(404).json({ code: 'NOT_FOUND', message: 'Vaccination not found.' });

    const { vaccineName, dateAdministered, nextDueDate, notes } = req.body;
    if (vaccineName !== undefined) vac.vaccineName = vaccineName;
    if (dateAdministered !== undefined) vac.dateAdministered = new Date(dateAdministered);
    if (nextDueDate !== undefined) {
      vac.nextDueDate = nextDueDate ? new Date(nextDueDate) : null;
      const windowDays = user.notificationPreferences?.vaccinationWindowDays || 7;
      vac.nextReminderAt = vac.nextDueDate ? computeVaccinationReminder(vac.nextDueDate, windowDays) : null;
    }
    if (notes !== undefined) vac.notes = notes;

    await user.save();
    return res.json(vac);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:dogId/vaccinations/:vacId
router.delete('/:vacId', authenticate, async (req, res, next) => {
  try {
    const found = await DogAccess.loadForRequest(req, res);
    if (!found) return;
    const { owner: user, dog } = found;

    const vac = dog.vaccinations.id(req.params.vacId);
    if (!vac) return res.status(404).json({ code: 'NOT_FOUND', message: 'Vaccination not found.' });

    vac.deleteOne();
    await user.save();
    return res.json({ message: 'Vaccination record deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
