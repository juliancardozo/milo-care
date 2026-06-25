'use strict';

/**
 * EntitlementService — ÚNICA fuente de verdad de qué features están habilitadas
 * para un (user, dog).
 *
 * Una feature se desbloquea por DOS caminos independientes:
 *   1) Premium personal del tutor  → `user.isPremiumActive()` (B2C existente).
 *   2) Patrocinio del partner       → `dog.sponsorshipStatus === 'sponsored'` (B2B2C).
 *
 * Ningún route handler debería tener lógica de tier inline: todos consultan
 * `EntitlementService`. Es ADITIVO sobre el modelo premium existente
 * (`User.isPremiumActive` / `premiumUntil`): no lo reemplaza, lo unifica con el
 * patrocinio.
 *
 * Funciones puras y testeables: aceptan documentos Mongoose o POJOs.
 */

// Features de alcance "usuario": solo las desbloquea el premium personal. El
// patrocinio de UN perro no las habilita (afectan a toda la cuenta).
const USER_FEATURES = Object.freeze(['unlimitedDogs']);

// Features de alcance "perro": se desbloquean por premium del tutor O por
// patrocinio de ese perro.
const DOG_FEATURES = Object.freeze([
  'pdfExport',
  'whatsappShare',
  'aiSymptomSummary',
  'advancedAlerts',
  'multiTutor',
]);

const GATED_FEATURES = Object.freeze([...USER_FEATURES, ...DOG_FEATURES]);

/** Premium efectivo del tutor (permanente o ventana `premiumUntil` vigente). */
function isPremium(user, now = new Date()) {
  if (!user) return false;
  if (typeof user.isPremiumActive === 'function') return user.isPremiumActive(now);
  // Fallback para POJOs (tests): replica User.isPremiumActive.
  if (user.tier === 'premium') return true;
  return Boolean(user.premiumUntil && new Date(user.premiumUntil) > now);
}

/** Patrocinio activo del perro por su partner. */
function isSponsored(dog) {
  return Boolean(dog && dog.sponsorshipStatus === 'sponsored');
}

/**
 * Resuelve el set completo de entitlements para un (user, dog).
 * @returns {{ isPremium: boolean, isSponsored: boolean, source: 'premium'|'sponsorship'|'none', features: Record<string, boolean> }}
 */
function resolve(user, dog = null, now = new Date()) {
  const premium = isPremium(user, now);
  const sponsored = isSponsored(dog);

  const features = {};
  for (const f of USER_FEATURES) features[f] = premium;
  for (const f of DOG_FEATURES) features[f] = premium || sponsored;

  const source = premium ? 'premium' : sponsored ? 'sponsorship' : 'none';
  return { isPremium: premium, isSponsored: sponsored, source, features };
}

/**
 * ¿Tiene el (user, dog) habilitada `feature`?
 * Las features que no están en el catálogo gateado son gratuitas → siempre true.
 */
function can(user, dog, feature, now = new Date()) {
  if (!GATED_FEATURES.includes(feature)) return true;
  if (USER_FEATURES.includes(feature)) return isPremium(user, now);
  return isPremium(user, now) || isSponsored(dog);
}

/**
 * Lanza un error 403 `UPGRADE_REQUIRED` si la feature no está habilitada.
 * El error trae `status`/`code` para que el errorHandler lo mapee directo y el
 * frontend muestre el CTA de upgrade.
 */
function assertCan(user, dog, feature, now = new Date()) {
  if (can(user, dog, feature, now)) return;
  const err = new Error(`Feature "${feature}" requires Premium or partner sponsorship.`);
  err.status = 403;
  err.code = 'UPGRADE_REQUIRED';
  err.feature = feature;
  throw err;
}

module.exports = {
  USER_FEATURES,
  DOG_FEATURES,
  GATED_FEATURES,
  isPremium,
  isSponsored,
  resolve,
  can,
  assertCan,
};
