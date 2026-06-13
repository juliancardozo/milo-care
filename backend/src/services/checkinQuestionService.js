'use strict';

const { QUESTIONS } = require('../models/DailyCheckin');
const { getActiveRules } = require('../config/symptomRiskRules');

/**
 * Servicio de selección de la pregunta del check-in diario.
 *
 * Dos responsabilidades:
 *  1. Rotación DETERMINÍSTICA (no aleatoria) con cobertura semanal de las 5
 *     categorías: el índice se deriva de los días transcurridos desde la época,
 *     por lo que cicla las 5 preguntas cada 5 días → toda ventana de 7 días las
 *     cubre a todas.
 *  2. Especialización por fenotipo/raza: si symptomRiskRules.js matchea al perro
 *     y hubo ≥2 respuestas recientes `regular`/`mal` en una categoría relacionada
 *     con esa regla, la pregunta del día se especializa hacia esa categoría con un
 *     `focus` (alertType) para que el copy se ajuste (ej. braquicéfalo + energía
 *     baja → foco respiratorio).
 *
 * El servicio es PURO: recibe los check-ins recientes ya consultados, no toca DB.
 */

// Cuántos días hacia atrás miramos para detectar un patrón que dispare la
// especialización, y cuántas respuestas negativas se necesitan.
const RECENT_WINDOW_DAYS = 3;
const NEGATIVE_THRESHOLD = 2;
const NEGATIVE_ANSWERS = ['regular', 'mal'];

/**
 * Mapeo categoría de check-in → tipos de alerta de symptomRiskRules con los que
 * se relaciona. Si una categoría viene "mal" y el perro tiene una regla activa de
 * alguno de estos alertTypes, especializamos hacia esa categoría.
 */
const CATEGORY_ALERT_TYPES = {
  energia: ['respiratory', 'cardiac', 'orthopedic', 'neurological'],
  comida: ['gastrointestinal', 'parasitological'],
  agua: ['cardiac', 'parasitological'],
  animo: ['neurological', 'orthopedic'],
  digestion: ['gastrointestinal', 'parasitological'],
};

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

/**
 * Días enteros desde la época Unix para una fecha local YYYY-MM-DD.
 * Determinístico e independiente de la zona horaria.
 */
function epochDayFromLocalDate(localDate) {
  const [y, m, d] = String(localDate).split('-').map(Number);
  return Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86400000);
}

/**
 * Pregunta base por rotación determinística.
 * @param {string} localDate - 'YYYY-MM-DD'
 * @returns {string} slug de QUESTIONS
 */
function baseQuestionForDate(localDate) {
  const idx = ((epochDayFromLocalDate(localDate) % QUESTIONS.length) + QUESTIONS.length) % QUESTIONS.length;
  return QUESTIONS[idx];
}

/**
 * Match "estricto" de una regla con el perro: o bien la raza matchea explícitamente
 * (no por la convención de matchBreeds vacío = todas), o bien hay un flag de
 * lifestyle realmente activo. Esto evita especializar por reglas solo-lifestyle que
 * getActiveRules considera activas en cualquier perro cuando matchBreeds está vacío.
 */
function ruleAppliesStrict(rule, breed, lifestyle) {
  const breedLower = String(breed || '').toLowerCase();
  const breedHit = rule.matchBreeds.length > 0 && rule.matchBreeds.some((b) => breedLower.includes(b.toLowerCase()));
  const lifestyleHit = rule.matchLifestyle.some((flag) => lifestyle && lifestyle[flag]);
  return breedHit || lifestyleHit;
}

/**
 * Detecta una categoría "preocupante": ≥2 respuestas negativas recientes que,
 * además, se relacionan con alguna regla de riesgo activa del perro.
 * @returns {{ category, alertType, ruleId } | null}
 */
function detectConcern(dog, recentCheckins, localDate) {
  const lifestyle = dog?.lifestyle || {};
  const activeRules = getActiveRules(dog?.breed || '', lifestyle, ageMonthsFromDog(dog))
    .filter((rule) => ruleAppliesStrict(rule, dog?.breed, lifestyle));
  if (!activeRules.length) return null;

  const minEpochDay = epochDayFromLocalDate(localDate) - RECENT_WINDOW_DAYS;

  // Contar respuestas negativas recientes por categoría.
  const negativeByCategory = {};
  for (const c of recentCheckins || []) {
    if (!NEGATIVE_ANSWERS.includes(c.answer)) continue;
    if (epochDayFromLocalDate(c.localDate) < minEpochDay) continue;
    negativeByCategory[c.question] = (negativeByCategory[c.question] || 0) + 1;
  }

  // Buscar la primera categoría que supere el umbral y matchee un alertType activo.
  for (const category of QUESTIONS) {
    if ((negativeByCategory[category] || 0) < NEGATIVE_THRESHOLD) continue;
    const relatedTypes = CATEGORY_ALERT_TYPES[category] || [];
    const rule = activeRules.find((r) => relatedTypes.includes(r.alertType));
    if (rule) {
      return { category, alertType: rule.alertType, ruleId: rule.id };
    }
  }
  return null;
}

/**
 * Pregunta del día para un perro.
 * @param {object} dog - subdoc del perro (breed, lifestyle, dateOfBirth…)
 * @param {string} localDate - 'YYYY-MM-DD' en la TZ del usuario
 * @param {Array} recentCheckins - check-ins recientes del perro [{question, answer, localDate}]
 * @returns {{ question, focus, specialized, reason }}
 */
function questionForDate(dog, localDate, recentCheckins = []) {
  const concern = detectConcern(dog, recentCheckins, localDate);
  if (concern) {
    return {
      question: concern.category,
      focus: concern.alertType,
      specialized: true,
      reason: { category: concern.category, ruleId: concern.ruleId },
    };
  }
  return {
    question: baseQuestionForDate(localDate),
    focus: null,
    specialized: false,
    reason: null,
  };
}

module.exports = {
  questionForDate,
  baseQuestionForDate,
  detectConcern,
  CATEGORY_ALERT_TYPES,
  RECENT_WINDOW_DAYS,
  NEGATIVE_THRESHOLD,
};
