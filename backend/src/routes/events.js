'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

function findById(items, eventId) {
  return (items || []).find((item) => String(item._id) === String(eventId));
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

    for (const dog of user.dogs) {
      const vaccination = findById(dog.vaccinations, eventId);
      if (vaccination) {
        vaccination.status = status;
        if (status === 'completed') {
          vaccination.dateAdministered = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
          vaccination.nextReminderAt = null;
        }
        matched = vaccination;
        kind = 'vaccination';
        break;
      }

      const deworm = findById(dog.dewormingHistory, eventId);
      if (deworm) {
        deworm.status = status;
        if (status === 'completed') {
          deworm.dateAdministered = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
          deworm.nextReminderAt = null;
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
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
