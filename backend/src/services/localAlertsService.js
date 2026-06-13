'use strict';

const { rules } = require('../config/localAlertRules');
const { rules: symptomRules } = require('../config/symptomRiskRules');
const { localDateString } = require('../utils/localTime');

// Lista de razas braquicéfalas de symptomRiskRules (match estricto por raza, no
// la convención de matchBreeds vacío = todas, que considera activos a todos).
const BRACHY_BREEDS = (symptomRules.find((r) => r.id === 'brachycephalic')?.matchBreeds) || [];

/**
 * Alertas locales estacionales (Fase 5).
 *
 * Cruza la zona opt-in del tutor (user.location, sin coordenadas) con el mes
 * actual y la raza de los perros para devolver alertas preventivas. Puro y
 * testeable: recibe el usuario y sus perros, no toca DB.
 */

function isBrachycephalic(dog) {
  const breed = String(dog?.breed || '').toLowerCase();
  return BRACHY_BREEDS.some((b) => breed.includes(b.toLowerCase()));
}

function zoneLabel(location) {
  return location.city || location.region || (location.country === 'UY' ? 'Uruguay' : 'Argentina');
}

function dogsLabel(dogs) {
  const names = (dogs || []).map((d) => d.name).filter(Boolean);
  if (names.length === 0) return 'tu perro';
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

function fill(text, { zone, dogs }) {
  return text.replace('{zone}', zone).replace('{dogs}', dogs);
}

/**
 * Devuelve las alertas locales vigentes para el usuario.
 * @param {object} user - doc con location + locationConsentAt
 * @param {Array} dogs - perros del usuario
 * @param {Date} now
 * @returns {Array<{type,title,message,cta,emoji}>}
 */
function getActiveLocalAlerts(user, dogs = [], now = new Date()) {
  const loc = user?.location;
  if (!loc || !loc.country) return [];

  const tz = user?.notificationPreferences?.timezone || 'America/Argentina/Buenos_Aires';
  const month = Number(localDateString(tz, now).split('-')[1]); // mes en la TZ del usuario
  const zone = zoneLabel(loc);
  const alerts = [];

  // Garrapatas/pulgas.
  const tick = rules.tick;
  if ((tick.monthsByCountry[loc.country] || []).includes(month)) {
    alerts.push({
      type: 'tick',
      emoji: tick.emoji,
      title: tick.title,
      message: fill(tick.message, { zone, dogs: dogsLabel(dogs) }),
      cta: tick.cta,
    });
  }

  // Calor: solo si hay al menos un perro braquicéfalo.
  const heat = rules.heat;
  if ((heat.monthsByCountry[loc.country] || []).includes(month)) {
    const brachyDogs = (dogs || []).filter(isBrachycephalic);
    if (!heat.brachycephalicOnly || brachyDogs.length > 0) {
      alerts.push({
        type: 'heat',
        emoji: heat.emoji,
        title: heat.title,
        message: fill(heat.message, { zone, dogs: dogsLabel(brachyDogs.length ? brachyDogs : dogs) }),
        cta: heat.cta,
      });
    }
  }

  return alerts;
}

module.exports = { getActiveLocalAlerts, isBrachycephalic };
