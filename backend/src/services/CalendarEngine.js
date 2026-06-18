'use strict';

const { calculate } = require('./RiskProfileCalculator');
const { getSchedule, buildDueDate } = require('./VaccineRulesEngine');
const { calculateAgeInMonths, lifeStageFromAgeMonths } = require('./ValidationService');
const {
  internalDewormingIntervalDays,
  nextDewormingDueDate,
} = require('./preventiveScheduling');

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

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function generateDewormingSchedule(dog, existingDeworming = [], riskProfile = { level: 'low', factors: [] }) {
  const ageMonths = calculateAgeInMonths(dog.birthDate || dog.dateOfBirth);
  const riskLevel = riskProfile.level || 'low';
  const needsValidation = riskLevel === 'high' || !dog.hasVeterinarian;
  const history = Array.isArray(existingDeworming) ? existingDeworming : [];
  const events = [];

  // ── Interno: cadencia por etapa de vida (Fase C) ──────────────────────────
  const internalDays = internalDewormingIntervalDays(ageMonths, riskLevel);
  const hasInternalHistory = history.some((d) => ['internal', 'both'].includes(String(d.parasiteType || 'internal')));
  const internalDue = addDays(new Date(), hasInternalHistory ? internalDays : 30);
  events.push({
    id: `deworm-int-${Math.random().toString(36).slice(2, 8)}`,
    productName: hasInternalHistory ? 'Desparasitación interna de seguimiento' : 'Plan inicial de desparasitación interna',
    parasiteType: 'internal',
    dateAdministered: null,
    nextDueDate: internalDue,
    nextReminderAt: internalDue,
    veterinarian: '',
    notes: `Desparasitación interna sugerida cada ${internalDays} días según etapa de vida y riesgo. Consultá con tu veterinario.`,
    status: needsValidation ? 'pending_vet_validation' : 'suggested',
    source: 'suggested',
    requiresVetValidation: needsValidation,
  });

  // ── Externo: cadencia por producto cargado (Fase B) ───────────────────────
  // Si ya hay un antiparasitario externo en el historial, derivamos el próximo
  // del propio producto (Bravecto 3 meses, pipeta mensual, collar ~7 meses…).
  const lastExternal = [...history]
    .filter((d) => ['external', 'both'].includes(String(d.parasiteType)))
    .sort((a, b) => new Date(b.dateAdministered || 0) - new Date(a.dateAdministered || 0))[0];
  if (lastExternal) {
    const next = nextDewormingDueDate({
      productName: lastExternal.productName,
      parasiteType: 'external',
      fromDate: lastExternal.dateAdministered || new Date(),
      ageMonths,
      riskLevel,
    });
    events.push({
      id: `deworm-ext-${Math.random().toString(36).slice(2, 8)}`,
      productName: `Antiparasitario externo de seguimiento (${lastExternal.productName || 'producto'})`,
      parasiteType: 'external',
      dateAdministered: null,
      nextDueDate: next.dueDate,
      nextReminderAt: next.dueDate,
      veterinarian: '',
      notes: next.note,
      status: needsValidation ? 'pending_vet_validation' : 'suggested',
      source: 'suggested',
      requiresVetValidation: needsValidation,
    });
  }

  return events;
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
