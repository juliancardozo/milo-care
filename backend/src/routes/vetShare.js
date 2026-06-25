'use strict';

const crypto = require('crypto');
const express = require('express');
const authenticate = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const User = require('../models/User');
const Clinic = require('../models/Clinic');
const VetAttestation = require('../models/VetAttestation');
const AuditService = require('../services/AuditService');

// Identifica al certificador: vet logueado → su clínica (sello 'certified');
// anónimo (solo token) → sin identidad (sello 'verified').
async function resolveCertifier(req) {
  if (req.user && req.user.role === 'vet') {
    const clinic = await Clinic.findOne({ ownerVetUserId: req.user.id }).select('name');
    return { vetUserId: req.user.id, clinicId: clinic?._id || null, clinicName: clinic?.name || null, source: 'vet_account' };
  }
  return { vetUserId: null, clinicId: null, clinicName: null, source: 'token' };
}

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
      // Consentimiento: el tutor habilita compartir el expediente con un vet.
      AuditService.record({
        userId: user._id,
        action: 'consent_given',
        meta: { scope: 'vet_record_share', dogId: String(dog._id) },
      });
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
    AuditService.record({
      userId: user._id,
      action: 'consent_revoked',
      meta: { scope: 'vet_record_share', dogId: String(dog._id) },
    });
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

// POST /api/vet/:token/validate → el vet atesta (valida) una vacuna o desparasitación.
// optionalAuth: si el vet está logueado, queda identificado → sello 'certified';
// si es anónimo (solo token) → sello 'verified'.
publicVetRouter.post('/:token/validate', optionalAuth, async (req, res, next) => {
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

    const attestedAt = new Date();
    item.requiresVetValidation = false;
    item.vetValidatedAt = attestedAt;
    if (item.status === 'pending_vet_validation') item.status = 'completed';
    await user.save();

    // Atestación discreta: una activa por (perro, ítem); re-validar la refresca.
    const certifier = await resolveCertifier(req);
    const label = kind === 'vaccination' ? item.vaccineName : item.productName;
    const expiresAt = item.nextDueDate
      ? new Date(item.nextDueDate)
      : new Date(attestedAt.getTime() + 365 * 86400000);

    await VetAttestation.findOneAndUpdate(
      { dogId: dog._id, kind, itemId: item._id, status: 'active' },
      {
        $set: {
          ownerUserId: user._id,
          dogId: dog._id,
          kind,
          itemId: item._id,
          label,
          attestedAt,
          expiresAt,
          status: 'active',
          ...certifier,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    AuditService.record({
      userId: user._id,
      action: 'attestation_signed',
      meta: { dogId: String(dog._id), kind, itemId: String(item._id), source: certifier.source, clinicId: certifier.clinicId ? String(certifier.clinicId) : null },
    });

    return res.json({
      id: item._id,
      vetValidatedAt: item.vetValidatedAt,
      status: item.status,
      attestation: { source: certifier.source, clinicName: certifier.clinicName, expiresAt },
    });
  } catch (err) { next(err); }
});

module.exports = { shareRouter, publicVetRouter };
