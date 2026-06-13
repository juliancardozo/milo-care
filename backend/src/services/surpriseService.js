'use strict';

const analytics = require('./analyticsService');
const { pool, stickers, factForBreed } = require('../config/surprisePool');
const { localDateString } = require('../utils/localTime');

/**
 * Recompensa variable de marca (Fase 4).
 *
 * Regla: al completar el check-in diario, con probabilidad configurable
 * (SURPRISE_PROBABILITY, default 0.15), aparece una sorpresa. Máximo 1 por día
 * (lastSurpriseOn) y nunca interrumpe la confirmación del check-in: el frontend
 * la pide DESPUÉS de la confirmación.
 *
 * Inyectable para tests: rng (función [0,1)) y probability/now opcionales.
 */

const BOOST_HOURS = 48;
const BOOSTED_REWARD_DAYS = 45;

function defaultProbability() {
  const p = parseFloat(process.env.SURPRISE_PROBABILITY);
  return Number.isFinite(p) ? p : 0.15;
}

function pickFromPool(rng) {
  const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
  let roll = rng() * totalWeight;
  for (const item of pool) {
    roll -= item.weight;
    if (roll < 0) return item.type;
  }
  return pool[pool.length - 1].type;
}

/**
 * Tira por una sorpresa para el usuario tras un check-in.
 * @param {object} user - doc del usuario (full Mongoose doc; se guarda si hay sorpresa)
 * @param {object} dog - perro (para dato de raza)
 * @param {object} [opts] - { now, rng, probability }
 * @returns {Promise<object|null>} sorpresa o null
 */
async function rollForUser(user, dog, opts = {}) {
  const now = opts.now || new Date();
  const rng = opts.rng || Math.random;
  const probability = opts.probability != null ? opts.probability : defaultProbability();

  const tz = user?.notificationPreferences?.timezone || 'America/Argentina/Buenos_Aires';
  const localDate = localDateString(tz, now);

  // ≤1 por día.
  if (user.lastSurpriseOn === localDate) return null;
  // Tirada de probabilidad.
  if (rng() >= probability) return null;

  const type = pickFromPool(rng);
  let surprise;

  if (type === 'sticker') {
    const stickerId = stickers[Math.floor(rng() * stickers.length)] || stickers[0];
    surprise = { type, stickerId };
  } else if (type === 'boosted_referral') {
    user.referralBoostUntil = new Date(now.getTime() + BOOST_HOURS * 3600 * 1000);
    surprise = { type, rewardDays: BOOSTED_REWARD_DAYS, validHours: BOOST_HOURS };
  } else {
    surprise = { type: 'breed_fact', fact: factForBreed(dog?.breed) };
  }

  user.lastSurpriseOn = localDate;
  await user.save();

  analytics.track('surprise_shown', { userId: user._id, dogId: dog?._id || null, channel: 'app', meta: { type: surprise.type } });

  return surprise;
}

module.exports = { rollForUser, pickFromPool, BOOST_HOURS, BOOSTED_REWARD_DAYS };
