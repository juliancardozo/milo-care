'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Lead = require('../models/Lead');
const EmailService = require('../services/EmailService');

const router = express.Router();

// ── GET /api/admin/email/preview/:type ──────────────────────────────────────
// Public: renders sample HTML for browser preview — no user data exposed.

const PREVIEW_DATA = {
  welcome:     () => EmailService._templates.welcome({ userName: 'Julián' }),
  vaccination: () => EmailService._templates.vaccination({ userName: 'Julián', dogName: 'Milo', vaccineName: 'Triple (CDV + CAV-2 + CPV-2)', nextDueDate: new Date(Date.now() + 7 * 864e5) }),
  deworming:   () => EmailService._templates.deworming({ userName: 'Julián', dogName: 'Milo', productName: 'Bravecto', nextDueDate: new Date(Date.now() + 30 * 864e5) }),
  medication:  () => EmailService._templates.medication({ userName: 'Julián', dogName: 'Milo', medicationName: 'Carprofen', dosage: '25 mg' }),
  appointment: () => EmailService._templates.appointment({ userName: 'Julián', dogName: 'Milo', appointmentTitle: 'Control sano adulto', clinicName: 'Clínica Veterinaria Central', appointmentDate: new Date(Date.now() + 864e5) }),
  passwordReset: () => EmailService._templates.passwordReset({ resetUrl: `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=PREVIEW_TOKEN` }),
};

router.get('/email/preview/:type', (req, res) => {
  const render = PREVIEW_DATA[req.params.type];
  if (!render) {
    return res.status(404).json({ code: 'NOT_FOUND', message: `Unknown template "${req.params.type}". Available: ${Object.keys(PREVIEW_DATA).join(', ')}.` });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.send(render());
});

// All other admin routes require authentication + admin role
router.use(authenticate, adminAuth);

// ── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get('/stats', async (_req, res, next) => {
  try {
    const [totalUsers, totalAdmins, freeUsers, premiumUsers, totalSignups, totalFounders] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ tier: 'free' }),
      User.countDocuments({ tier: 'premium' }),
      Lead.countDocuments({ tipo: 'signup' }),
      Lead.countDocuments({ tipo: 'founder' }),
    ]);

    const dogAgg = await User.aggregate([
      { $project: { dogCount: { $size: '$dogs' } } },
      { $group: { _id: null, total: { $sum: '$dogCount' } } },
    ]);
    const totalDogs = dogAgg[0]?.total ?? 0;

    return res.json({
      users: { total: totalUsers, admins: totalAdmins, free: freeUsers, premium: premiumUsers },
      dogs: { total: totalDogs },
      leads: { total: totalSignups + totalFounders, signups: totalSignups, founders: totalFounders },
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

// ── POST /api/admin/email/test ───────────────────────────────────────────────
// Sends a test email of the given type to the requesting admin's address.

router.post('/email/test', async (req, res, next) => {
  try {
    const { type } = req.body;
    const admin = await User.findById(req.user.id).select('email name').lean();
    if (!admin) return res.status(404).json({ code: 'NOT_FOUND', message: 'Admin user not found.' });

    const map = {
      welcome:      () => EmailService.sendWelcome({ to: admin.email, userName: admin.name }),
      vaccination:  () => EmailService.sendVaccinationReminder({ to: admin.email, userName: admin.name, dogName: 'Milo (test)', vaccineName: 'Triple', nextDueDate: new Date(Date.now() + 7 * 864e5) }),
      deworming:    () => EmailService.sendDewormingReminder({ to: admin.email, userName: admin.name, dogName: 'Milo (test)', productName: 'Bravecto', nextDueDate: new Date(Date.now() + 30 * 864e5) }),
      medication:   () => EmailService.sendMedicationReminder({ to: admin.email, userName: admin.name, dogName: 'Milo (test)', medicationName: 'Carprofen', dosage: '25 mg' }),
      appointment:  () => EmailService.sendAppointmentReminder({ to: admin.email, userName: admin.name, dogName: 'Milo (test)', appointmentTitle: 'Control sano adulto', clinicName: 'Clínica Veterinaria Central', appointmentDate: new Date(Date.now() + 864e5) }),
      passwordReset: () => EmailService.sendPasswordReset({ to: admin.email, resetUrl: `${process.env.APP_URL || 'http://localhost:5173'}/reset-password?token=test` }),
      premiumInterest: () => EmailService.sendPremiumInterestNotification({ to: admin.email, userName: admin.name, userEmail: admin.email, userId: String(admin._id), dogsCount: 2, requestedAt: new Date() }),
      premiumInterestConfirmation: () => EmailService.sendPremiumInterestConfirmation({ to: admin.email, userName: admin.name }),
    };

    const send = map[type];
    if (!send) return res.status(400).json({ code: 'VALIDATION_ERROR', message: `Unknown type "${type}". Available: ${Object.keys(map).join(', ')}.` });

    await send();
    return res.json({ message: `Test email "${type}" sent to ${admin.email}.` });
  } catch (err) {
    // Surface Resend-specific errors as 400 so the admin panel shows them clearly
    const msg = err.message || '';
    if (msg.includes('API key') || msg.includes('invalid') || msg.includes('unauthorized')) {
      return res.status(400).json({
        code: 'EMAIL_CONFIG_ERROR',
        message: 'La API key de Resend es inválida o está mal configurada. Verificá RESEND_API_KEY en backend/.env.',
        detail: msg,
      });
    }
    next(err);
  }
});

// ── GET /api/admin/leads ─────────────────────────────────────────────────────

router.get('/leads', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const tipo = req.query.tipo;

    const filter = tipo && ['signup', 'founder'].includes(tipo) ? { tipo } : {};

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Lead.countDocuments(filter),
    ]);

    return res.json({ leads, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
