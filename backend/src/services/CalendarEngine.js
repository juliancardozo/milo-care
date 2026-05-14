'use strict';

const { calculate } = require('./RiskProfileCalculator');
const { getSchedule, buildDueDate } = require('./VaccineRulesEngine');
const { calculateAgeInMonths, lifeStageFromAgeMonths } = require('./ValidationService');

function toPlainDate(date) {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function mapVaccines(existingVaccines = []) {
  return existingVaccines.map((item) => ({
    id: item._id || item.id,
    vaccineType: item.vaccineName,
    antigens: [],
    administeredAt: item.dateAdministered || null,
    nextDueAt: item.nextDueDate || item.nextReminderAt || null,
    lotNumber: item.lotNumber || null,
    vetName: item.veterinarian || '',
    documentUrl: item.documentUrl || null,
    status: item.status || 'completed',
    source: item.source || 'manual',
    requiresVetValidation: Boolean(item.requiresVetValidation),
  }));
}

function mapDeworming(existingDeworming = []) {
  return existingDeworming.map((item) => ({
    id: item._id || item.id,
    productName: item.productName,
    parasiteType: item.parasiteType || 'internal',
    administeredAt: item.dateAdministered || null,
    nextDueAt: item.nextDueDate || item.nextReminderAt || null,
    vetName: item.veterinarian || '',
    status: item.status || 'completed',
    source: item.source || 'manual',
    requiresVetValidation: Boolean(item.requiresVetValidation),
  }));
}

function mapAppointments(existingAppointments = []) {
  return existingAppointments.map((item) => ({
    id: item._id || item.id,
    type: item.type || 'initial_consult',
    clinicName: item.clinicName || '',
    scheduledAt: item.appointmentDate || null,
    reminderAt: item.reminderAt || null,
    status: item.status || 'suggested',
    notes: item.notes || '',
    source: item.source || 'manual',
  }));
}

function generateVaccineSchedule(dog, existingVaccines = [], riskProfile = { level: 'low', factors: [] }) {
  const ageMonths = calculateAgeInMonths(dog.birthDate || dog.dateOfBirth);
  const result = getSchedule(dog.countryProfile || 'AR', ageMonths, riskProfile, existingVaccines);
  return result.events.map((event) => ({
    id: `${event.vaccineName.toLowerCase().replace(/\s+/g, '-')}-${Math.random().toString(36).slice(2, 8)}`,
    vaccineType: event.vaccineName,
    administeredAt: null,
    nextDueAt: event.dueAt,
    vetName: '',
    notes: event.notes,
    lotNumber: '',
    documentUrl: null,
    status: event.status,
    source: event.source,
    requiresVetValidation: event.requiresVetValidation,
  }));
}

function generateDewormingSchedule(dog, existingDeworming = [], riskProfile = { level: 'low', factors: [] }) {
  const cadence = calculate(riskProfile?.lifestyle || {}).dewormingCadenceDays || riskProfile.dewormingCadenceDays || 90;
  const hasHistory = Array.isArray(existingDeworming) && existingDeworming.length > 0;
  const dueDate = buildDueDate(new Date(), hasHistory ? cadence : 30);

  return [
    {
      id: `deworm-${Math.random().toString(36).slice(2, 8)}`,
      productName: hasHistory ? 'Desparasitación de seguimiento' : 'Plan inicial de desparasitación',
      parasiteType: 'internal',
      dateAdministered: null,
      nextDueDate: dueDate,
      nextReminderAt: dueDate,
      veterinarian: '',
      notes: 'Cadencia de desparasitación sugerida según riesgo de estilo de vida. Consultá con tu veterinario.',
      status: riskProfile.level === 'high' || !dog.hasVeterinarian ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: riskProfile.level === 'high' || !dog.hasVeterinarian,
    },
  ];
}

function generateCheckupSchedule(dog, riskProfile = { level: 'low' }) {
  const baseDate = dog.birthDate || dog.dateOfBirth || new Date();
  const ageMonths = calculateAgeInMonths(baseDate);
  const stage = lifeStageFromAgeMonths(ageMonths);

  return [
    {
      id: `checkup-${Math.random().toString(36).slice(2, 8)}`,
      type: 'initial_consult',
      clinicName: dog.veterinarianName || 'Veterinario de confianza',
      scheduledAt: null,
      reminderAt: buildDueDate(new Date(), 1),
      status: 'suggested',
      notes: `Consulta inicial sugerida para un perro en etapa ${stage}.`,
      source: 'suggested',
    },
    ...(riskProfile.level === 'high'
      ? [
          {
            id: `checkup-${Math.random().toString(36).slice(2, 8)}`,
            type: 'follow_up',
            clinicName: dog.veterinarianName || 'Veterinario de confianza',
            scheduledAt: null,
            reminderAt: buildDueDate(new Date(), 90),
            status: 'pending_vet_validation',
            notes: 'Los planes de riesgo alto requieren revisiones más frecuentes.',
            source: 'suggested',
          },
        ]
      : []),
  ];
}

function buildCalendar(dog, options = {}) {
  const existingVaccines = options.existingVaccines || dog.vaccinations || [];
  const existingDeworming = options.existingDeworming || dog.dewormingHistory || [];
  const existingAppointments = options.existingAppointments || dog.appointments || [];
  const riskProfile = options.riskProfile || calculate(dog.lifestyle || {});
  const vaccines = options.vaccines || generateVaccineSchedule(dog, existingVaccines, riskProfile);
  const deworming = options.deworming || generateDewormingSchedule(dog, existingDeworming, riskProfile);
  const appointments = options.appointments || generateCheckupSchedule(dog, riskProfile);
  const ageMonths = calculateAgeInMonths(dog.birthDate || dog.dateOfBirth);
  const lifeStage = lifeStageFromAgeMonths(ageMonths);
  const missingData = [];

  if (!dog.hasVeterinarian) missingData.push('veterinarian');
  if (!dog.birthDate && dog.birthDateConfidence !== 'estimated') missingData.push('birthDate');
  if (!existingVaccines.length) missingData.push('vaccine_history');

  return {
    dog: {
      ...dog,
      ageMonths,
      lifeStage: dog.lifeStage || lifeStage,
      riskProfile: riskProfile.level,
    },
    riskProfile,
    vaccines: [...mapVaccines(existingVaccines), ...vaccines],
    deworming: [...mapDeworming(existingDeworming), ...deworming],
    appointments: [...mapAppointments(existingAppointments), ...appointments],
    missingData,
    disclaimer:
      'Este calendario es únicamente informativo. Revisalo con tu veterinario de confianza antes de tomar cualquier decisión clínica.',
  };
}

module.exports = {
  buildCalendar,
  generateVaccineSchedule,
  generateDewormingSchedule,
  generateCheckupSchedule,
  mapVaccines,
  mapDeworming,
  mapAppointments,
};
