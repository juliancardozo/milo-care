'use strict';

const vaccinationRules = require('../config/vaccinationRules');
const { calculateAgeInMonths, lifeStageFromAgeMonths } = require('./ValidationService');
const { nextVaccineDueDate } = require('./preventiveScheduling');

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
  // Deriva la próxima dosis del catálogo clínico (rabia anual, core 3 años, etc.).
  const from = lastAdminDate ? new Date(lastAdminDate) : new Date();
  const suggestion = nextVaccineDueDate({ vaccineName: vaccineType, fromDate: from, country });
  if (suggestion) return suggestion.dueDate;
  // Fallback para vacunas no catalogadas: refuerzo anual.
  return buildDueDate(from, 12);
}

function validateMandates(country, vaccineType) {
  const region = vaccinationRules[String(country || 'AR').toUpperCase()] || vaccinationRules.AR;
  const normalized = String(vaccineType || '').trim().toLowerCase();
  const isRabies = normalized.includes('rabia') || normalized.includes('rabies') || normalized.includes('rabica');

  if (!isRabies) {
    return {
      isMandatory: false,
      explanation: 'Esta vacuna es recomendación profesional/WSAVA basada en riesgo, no obligatoria por ley. Consultá con tu veterinario de confianza.',
    };
  }

  // Rabia: el matiz regulatorio depende del país.
  const rabies = region.rabies || {};
  return {
    isMandatory: Boolean(rabies.mandatory),
    explanation: rabies.note
      || `Antirrábica: aplicable desde los ${region.rabiesRequiredFromMonths} meses.`,
    authority: rabies.authority || null,
    law: rabies.law || null,
    reason: rabies.reason || null,
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
