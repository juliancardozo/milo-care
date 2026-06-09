'use strict';

const express = require('express');
const User = require('../models/User');

const router = express.Router();

// Vencimiento futuro más próximo entre ítems de salud (ignora cancelados).
function soonestDueDate(items) {
  const now = new Date();
  return (items || [])
    .filter((it) => it && it.nextDueDate && it.status !== 'cancelled')
    .map((it) => new Date(it.nextDueDate))
    .filter((d) => !isNaN(d.getTime()) && d >= now)
    .sort((a, b) => a - b)[0] || null;
}

// GET /api/public/dogs/:dogId
// Ficha pública (SIN autenticación) pensada para el QR del pase de Google Wallet: quien
// encuentra al perro escanea y ve datos de identidad + contacto del tutor/veterinario.
// Solo expone campos seguros, nunca el historial clínico completo ni datos de la cuenta.
router.get('/dogs/:dogId', async (req, res, next) => {
  try {
    const user = await User.findOne({ 'dogs._id': req.params.dogId })
      .select('name dogs');
    const dog = user && user.dogs.id(req.params.dogId);
    if (!dog) {
      return res.status(404).json({ code: 'DOG_NOT_FOUND', message: 'Dog not found.' });
    }

    const nextVaccine = soonestDueDate(dog.vaccinations);
    const nextDeworming = soonestDueDate(dog.dewormingHistory);

    return res.json({
      name: dog.name,
      breed: dog.breed,
      photoUrl: dog.photoUrl || null,
      microchipId: dog.microchipId || '',
      ownerName: user.name || '',
      ownerPhone: dog.ownerPhone || '',
      veterinarianName: dog.veterinarianName || '',
      veterinarianPhone: dog.veterinarianPhone || '',
      nextVaccineDate: nextVaccine,
      nextDewormingDate: nextDeworming,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
