'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const BehaviorLog = require('../models/BehaviorLog');
const analytics = require('../services/analyticsService');

const { KINDS } = BehaviorLog;

const router = express.Router({ mergeParams: true });

// Verifica que el perro pertenezca al usuario autenticado.
async function loadDog(req, res) {
  const user = await User.findById(req.user.id);
  const dog = user?.dogs.id(req.params.dogId);
  if (!dog) {
    res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    return null;
  }
  return { user, dog };
}

// GET /api/dogs/:dogId/behaviors — feed del álbum (más nuevo primero)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;

    const filter = { dogId: ctx.dog._id };
    if (req.query.kind && KINDS.includes(req.query.kind)) filter.kind = req.query.kind;

    const behaviors = await BehaviorLog.find(filter).sort({ date: -1 }).lean();
    return res.json({ behaviors });
  } catch (err) {
    next(err);
  }
});

// POST /api/dogs/:dogId/behaviors
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { kind, title, note, photoUrl, date } = req.body;

    if (!kind || !KINDS.includes(kind)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: `kind must be one of: ${KINDS.join(', ')}.` });
    }
    if (!title || !String(title).trim()) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'title is required.' });
    }

    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;

    const behavior = await BehaviorLog.create({
      userId: ctx.user._id,
      dogId: ctx.dog._id,
      kind,
      title: String(title).trim().slice(0, 120),
      note: note ? String(note).slice(0, 1000) : '',
      photoUrl: photoUrl || null,
      date: date ? new Date(date) : new Date(),
    });

    analytics.track('behavior_logged', { userId: ctx.user._id, dogId: ctx.dog._id, channel: 'app', meta: { kind } });

    return res.status(201).json(behavior);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/dogs/:dogId/behaviors/:behaviorId
router.patch('/:behaviorId', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;

    const behavior = await BehaviorLog.findOne({ _id: req.params.behaviorId, dogId: ctx.dog._id });
    if (!behavior) return res.status(404).json({ code: 'NOT_FOUND', message: 'Behavior not found.' });

    const { kind, title, note, photoUrl, date } = req.body;
    if (kind !== undefined) {
      if (!KINDS.includes(kind)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: `kind must be one of: ${KINDS.join(', ')}.` });
      }
      behavior.kind = kind;
    }
    if (title !== undefined) behavior.title = String(title).trim().slice(0, 120);
    if (note !== undefined) behavior.note = String(note).slice(0, 1000);
    if (photoUrl !== undefined) behavior.photoUrl = photoUrl;
    if (date !== undefined) behavior.date = new Date(date);

    await behavior.save();
    return res.json(behavior);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/dogs/:dogId/behaviors/:behaviorId
router.delete('/:behaviorId', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;

    const deleted = await BehaviorLog.findOneAndDelete({ _id: req.params.behaviorId, dogId: ctx.dog._id });
    if (!deleted) return res.status(404).json({ code: 'NOT_FOUND', message: 'Behavior not found.' });

    return res.json({ message: 'Behavior deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
