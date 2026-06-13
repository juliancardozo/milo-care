'use strict';

const { emitEvent } = require('../core/events/eventBus');

/**
 * Adaptador de compatibilidad: traduce las llamadas legacy `track(type, opts)` al
 * catálogo tipado de eventos (core/events/catalog.js) y las emite por el bus, que
 * persiste en la colección `events` (data-model v1).
 *
 * Fire-and-forget: nunca bloquea ni lanza. Un tipo legacy sin mapeo se descarta
 * con log (no escribe basura).
 */

// Mapa de quickType (Fase 2) → taxonomía de síntomas v1 (9 tipos).
const QUICK_SYMPTOM_MAP = {
  vomito: 'vomito',
  diarrea: 'diarrea',
  tos: 'tos_respiracion',
  cojera: 'cojera_dolor',
  decaimiento: 'letargo',
  inapetencia: 'apetito',
  otro: 'otro',
};

// legacyType → (opts) => { type, payload } | null  (null = descartar)
const LEGACY_MAP = {
  checkin_sent: ({ channel, meta }) => ({ type: 'checkin.sent', payload: { question: meta?.question, channel: channel || 'email' } }),
  checkin_answered: ({ channel, meta }) => ({ type: 'checkin.answered', payload: { question: meta?.question, answer: meta?.answer, channel: channel || 'app' } }),
  checkin_streak_day: () => null, // derivado de los check-ins, no es evento del catálogo

  quick_symptom_logged: ({ meta }) => ({ type: 'symptom.logged', payload: { type: QUICK_SYMPTOM_MAP[meta?.quickType] || 'otro', severity: 'media', entryMode: 'quick' } }),
  behavior_logged: ({ meta }) => ({ type: 'behavior.logged', payload: { kind: meta?.kind } }),

  milestone_shown: ({ meta }) => ({ type: 'milestone.reached', payload: { milestoneType: meta?.key } }),
  card_shared: ({ meta }) => ({ type: 'card.shared', payload: { template: meta?.key } }),
  card_downloaded: ({ meta }) => ({ type: 'card.downloaded', payload: { template: meta?.key } }),

  referral_signup: () => ({ type: 'referral.signup', payload: {} }),
  referral_activated: () => ({ type: 'referral.activated', payload: {} }),
  referral_link_shared: ({ channel, meta }) => ({ type: 'referral.shared', payload: { channel: channel || meta?.channel || 'app' } }),
  surprise_shown: ({ meta }) => ({ type: 'surprise.shown', payload: { rewardType: meta?.type } }),

  location_optin: ({ meta }) => ({ type: 'location.optin', payload: { zoneLevel: meta?.zoneLevel || (meta?.city ? 'city' : meta?.region ? 'region' : 'country') } }),
  location_deleted: () => ({ type: 'location.optout', payload: {} }),
};

/**
 * Compat: registra un evento legacy traducido al catálogo. Fire-and-forget.
 * @param {string} legacyType
 * @param {object} opts - { userId, dogId, zoneId, channel, meta }
 */
function track(legacyType, opts = {}) {
  const mapper = LEGACY_MAP[legacyType];
  if (!mapper) {
    console.error(`[analytics] unmapped legacy event "${legacyType}" — dropped`);
    return;
  }
  const mapped = mapper(opts);
  if (!mapped) return; // descartado intencionalmente

  emitEvent({
    type: mapped.type,
    userId: opts.userId || null,
    dogId: opts.dogId || null,
    zoneId: opts.zoneId || null,
    payload: mapped.payload,
  });
}

module.exports = { track };
