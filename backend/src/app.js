'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const dogsRoutes = require('./routes/dogs');
const vaccinationsRoutes = require('./routes/vaccinations');
const medicationsRoutes = require('./routes/medications');
const appointmentsRoutes = require('./routes/appointments');
const symptomsRoutes = require('./routes/symptoms');
const consultationsRoutes = require('./routes/consultations');
const remindersRoutes = require('./routes/reminders');
const usersRoutes = require('./routes/users');
const onboardingRoutes = require('./routes/onboarding');
const calendarRoutes = require('./routes/calendar');
const eventsRoutes = require('./routes/events');
const vaccinesRoutes = require('./routes/vaccines');
const adminRoutes = require('./routes/admin');
const landingRoutes = require('./routes/landing');
const billingRoutes = require('./routes/billing');

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173', credentials: true }));
// Captura el raw body antes de parsear JSON — necesario para verificar la firma de
// los webhooks de MercadoPago (HMAC-SHA256 sobre el payload original).
app.use(express.json({
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dogs', dogsRoutes);
app.use('/api/dogs/:dogId/vaccinations', vaccinationsRoutes);
app.use('/api/dogs/:dogId/medications', medicationsRoutes);
app.use('/api/dogs/:dogId/appointments', appointmentsRoutes);
app.use('/api/dogs/:dogId/symptoms', symptomsRoutes);
app.use('/api/dogs/:dogId/consultations', consultationsRoutes);
app.use('/api/dashboard/reminders', remindersRoutes);
app.use('/api/user', usersRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api', calendarRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/vaccines', vaccinesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api', landingRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found.' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
