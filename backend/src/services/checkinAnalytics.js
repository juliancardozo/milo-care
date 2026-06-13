'use strict';

const { QUESTIONS } = require('../models/DailyCheckin');
const { addDaysToLocalDate } = require('../utils/localTime');

/**
 * Agregaciones puras sobre check-ins (tendencias, patrones, racha). Sin DB: la
 * ruta consulta los documentos y se los pasa a estas funciones, que son las que
 * se testean.
 */

const NEGATIVE_ANSWERS = ['regular', 'mal'];
const PATTERN_MIN_RUN = 2; // ≥2 respuestas regular/mal consecutivas dispara el banner

function emptyCategoryCounts() {
  return QUESTIONS.reduce((acc, q) => {
    acc[q] = { bien: 0, regular: 0, mal: 0, total: 0 };
    return acc;
  }, {});
}

/**
 * Cuenta respuestas por categoría dentro de una ventana de N días terminando hoy.
 */
function countsForWindow(checkins, todayLocalDate, windowDays) {
  const since = addDaysToLocalDate(todayLocalDate, -(windowDays - 1));
  const counts = emptyCategoryCounts();
  for (const c of checkins) {
    if (c.localDate < since || c.localDate > todayLocalDate) continue;
    const cat = counts[c.question];
    if (!cat) continue;
    if (cat[c.answer] != null) cat[c.answer] += 1;
    cat.total += 1;
  }
  return counts;
}

/**
 * Detecta, por categoría, la racha actual (trailing) de respuestas negativas
 * consecutivas. Devuelve un patrón por categoría cuya racha sea ≥ PATTERN_MIN_RUN.
 * "Consecutivas" se mide sobre los check-ins de esa categoría ordenados por fecha.
 */
function detectPatterns(checkins) {
  const byCategory = {};
  for (const c of checkins) {
    (byCategory[c.question] = byCategory[c.question] || []).push(c);
  }

  const patterns = [];
  for (const [category, list] of Object.entries(byCategory)) {
    const sorted = [...list].sort((a, b) => (a.localDate < b.localDate ? -1 : a.localDate > b.localDate ? 1 : 0));
    let run = 0;
    let lastAnswer = null;
    let lastDate = null;
    // Racha trailing: recorrer desde el final mientras sea negativa.
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (NEGATIVE_ANSWERS.includes(sorted[i].answer)) {
        run += 1;
        if (lastDate === null) { lastDate = sorted[i].localDate; lastAnswer = sorted[i].answer; }
      } else {
        break;
      }
    }
    if (run >= PATTERN_MIN_RUN) {
      patterns.push({ category, run, lastDate, lastAnswer });
    }
  }
  return patterns;
}

/**
 * Tendencias completas: conteos a 7 y 30 días + patrones negativos.
 */
function computeTrends(checkins, todayLocalDate) {
  return {
    window7: countsForWindow(checkins, todayLocalDate, 7),
    window30: countsForWindow(checkins, todayLocalDate, 30),
    patterns: detectPatterns(checkins),
  };
}

/**
 * Racha de cuidado: días consecutivos con al menos un check-in, terminando hoy.
 * Si todavía no respondió hoy pero respondió ayer, la racha sigue viva (se cuenta
 * desde ayer). Cero culpa: si se corta, simplemente vuelve a 0.
 * @param {Set<string>|Array<string>} dates - fechas locales con check-in
 * @param {string} todayLocalDate
 */
function computeStreak(dates, todayLocalDate) {
  const set = dates instanceof Set ? dates : new Set(dates);
  let cursor = todayLocalDate;
  if (!set.has(cursor)) cursor = addDaysToLocalDate(todayLocalDate, -1);
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = addDaysToLocalDate(cursor, -1);
  }
  return streak;
}

module.exports = {
  computeTrends,
  computeStreak,
  detectPatterns,
  countsForWindow,
  PATTERN_MIN_RUN,
};
