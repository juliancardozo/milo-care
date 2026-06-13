'use strict';

const { localDateString } = require('../utils/localTime');

/**
 * Detección de hitos compartibles (Fase 3).
 *
 * Función pura: recibe el perro y un contexto ya calculado (racha, logros,
 * estado de vacunas, antigüedad) y devuelve los hitos VIGENTES como candidatos.
 * La persistencia ("una sola vez") la maneja la colección Milestone vía el índice
 * único { dogId, key }.
 */

const STREAK_THRESHOLDS = [7, 30, 100];
const ACHIEVEMENT_THRESHOLDS = [5, 10, 25];
const FIRST_MONTH_DAYS = 30;
const VACCINES_TENURE_DAYS = 100;

function birthdayKey(dog, localToday) {
  if (!dog?.dateOfBirth) return null;
  const dob = new Date(dog.dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  // Comparar MM-DD en horario local (localToday = 'YYYY-MM-DD').
  const [, mm, dd] = localToday.split('-');
  const dobMm = String(dob.getUTCMonth() + 1).padStart(2, '0');
  const dobDd = String(dob.getUTCDate()).padStart(2, '0');
  if (mm === dobMm && dd === dobDd) {
    const year = localToday.split('-')[0];
    const age = Number(year) - dob.getUTCFullYear();
    return { key: `birthday_${year}`, type: 'birthday', value: { age } };
  }
  return null;
}

/**
 * @param {object} dog
 * @param {object} ctx - { now, tz, checkinStreak, achievementsCount, vaccinesUpToDate, tenureDays }
 * @returns {Array<{key,type,value}>}
 */
function detectMilestones(dog, ctx = {}) {
  const now = ctx.now || new Date();
  const tz = ctx.tz || 'America/Argentina/Buenos_Aires';
  const localToday = localDateString(tz, now);
  const out = [];

  // Rachas de check-in.
  for (const th of STREAK_THRESHOLDS) {
    if ((ctx.checkinStreak || 0) >= th) out.push({ key: `streak_${th}`, type: 'streak', value: { days: th } });
  }

  // Logros del álbum.
  for (const th of ACHIEVEMENT_THRESHOLDS) {
    if ((ctx.achievementsCount || 0) >= th) out.push({ key: `achievements_${th}`, type: 'achievements', value: { count: th } });
  }

  // Primer mes en Milo Care.
  if ((ctx.tenureDays || 0) >= FIRST_MONTH_DAYS) out.push({ key: 'first_month', type: 'first_month', value: {} });

  // 100 días con vacunas al día.
  if ((ctx.tenureDays || 0) >= VACCINES_TENURE_DAYS && ctx.vaccinesUpToDate) {
    out.push({ key: 'vaccines_100_days', type: 'vaccines_up_to_date', value: { days: VACCINES_TENURE_DAYS } });
  }

  // Cumpleaños del perro.
  const bday = birthdayKey(dog, localToday);
  if (bday) out.push(bday);

  return out;
}

module.exports = {
  detectMilestones,
  STREAK_THRESHOLDS,
  ACHIEVEMENT_THRESHOLDS,
  FIRST_MONTH_DAYS,
  VACCINES_TENURE_DAYS,
};
