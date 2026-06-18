'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const { nextVaccineDueDate, nextDewormingDueDate } = require('../services/preventiveScheduling');
const { calculateAgeInMonths } = require('../services/ValidationService');
const { calculate: calculateRisk } = require('../services/RiskProfileCalculator');

const router = express.Router();

function findById(items, eventId) {
  return (items || []).find((item) => String(item._id) === String(eventId));
}

// Recordatorio = N días antes del vencimiento (si todavía es futuro).
function reminderBefore(dueDate, windowDays = 7) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  d.setDate(d.getDate() - windowDays);
  return d > new Date() ? d : new Date();
}

router.patch('/:eventId/status', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const { eventId } = req.params;
    const status = String(req.body?.status || '').trim();
    const allowed = ['suggested', 'upcoming', 'programado', 'completed', 'cancelled', 'vencido', 'pending_vet_validation'];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid status update.' });
    }

    let matched = null;
    let kind = null;
    let nextScheduled = null; // { dueDate } si completar agendó el próximo ciclo

    const windowDays = user.notificationPreferences?.vaccinationWindowDays || 7;

    for (const dog of user.dogs) {
      const vaccination = findById(dog.vaccinations, eventId);
      if (vaccination) {
        vaccination.status = status;
        if (status === 'completed') {
          const adminDate = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
          vaccination.dateAdministered = adminDate;
          // Proactivo: en vez de apagar el recordatorio, agendamos el próximo refuerzo
          // con la cadencia clínica correcta (rabia anual, core 3 años, etc.).
          const ageMonths = calculateAgeInMonths(dog.birthDate || dog.dateOfBirth);
          const next = nextVaccineDueDate({
            vaccineName: vaccination.vaccineName,
            fromDate: adminDate,
            country: dog.countryProfile || 'AR',
            ageMonths,
          });
          if (next) {
            vaccination.nextDueDate = next.dueDate;
            vaccination.nextReminderAt = reminderBefore(next.dueDate, windowDays);
            nextScheduled = { dueDate: next.dueDate };
          } else {
            vaccination.nextReminderAt = null;
          }
        }
        matched = vaccination;
        kind = 'vaccination';
        break;
      }

      const deworm = findById(dog.dewormingHistory, eventId);
      if (deworm) {
        deworm.status = status;
        if (status === 'completed') {
          const adminDate = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
          deworm.dateAdministered = adminDate;
          // Proactivo: agendar la próxima desparasitación (externo→por producto,
          // interno→por etapa de vida y riesgo).
          const ageMonths = calculateAgeInMonths(dog.birthDate || dog.dateOfBirth);
          const riskLevel = calculateRisk(dog.lifestyle || {}).level;
          const next = nextDewormingDueDate({
            productName: deworm.productName,
            parasiteType: deworm.parasiteType,
            fromDate: adminDate,
            ageMonths,
            riskLevel,
          });
          deworm.nextDueDate = next.dueDate;
          deworm.nextReminderAt = reminderBefore(next.dueDate, windowDays);
          nextScheduled = { dueDate: next.dueDate };
        }
        matched = deworm;
        kind = 'deworming';
        break;
      }

      const appt = findById(dog.appointments, eventId);
      if (appt) {
        appt.status = status;
        if (status === 'completed' || status === 'cancelled') {
          appt.reminderAt = null;
        }
        matched = appt;
        kind = 'appointment';
        break;
      }
    }

    if (!matched) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Event not found.' });
    }

    await user.save();

    return res.json({
      success: true,
      type: kind,
      event: matched,
      remindersAdjusted: ['completed', 'cancelled'].includes(status) ? 1 : 0,
      ...(nextScheduled ? { nextScheduledAt: nextScheduled.dueDate } : {}),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
