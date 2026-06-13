'use strict';

const crypto = require('crypto');
const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

function appUrl() {
  return (
    process.env.VET_SHARE_PUBLIC_BASE_URL
    || process.env.APP_URL
    || 'https://milocare.online'
  ).replace(/\/+$/, '');
}

function newToken() {
  return crypto.randomBytes(18).toString('base64url');
}

function shareUrl(token) {
  return `${appUrl()}/vet/${token}`;
}

// Expediente de solo lectura que ve el veterinario (sin datos sensibles del tutor).
function buildVetRecord(user, dog) {
  return {
    dog: {
      name: dog.name,
      breed: dog.breed,
      photoUrl: dog.photoUrl || null,
      sex: dog.sex,
      neutered: dog.neutered,
      weightKg: dog.weightKg,
      dateOfBirth: dog.dateOfBirth,
      microchipId: dog.microchipId || null,
      allergies: dog.allergies || [],
      conditions: dog.conditions || [],
    },
    tutor: { name: (user.name || '').split(' ')[0] || '' },
    vaccinations: (dog.vaccinations || []).map((v) => ({
      id: v._id, vaccineName: v.vaccineName, dateAdministered: v.dateAdministered,
      nextDueDate: v.nextDueDate, veterinarian: v.veterinarian, status: v.status,
      requiresVetValidation: v.requiresVetValidation, vetValidatedAt: v.vetValidatedAt,
    })),
    dewormingHistory: (dog.dewormingHistory || []).map((d) => ({
      id: d._id, productName: d.productName, parasiteType: d.parasiteType,
      dateAdministered: d.dateAdministered, nextDueDate: d.nextDueDate, status: d.status,
      requiresVetValidation: d.requiresVetValidation, vetValidatedAt: d.vetValidatedAt,
    })),
    medications: (dog.medications || []).filter((m) => m.isActive).map((m) => ({
      id: m._id, medicationName: m.medicationName, dosage: m.dosage,
      oneTime: m.oneTime, frequencyHours: m.frequencyHours, startDate: m.startDate, endDate: m.endDate,
    })),
    appointments: (dog.appointments || []).filter((a) => !a.isCancelled).map((a) => ({
      id: a._id, title: a.title, appointmentDate: a.appointmentDate, clinicName: a.clinicName, vetName: a.vetName,
    })),
    symptoms: (dog.symptoms || []).map((s) => ({
      id: s._id, description: s.description, severity: s.severity, dateObserved: s.dateObserved, resolved: s.resolved,
    })),
    consultations: (dog.consultations || []).map((c) => ({
      id: c._id, reason: c.reason, dateOfConsult: c.dateOfConsult, vetName: c.vetName,
      findings: c.findings, recommendations: c.recommendations,
    })),
  };
}

// ── Gestión del link (tutor autenticado) ──────────────────────────────────
const shareRouter = express.Router({ mergeParams: true });

function loadOwnDog(req, res) {
  return User.findById(req.user.id).then((user) => {
    if (!user) { res.status(404).json({ code: 'NOT_FOUND', message: 'User not found.' }); return null; }
    const dog = user.dogs.id(req.params.dogId);
    if (!dog) { res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' }); return null; }
    return { user, dog };
  });
}

// GET /api/dogs/:dogId/vet-share → link actual (o null)
shareRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const found = await loadOwnDog(req, res);
    if (!found) return;
    const { dog } = found;
    if (!dog.vetShareToken) return res.json({ active: false });
    return res.json({ active: true, token: dog.vetShareToken, url: shareUrl(dog.vetShareToken), createdAt: dog.vetShareCreatedAt });
  } catch (err) { next(err); }
});

// POST /api/dogs/:dogId/vet-share → genera (o devuelve) el link
shareRouter.post('/', authenticate, async (req, res, next) => {
  try {
    const found = await loadOwnDog(req, res);
    if (!found) return;
    const { user, dog } = found;
    if (!dog.vetShareToken) {
      dog.vetShareToken = newToken();
      dog.vetShareCreatedAt = new Date();
      await user.save();
    }
    return res.status(201).json({ active: true, token: dog.vetShareToken, url: shareUrl(dog.vetShareToken), createdAt: dog.vetShareCreatedAt });
  } catch (err) { next(err); }
});

// DELETE /api/dogs/:dogId/vet-share → revoca el link
shareRouter.delete('/', authenticate, async (req, res, next) => {
  try {
    const found = await loadOwnDog(req, res);
    if (!found) return;
    const { user, dog } = found;
    dog.vetShareToken = null;
    dog.vetShareCreatedAt = null;
    await user.save();
    return res.json({ active: false });
  } catch (err) { next(err); }
});

// ── Acceso público del veterinario (sin auth) ─────────────────────────────
const publicVetRouter = express.Router();

async function findByToken(token) {
  if (!token) return null;
  const user = await User.findOne({ 'dogs.vetShareToken': token });
  if (!user) return null;
  const dog = user.dogs.find((d) => d.vetShareToken === token);
  if (!dog) return null;
  return { user, dog };
}

// GET /api/vet/:token → expediente de solo lectura
publicVetRouter.get('/:token', async (req, res, next) => {
  try {
    const found = await findByToken(req.params.token);
    if (!found) return res.status(404).json({ code: 'NOT_FOUND', message: 'Share link not found or revoked.' });
    return res.json(buildVetRecord(found.user, found.dog));
  } catch (err) { next(err); }
});

// POST /api/vet/:token/validate → el vet valida una vacuna o desparasitación
publicVetRouter.post('/:token/validate', async (req, res, next) => {
  try {
    const { kind, id } = req.body || {};
    if (!['vaccination', 'deworming'].includes(kind) || !id) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'kind (vaccination|deworming) and id are required.' });
    }
    const found = await findByToken(req.params.token);
    if (!found) return res.status(404).json({ code: 'NOT_FOUND', message: 'Share link not found or revoked.' });

    const { user, dog } = found;
    const collection = kind === 'vaccination' ? dog.vaccinations : dog.dewormingHistory;
    const item = collection.id(id);
    if (!item) return res.status(404).json({ code: 'NOT_FOUND', message: 'Record not found.' });

    item.requiresVetValidation = false;
    item.vetValidatedAt = new Date();
    if (item.status === 'pending_vet_validation') item.status = 'completed';
    await user.save();

    return res.json({ id: item._id, vetValidatedAt: item.vetValidatedAt, status: item.status });
  } catch (err) { next(err); }
});

module.exports = { shareRouter, publicVetRouter };
