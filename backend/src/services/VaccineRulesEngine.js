'use strict';

const vaccinationRules = require('../config/vaccinationRules');
const { calculateAgeInMonths, lifeStageFromAgeMonths } = require('./ValidationService');

function buildDueDate(baseDate, offsetMonths) {
  const date = new Date(baseDate);
  date.setMonth(date.getMonth() + offsetMonths);
  return date;
}

function getSchedule(country, ageMonths, riskProfile = { level: 'low', factors: [] }, existingVaccines = []) {
  const region = vaccinationRules[country] || vaccinationRules.AR;
  const stage = lifeStageFromAgeMonths(ageMonths);
  const now = new Date();
  const events = [];
  const existingNames = new Set((existingVaccines || []).map((item) => String(item.vaccineName || '').toLowerCase()));
  const isPuppy = ageMonths !== null && ageMonths !== undefined && ageMonths < 6;
  const requiresValidation = riskProfile.level === 'high' || existingVaccines.length === 0 || !ageMonths;

  if (isPuppy) {
    const weeks = ageMonths * 4.345;
    const firstDue = new Date(now);
    firstDue.setDate(firstDue.getDate() + Math.max(7, Math.round((8 - Math.min(weeks, 8)) * 7)));

    events.push({
      vaccineName: 'Triple',
      dueAt: firstDue,
      status: requiresValidation ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: requiresValidation,
      notes: 'Serie vacunal básica para cachorros. Requiere revisión veterinaria.',
    });
    events.push({
      vaccineName: 'Rabia',
      dueAt: buildDueDate(now, region.rabiesRequiredFromMonths),
      status: requiresValidation ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: requiresValidation,
      notes: 'El calendario de rabia depende de la normativa local y del criterio veterinario.',
    });
  } else {
    events.push({
      vaccineName: 'Triple (refuerzo)',
      dueAt: buildDueDate(now, 12),
      status: requiresValidation ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: requiresValidation,
      notes: 'Refuerzo anual sugerido para perros adultos y senior.',
    });
    events.push({
      vaccineName: 'Rabia',
      dueAt: buildDueDate(now, 12),
      status: requiresValidation ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: requiresValidation,
      notes: 'Los recordatorios de rabia se ajustan según la normativa local y el criterio veterinario.',
    });
  }

  if ((riskProfile.level === 'medium' || riskProfile.level === 'high') && !existingNames.has('leptospira')) {
    events.push({
      vaccineName: 'Leptospira',
      dueAt: buildDueDate(now, 6),
      status: requiresValidation ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: requiresValidation,
      notes: 'Vacuna condicional sugerida por riesgo de exposición ambiental.',
    });
  }

  if ((riskProfile.level === 'high' || riskProfile.factors.includes('daycare')) && !existingNames.has('bordetella')) {
    events.push({
      vaccineName: 'Bordetella',
      dueAt: buildDueDate(now, 6),
      status: 'pending_vet_validation',
      source: 'suggested',
      requiresVetValidation: true,
      notes: 'Sugerida por exposición social frecuente. Requiere confirmación veterinaria.',
    });
  }

  return {
    stage,
    events,
  };
}

function getNextDue(vaccineType, lastAdminDate, country = 'AR') {
  const region = vaccinationRules[country] || vaccinationRules.AR;
  if (!lastAdminDate) return buildDueDate(new Date(), vaccineType.toLowerCase().includes('rabies') ? region.rabiesRequiredFromMonths : 12);
  return buildDueDate(lastAdminDate, vaccineType.toLowerCase().includes('rabies') ? 12 : 12);
}

function validateMandates(country, vaccineType) {
  const region = vaccinationRules[country] || vaccinationRules.AR;
  const normalized = String(vaccineType || '').trim().toLowerCase();
  const isMandatory = normalized.includes('rabies');
  return {
    isMandatory,
    explanation: isMandatory
      ? `La vacuna antirrábica es obligatoria en ${country || 'AR/UY'} a partir de los ${region.rabiesRequiredFromMonths} meses.`
      : 'Esta vacuna es opcional o basada en riesgo. Consultá con tu veterinario de confianza.',
  };
}

function getTravelRestrictions(fromCountry, toCountry) {
  if (fromCountry === toCountry) {
    return { requiresRabies: false, expiryWindowMonths: 0, explanation: 'No se detectaron restricciones antirrábicas para viaje internacional.' };
  }
  return {
    requiresRabies: true,
    expiryWindowMonths: 12,
    explanation: 'Los viajes internacionales suelen requerir comprobante de vacunación antirrábica y revisión veterinaria.',
  };
}

module.exports = {
  getSchedule,
  getNextDue,
  validateMandates,
  getTravelRestrictions,
  buildDueDate,
};
