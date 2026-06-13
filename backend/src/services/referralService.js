'use strict';

const User = require('../models/User');
const Referral = require('../models/Referral');
const EmailService = require('./EmailService');
const analytics = require('./analyticsService');

/**
 * Programa de referidos recíproco (Fase 4).
 *
 * - Cada usuario tiene un código permanente (MILO-XXXX).
 * - El invitado se registra con el código → se crea un Referral `pending`.
 * - Al completar su PRIMER check-in, el Referral pasa a `activated` y ambos
 *   reciben 30 días de premium (recíproco).
 * - Anti-abuso: sin auto-referencia, email distinto, un invitado se referencia
 *   una sola vez (índice único), y máx. 10 recompensas por mes por referente.
 */

const REWARD_DAYS = 30;
const REWARD_DAYS_BOOSTED = 45; // sorpresa "código potenciado" vigente
const MONTHLY_REWARD_CAP = 10;
// Alfabeto sin caracteres ambiguos (0/O, 1/I/L).
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

function randomCode() {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `MILO-${s}`;
}

async function generateUniqueCode() {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = randomCode();
    // eslint-disable-next-line no-await-in-loop
    const existing = await User.findOne({ referralCode: code }).select('_id').lean();
    if (!existing) return code;
  }
  throw new Error('Could not generate a unique referral code.');
}

/** Asegura que el usuario tenga código (no persiste: el caller hace save). */
async function ensureUserHasCode(user) {
  if (!user.referralCode) {
    user.referralCode = await generateUniqueCode();
  }
  return user.referralCode;
}

/**
 * Registra una relación de referido cuando un nuevo usuario se registra con un
 * código. No bloquea el registro: si algo no valida, devuelve null silenciosamente.
 * @returns {Promise<Referral|null>}
 */
async function registerReferral({ code, newUser }) {
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode) return null;

  const referrer = await User.findOne({ referralCode: cleanCode });
  if (!referrer) return null;

  // Anti-abuso: no auto-referencia ni mismo email.
  if (String(referrer._id) === String(newUser._id)) return null;
  if (referrer.email && newUser.email && referrer.email.toLowerCase() === newUser.email.toLowerCase()) return null;

  try {
    const referral = await Referral.create({
      code: cleanCode,
      referrerUserId: referrer._id,
      referredUserId: newUser._id,
      referredEmail: newUser.email,
      status: 'pending',
    });
    analytics.track('referral_signup', { userId: referrer._id, meta: { referredUserId: String(newUser._id) } });
    return referral;
  } catch (err) {
    // Índice único: el invitado ya estaba referenciado. Ignorar.
    if (err.code === 11000) return null;
    throw err;
  }
}

/** Recompensas ya otorgadas por un referente en el mes calendario actual. */
async function rewardsThisMonth(referrerUserId, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Referral.countDocuments({
    referrerUserId,
    rewardGrantedAt: { $gte: start, $lt: end },
  });
}

/**
 * Activa el referido del usuario (si tiene uno pendiente) en su primer check-in.
 * Idempotente: si no hay referral pendiente, no hace nada.
 * @returns {Promise<{ activated: boolean, rewarded?: boolean }>}
 */
async function activateForReferredUser(referredUser, now = new Date()) {
  const referral = await Referral.findOne({ referredUserId: referredUser._id, status: 'pending' });
  if (!referral) return { activated: false };

  const referrer = await User.findById(referral.referrerUserId);
  if (!referrer) {
    // Referente borrado (GDPR): cerramos el referral sin recompensa.
    referral.status = 'activated';
    referral.activatedAt = now;
    await referral.save();
    return { activated: true, rewarded: false };
  }

  referral.status = 'activated';
  referral.activatedAt = now;

  // Cap mensual de recompensas por referente.
  const granted = await rewardsThisMonth(referrer._id, now);
  const withinCap = granted < MONTHLY_REWARD_CAP;

  if (withinCap) {
    // Código potenciado vigente del referente → 45 días en vez de 30.
    const boosted = referrer.referralBoostUntil && referrer.referralBoostUntil > now;
    const rewardDays = boosted ? REWARD_DAYS_BOOSTED : REWARD_DAYS;

    referrer.grantPremiumDays(rewardDays, now);
    referredUser.grantPremiumDays(rewardDays, now);
    referral.rewardGrantedAt = now;
    await referrer.save();
    await referredUser.save();

    analytics.track('referral_activated', { userId: referrer._id, dogId: null, meta: { referredUserId: String(referredUser._id), rewardDays, boosted } });

    EmailService.sendReferralActivated({
      to: referrer.email,
      userName: referrer.name,
      referredName: referredUser.name,
      rewardDays,
    }).catch((err) => console.error('[referral] activation email failed:', err.message));
  } else {
    analytics.track('referral_activated', { userId: referrer._id, meta: { referredUserId: String(referredUser._id), rewarded: false, reason: 'monthly_cap' } });
  }

  await referral.save();
  return { activated: true, rewarded: withinCap };
}

/** Datos de referidos del usuario para su perfil. */
async function getForUser(user) {
  await ensureUserHasCode(user);
  const referrals = await Referral.find({ referrerUserId: user._id }).sort({ createdAt: -1 }).lean();
  return {
    code: user.referralCode,
    total: referrals.length,
    activated: referrals.filter((r) => r.status === 'activated').length,
    referrals: referrals.map((r) => ({
      id: r._id,
      status: r.status,
      referredEmail: r.referredEmail,
      activatedAt: r.activatedAt,
      rewardGranted: Boolean(r.rewardGrantedAt),
      createdAt: r.createdAt,
    })),
  };
}

module.exports = {
  ensureUserHasCode,
  generateUniqueCode,
  registerReferral,
  activateForReferredUser,
  getForUser,
  rewardsThisMonth,
  REWARD_DAYS,
  MONTHLY_REWARD_CAP,
};
