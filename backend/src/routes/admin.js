'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const User = require('../models/User');
const Lead = require('../models/Lead');
const Event = require('../models/Event');
const Partner = require('../models/Partner');
const { deleteUserEvents } = require('../core/events/eventBus');
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
  dailyCheckin: () => EmailService._templates.dailyCheckin({ userName: 'Julián', dogs: [{ dogName: 'Milo', question: 'energia', focus: null, urls: { bien: '#', regular: '#', mal: '#' } }] }),
  symptomAlert: () => EmailService._templates.symptomAlert({ userName: 'Julián', dogName: 'Milo', count: 2, windowHours: 24, isPuppy: false }),
  referralActivated: () => EmailService._templates.referralActivated({ userName: 'Julián', referredName: 'Sofía', rewardDays: 30 }),
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
      partnerId: user.partnerId || null,
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
    const { name, tier, role, partnerId } = req.body;

    if (tier !== undefined && !['free', 'premium'].includes(tier)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'tier must be free or premium.' });
    }
    if (role !== undefined && !['user', 'admin', 'partner_admin'].includes(role)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'role must be user, admin or partner_admin.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' });

    // Vínculo a un partner (para partner_admin). null/'' lo desvincula.
    if (partnerId !== undefined) {
      if (partnerId === null || partnerId === '') {
        user.partnerId = null;
      } else {
        const partner = await Partner.findById(partnerId).select('_id');
        if (!partner) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'partnerId does not exist.' });
        user.partnerId = partner._id;
      }
    }

    if (name !== undefined) user.name = String(name).trim();
    if (tier !== undefined) user.tier = tier;
    if (role !== undefined) user.role = role;

    // Un partner_admin necesita un partner vinculado.
    if (user.role === 'partner_admin' && !user.partnerId) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'partner_admin requires a partnerId.' });
    }

    await user.save();

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      tier: user.tier,
      role: user.role,
      partnerId: user.partnerId || null,
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

    await deleteUserEvents(req.params.id); // GDPR: borra el event log del usuario

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
      dailyCheckin: () => EmailService.sendDailyCheckin({ to: admin.email, userName: admin.name, dogs: [{ dogName: 'Milo (test)', question: 'energia', focus: null, urls: { bien: '#', regular: '#', mal: '#' } }] }),
      symptomAlert: () => EmailService.sendSymptomAlert({ to: admin.email, userName: admin.name, dogName: 'Milo (test)', count: 2, windowHours: 24, isPuppy: false }),
      referralActivated: () => EmailService.sendReferralActivated({ to: admin.email, userName: admin.name, referredName: 'Sofía (test)', rewardDays: 30 }),
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

// ── GET /api/admin/metrics/summary ───────────────────────────────────────────
// Agregados de engagement/crecimiento. KPI norte: % de usuarios activos que
// responden el check-in ≥5 días en los últimos 7 días.

router.get('/metrics/summary', async (_req, res, next) => {
  try {
    const now = new Date();
    const since7 = new Date(now.getTime() - 7 * 864e5);
    const since28 = new Date(now.getTime() - 28 * 864e5);

    // Conteo de eventos por tipo (últimos 7 y 28 días) sobre el event log.
    const [counts7, counts28] = await Promise.all([
      Event.aggregate([
        { $match: { ts: { $gte: since7 } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Event.aggregate([
        { $match: { ts: { $gte: since28 } } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    const toMap = (rows) => rows.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {});

    // KPI: días distintos con check-in respondido por usuario en los últimos 7 días.
    const perUserDays = await Event.aggregate([
      { $match: { type: 'checkin.answered', ts: { $gte: since7 }, userId: { $ne: null } } },
      { $group: { _id: { userId: '$userId', day: { $dateToString: { format: '%Y-%m-%d', date: '$ts' } } } } },
      { $group: { _id: '$_id.userId', days: { $sum: 1 } } },
    ]);

    const activeUsers = perUserDays.length;
    const usersWith5Plus = perUserDays.filter((u) => u.days >= 5).length;
    const kpiPct = activeUsers > 0 ? Math.round((usersWith5Plus / activeUsers) * 100) : 0;

    // Serie semanal (últimas 4 semanas) de check-ins respondidos.
    const weekly = await Event.aggregate([
      { $match: { type: 'checkin.answered', ts: { $gte: since28 } } },
      { $group: { _id: { $dateToString: { format: '%Y-%U', date: '$ts' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    return res.json({
      generatedAt: now,
      eventsLast7Days: toMap(counts7),
      eventsLast28Days: toMap(counts28),
      checkinKpi: {
        activeUsers,
        usersAnswering5PlusDays: usersWith5Plus,
        pctAnswering5PlusDays: kpiPct,
      },
      checkinsAnsweredWeekly: weekly.map((w) => ({ week: w._id, count: w.count })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/notifications/funnel ──────────────────────────────────────
// Embudo de notificaciones (Fase 4): enviadas → clics → conversiones por campaña,
// con CTR y tasa de conversión. ?days=N (default 28).
router.get('/notifications/funnel', async (req, res, next) => {
  try {
    const days = Math.min(180, Math.max(1, Number(req.query.days) || 28));
    const since = new Date(Date.now() - days * 864e5);

    const rows = await Event.aggregate([
      { $match: { type: { $in: ['notification.sent', 'notification.clicked', 'notification.converted'] }, ts: { $gte: since } } },
      { $group: { _id: { campaign: '$payload.campaign', type: '$type' }, count: { $sum: 1 } } },
    ]);

    // Reorganiza a { campaign: { sent, clicked, converted } }.
    const byCampaign = {};
    for (const r of rows) {
      const c = r._id.campaign || 'unknown';
      const key = r._id.type.split('.')[1]; // sent | clicked | converted
      (byCampaign[c] ||= { sent: 0, clicked: 0, converted: 0 })[key] = r.count;
    }

    const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
    const campaigns = Object.entries(byCampaign).map(([campaign, f]) => ({
      campaign,
      ...f,
      ctr: pct(f.clicked, f.sent),
      conversionRate: pct(f.converted, f.sent),
    })).sort((a, b) => b.sent - a.sent);

    const totals = campaigns.reduce((t, c) => ({
      sent: t.sent + c.sent, clicked: t.clicked + c.clicked, converted: t.converted + c.converted,
    }), { sent: 0, clicked: 0, converted: 0 });

    return res.json({
      generatedAt: new Date(),
      windowDays: days,
      totals: { ...totals, ctr: pct(totals.clicked, totals.sent), conversionRate: pct(totals.converted, totals.sent) },
      campaigns,
    });
  } catch (err) {
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
