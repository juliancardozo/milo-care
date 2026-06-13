'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');
const Milestone = require('../models/Milestone');
const DailyCheckin = require('../models/DailyCheckin');
const BehaviorLog = require('../models/BehaviorLog');
const analytics = require('../services/analyticsService');
const { detectMilestones } = require('../services/milestoneService');
const { computeStreak } = require('../services/checkinAnalytics');
const { localDateString } = require('../utils/localTime');

const router = express.Router({ mergeParams: true });

function userTimezone(user) {
  return user?.notificationPreferences?.timezone || 'America/Argentina/Buenos_Aires';
}

function vaccinesUpToDate(dog, now) {
  return !(dog.vaccinations || []).some((v) => {
    const status = String(v.status || '').toLowerCase();
    if (status === 'vencido') return true;
    if (['completed', 'cancelled', 'discarded'].includes(status)) return false;
    return v.nextDueDate && new Date(v.nextDueDate) < now;
  });
}

async function loadDog(req, res) {
  const user = await User.findById(req.user.id);
  const dog = user?.dogs.id(req.params.dogId);
  if (!dog) {
    res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    return null;
  }
  return { user, dog };
}

// GET / — detecta y persiste hitos nuevos; devuelve pendientes + historial.
router.get('/', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;
    const { user, dog } = ctx;

    const now = new Date();
    const tz = userTimezone(user);
    const localToday = localDateString(tz, now);

    const [streakDocs, achievementsCount] = await Promise.all([
      DailyCheckin.find({ dogId: dog._id }).select('localDate').lean(),
      BehaviorLog.countDocuments({ dogId: dog._id, kind: 'logro' }),
    ]);

    const checkinStreak = computeStreak(streakDocs.map((d) => d.localDate), localToday);
    const tenureDays = dog.createdAt ? Math.floor((now - new Date(dog.createdAt)) / 86400000) : 0;

    const candidates = detectMilestones(dog, {
      now, tz, checkinStreak, achievementsCount,
      vaccinesUpToDate: vaccinesUpToDate(dog, now), tenureDays,
    });

    // Persistir los nuevos sin tocar los existentes (upsert idempotente).
    await Promise.all(candidates.map((c) =>
      Milestone.updateOne(
        { dogId: dog._id, key: c.key },
        { $setOnInsert: { userId: user._id, dogId: dog._id, key: c.key, type: c.type, value: c.value, detectedAt: now } },
        { upsert: true }
      )
    ));

    const all = await Milestone.find({ dogId: dog._id }).sort({ detectedAt: -1 }).lean();
    const pending = all.filter((m) => !m.shownAt);
    const history = all.filter((m) => m.shownAt);

    return res.json({ pending, history, referralCode: user.referralCode || null, dogName: dog.name, dogPhotoUrl: dog.photoUrl || null });
  } catch (err) {
    next(err);
  }
});

// POST /:key/seen — marca el hito como mostrado (no se vuelve a celebrar).
router.post('/:key/seen', authenticate, async (req, res, next) => {
  try {
    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;

    const milestone = await Milestone.findOneAndUpdate(
      { dogId: ctx.dog._id, key: req.params.key, shownAt: null },
      { shownAt: new Date() },
      { new: true }
    );
    if (milestone) {
      analytics.track('milestone_shown', { userId: ctx.user._id, dogId: ctx.dog._id, meta: { key: req.params.key } });
    }
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /:key/share — registra compartido/descarga de la tarjeta.
router.post('/:key/share', authenticate, async (req, res, next) => {
  try {
    const action = req.body?.action === 'downloaded' ? 'downloaded' : 'shared';
    const ctx = await loadDog(req, res);
    if (!ctx) return undefined;

    await Milestone.updateOne(
      { dogId: ctx.dog._id, key: req.params.key },
      { sharedAt: new Date(), sharedAction: action }
    );
    analytics.track(action === 'downloaded' ? 'card_downloaded' : 'card_shared', {
      userId: ctx.user._id, dogId: ctx.dog._id, meta: { key: req.params.key },
    });
    return res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
