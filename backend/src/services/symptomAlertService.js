'use strict';

/**
 * Regla de alerta acumulativa de síntomas (Fase 2).
 *
 * Foco en vómitos: ≥2 en 24h en adultos, o 1 en cachorros (edad < 12 meses),
 * respetando la edad del perro. Lógica pura y testeable: recibe el perro y sus
 * síntomas, no toca DB.
 */

const VOMIT_WINDOW_HOURS = 24;
const PUPPY_AGE_MONTHS = 12;

function ageMonthsFromDog(dog) {
  if (dog?.dateOfBirth) {
    const dob = new Date(dog.dateOfBirth);
    if (!Number.isNaN(dob.getTime())) {
      const now = new Date();
      let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
      if (now.getDate() < dob.getDate()) months -= 1;
      return Math.max(0, months);
    }
  }
  if (dog?.estimatedAgeMonths != null) return Number(dog.estimatedAgeMonths);
  return null;
}

function isVomitSymptom(s) {
  if (s?.quickType === 'vomito') return true;
  const text = `${s?.symptomType || ''} ${s?.description || ''}`.toLowerCase();
  return text.includes('vomit') || text.includes('vómit');
}

/**
 * Evalúa si los vómitos recientes ameritan una alerta de consulta.
 * @param {object} dog - subdoc del perro (dateOfBirth / estimatedAgeMonths)
 * @param {Array} symptoms - síntomas del perro [{quickType, symptomType, description, dateObserved}]
 * @param {Date} now - referencia temporal (los tests la inyectan)
 * @returns {{ triggered, type, count, threshold, isPuppy, windowHours }}
 */
function evaluateVomitRule(dog, symptoms = [], now = new Date()) {
  const ageMonths = ageMonthsFromDog(dog);
  const isPuppy = ageMonths !== null && ageMonths < PUPPY_AGE_MONTHS;
  const threshold = isPuppy ? 1 : 2;

  const since = new Date(now.getTime() - VOMIT_WINDOW_HOURS * 3600 * 1000);
  const recentVomits = (symptoms || []).filter((s) => {
    if (!isVomitSymptom(s)) return false;
    const d = new Date(s.dateObserved);
    return !Number.isNaN(d.getTime()) && d >= since && d <= now;
  });

  return {
    triggered: recentVomits.length >= threshold,
    type: 'vomito',
    count: recentVomits.length,
    threshold,
    isPuppy,
    windowHours: VOMIT_WINDOW_HOURS,
  };
}

module.exports = { evaluateVomitRule, isVomitSymptom, PUPPY_AGE_MONTHS, VOMIT_WINDOW_HOURS };
