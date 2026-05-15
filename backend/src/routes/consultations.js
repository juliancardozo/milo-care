'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router({ mergeParams: true });

/**
 * GET /dogs/:dogId/consultations
 * Get all veterinary consultations for a dog
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { dogId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError('User not found');

    const dog = user.dogs?.id(dogId);
    if (!dog) throw new NotFoundError('Dog not found');

    res.json(dog.consultations || []);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /dogs/:dogId/consultations
 * Add a new veterinary consultation record
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { dogId } = req.params;
    const { vetName, clinicName, reason, dateOfConsult, findings, recommendations } = req.body;

    if (!reason || !dateOfConsult) {
      return res.status(400).json({
        message: 'Reason and date are required',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError('User not found');

    const dog = user.dogs?.id(dogId);
    if (!dog) throw new NotFoundError('Dog not found');

    const consultation = {
      vetName: vetName || '',
      clinicName: clinicName || '',
      reason: reason.trim(),
      dateOfConsult: new Date(dateOfConsult),
      findings: findings || '',
      recommendations: recommendations || '',
    };

    dog.consultations = dog.consultations || [];
    dog.consultations.push(consultation);

    await user.save();
    const savedConsult = dog.consultations[dog.consultations.length - 1];

    res.status(201).json(savedConsult);
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /dogs/:dogId/consultations/:consultId
 * Update a veterinary consultation record
 */
router.patch('/:consultId', authenticate, async (req, res, next) => {
  try {
    const { dogId, consultId } = req.params;
    const { vetName, clinicName, reason, dateOfConsult, findings, recommendations } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError('User not found');

    const dog = user.dogs?.id(dogId);
    if (!dog) throw new NotFoundError('Dog not found');

    const consultation = dog.consultations?.id(consultId);
    if (!consultation) throw new NotFoundError('Consultation not found');

    if (vetName !== undefined) consultation.vetName = vetName;
    if (clinicName !== undefined) consultation.clinicName = clinicName;
    if (reason !== undefined) consultation.reason = reason.trim();
    if (dateOfConsult !== undefined) consultation.dateOfConsult = new Date(dateOfConsult);
    if (findings !== undefined) consultation.findings = findings;
    if (recommendations !== undefined) consultation.recommendations = recommendations;

    await user.save();

    res.json(consultation);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /dogs/:dogId/consultations/:consultId
 * Delete a veterinary consultation record
 */
router.delete('/:consultId', authenticate, async (req, res, next) => {
  try {
    const { dogId, consultId } = req.params;

    const user = await User.findById(req.user.id);
    if (!user) throw new NotFoundError('User not found');

    const dog = user.dogs?.id(dogId);
    if (!dog) throw new NotFoundError('Dog not found');

    const consultation = dog.consultations?.id(consultId);
    if (!consultation) throw new NotFoundError('Consultation not found');

    dog.consultations?.id(consultId).deleteOne();
    await user.save();

    res.json({ message: 'Consultation deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
