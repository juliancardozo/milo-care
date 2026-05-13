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

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/dogs', dogsRoutes);
app.use('/api/dogs/:dogId/vaccinations', vaccinationsRoutes);
app.use('/api/dogs/:dogId/medications', medicationsRoutes);
app.use('/api/dogs/:dogId/appointments', appointmentsRoutes);
app.use('/api/dogs/:dogId/symptoms', symptomsRoutes);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found.' });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
