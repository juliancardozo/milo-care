'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const { buildCalendar } = require('../services/CalendarEngine');

const router = express.Router();

function matchStatus(item, statusFilter) {
  if (!statusFilter) return true;
  return String(item.status || '').toLowerCase() === String(statusFilter).toLowerCase();
}

router.get('/dogs/:dogId/calendar', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const calendar = buildCalendar(dog.toObject());
    const statusFilter = req.query.status;

    const events = [
      ...calendar.vaccines.map((item) => ({
        id: item.id,
        type: 'vaccine',
        title: item.vaccineType,
        scheduledFor: item.nextDueAt,
        status: item.status,
        actions: { reschedule: true, complete: true, skip: true },
      })),
      ...calendar.deworming.map((item) => ({
        id: item.id,
        type: 'deworming',
        title: item.productName,
        scheduledFor: item.nextDueAt,
        status: item.status,
        actions: { reschedule: true, complete: true, skip: true },
      })),
      ...calendar.appointments.map((item) => ({
        id: item.id,
        type: 'appointment',
        title: item.type,
        scheduledFor: item.scheduledAt || item.reminderAt,
        status: item.status,
        actions: { reschedule: true, complete: true, skip: false },
      })),
    ].filter((item) => matchStatus(item, statusFilter));

    return res.json({
      dog: {
        id: dog._id,
        name: dog.name,
        breed: dog.breed,
        riskProfile: calendar.riskProfile.level,
        lifeStage: calendar.dog.lifeStage,
      },
      events,
      missingData: calendar.missingData,
      disclaimer: calendar.disclaimer,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/dogs/:dogId/summary', authenticate, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const dog = user?.dogs.id(req.params.dogId);
    if (!dog) return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });

    const calendar = buildCalendar(dog.toObject());
    return res.json(calendar);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
