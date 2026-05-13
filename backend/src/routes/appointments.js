'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router({ mergeParams: true });

function computeAppointmentReminder(appointmentDate, windowHours) {
  if (!appointmentDate || !windowHours) return null;
  const reminder = new Date(appointmentDate);
  reminder.setHours(reminder.getHours() - windowHours);
  return reminder > new Date() ? reminder : null;
}

// GET /api/dogs/:dogId/appointments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const appointments = [...dog.appointments].sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));
    return res.json({ appointments });
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs/:dogId/appointments
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { title, appointmentDate, vetName, location, notes } = req.body;

    if (!title || !appointmentDate) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'title and appointmentDate are required.' });
    }

    const apptDate = new Date(appointmentDate);
    if (isNaN(apptDate.getTime())) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'appointmentDate must be a valid date.' });
    }

    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const windowHours = user.notificationPreferences?.appointmentWindowHours || 24;
    const reminderAt = computeAppointmentReminder(apptDate, windowHours);

    dog.appointments.push({
      title,
      appointmentDate: apptDate,
      vetName: vetName || '',
      location: location || '',
      notes: notes || '',
      isCancelled: false,
      reminderAt,
    });
    await user.save();

    const newAppt = dog.appointments[dog.appointments.length - 1];
    return res.status(201).json(newAppt);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:dogId/appointments/:apptId
router.patch('/:apptId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const appt = dog.appointments.id(req.params.apptId);
    if (!appt) return res.status(404).json({ code: 'NOT_FOUND', message: 'Appointment not found.' });

    const { title, appointmentDate, vetName, location, notes, isCancelled } = req.body;
    if (title !== undefined) appt.title = title;
    if (vetName !== undefined) appt.vetName = vetName;
    if (location !== undefined) appt.location = location;
    if (notes !== undefined) appt.notes = notes;
    if (typeof isCancelled === 'boolean') {
      appt.isCancelled = isCancelled;
      if (isCancelled) appt.reminderAt = null;
    }
    if (appointmentDate !== undefined) {
      appt.appointmentDate = new Date(appointmentDate);
      if (!appt.isCancelled) {
        const windowHours = user.notificationPreferences?.appointmentWindowHours || 24;
        appt.reminderAt = computeAppointmentReminder(appt.appointmentDate, windowHours);
      }
    }

    await user.save();
    return res.json(appt);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:dogId/appointments/:apptId
router.delete('/:apptId', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const appt = dog.appointments.id(req.params.apptId);
    if (!appt) return res.status(404).json({ code: 'NOT_FOUND', message: 'Appointment not found.' });

    appt.deleteOne();
    await user.save();
    return res.json({ message: 'Appointment deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
