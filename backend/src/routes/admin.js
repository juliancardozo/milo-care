'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, adminAuth);

// ── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get('/stats', async (_req, res, next) => {
  try {
    const [totalUsers, totalAdmins, freeUsers, premiumUsers] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ tier: 'free' }),
      User.countDocuments({ tier: 'premium' }),
    ]);

    // Aggregate dog counts
    const dogAgg = await User.aggregate([
      { $project: { dogCount: { $size: '$dogs' } } },
      { $group: { _id: null, total: { $sum: '$dogCount' } } },
    ]);
    const totalDogs = dogAgg[0]?.total ?? 0;

    return res.json({
      users: { total: totalUsers, admins: totalAdmins, free: freeUsers, premium: premiumUsers },
      dogs: { total: totalDogs },
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const search = String(req.query.search || '').trim();

    const filter = search
      ? { $or: [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ] }
      : {};

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('name email tier role createdAt dogs')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    const items = users.map((u) => ({
      id: u._id,
      name: u.name,
      email: u.email,
      tier: u.tier,
      role: u.role || 'user',
      dogCount: u.dogs?.length ?? 0,
      createdAt: u.createdAt,
    }));

    return res.json({ users: items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users/:id ─────────────────────────────────────────────────

router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-passwordHash')
      .lean();

    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    const dogs = (user.dogs || []).map((d) => ({
      id: d._id,
      name: d.name,
      breed: d.breed,
      dateOfBirth: d.dateOfBirth,
      vaccinationCount: d.vaccinations?.length ?? 0,
      appointmentCount: d.appointments?.length ?? 0,
      medicationCount: d.medications?.length ?? 0,
    }));

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      role: user.role || 'user',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      notificationPreferences: user.notificationPreferences,
      dogs,
    });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/admin/users/:id ───────────────────────────────────────────────

router.patch('/users/:id', async (req, res, next) => {
  try {
    const { name, tier, role } = req.body;

    if (tier !== undefined && !['free', 'premium'].includes(tier)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'tier must be free or premium.' });
    }
    if (role !== undefined && !['user', 'admin'].includes(role)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'role must be user or admin.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    if (name !== undefined) user.name = String(name).trim();
    if (tier !== undefined) user.tier = tier;
    if (role !== undefined) user.role = role;

    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      role: user.role,
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/admin/users/:id ──────────────────────────────────────────────

router.delete('/users/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'An admin cannot delete their own account from the admin panel.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    return res.json({ message: 'User deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
