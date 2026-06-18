'use strict';

/**
 * Catálogo tipado de eventos (data-model v1 §2).
 *
 * Catálogo CERRADO: agregar un tipo nuevo requiere definir su schema de payload acá.
 * Invariantes (con tests):
 *  - todo evento valida contra su schema;
 *  - los payloads solo contienen enums, números, booleanos y "códigos" controlados
 *    (identificadores sin texto libre) — nunca oraciones, nombres ni texto del usuario.
 *
 * Spec de campo:
 *   { kind: 'enum'|'number'|'bool'|'code'|'codeArray', values?: [...], optional?: bool }
 */

const CODE_RE = /^[a-z0-9_.:-]+$/i; // código controlado, sin espacios ni texto libre

const CHECKIN_QUESTIONS = ['comida', 'energia', 'agua', 'animo', 'digestion'];
const CHECKIN_ANSWERS = ['bien', 'regular', 'mal'];
const SYMPTOM_TYPES = ['vomito', 'diarrea', 'apetito', 'letargo', 'tos_respiracion', 'picazon_piel', 'cojera_dolor', 'ojos_oidos', 'otro'];
const SEVERITIES = ['leve', 'media', 'fuerte'];
// Fase 4 — conversion tracking: campañas de notificación rastreadas.
const NOTIFICATION_CAMPAIGNS = ['vaccination', 'medication', 'deworming', 'appointment', 'overdue', 'reengagement', 'checkin'];

const EVENTS = {
  // ── identity ──────────────────────────────────────────────────────────────
  'user.registered': { group: 'identity', payload: { ref: { kind: 'code', optional: true } } },
  'dog.created': { group: 'identity', payload: { breedId: { kind: 'code' }, ageEstimate: { kind: 'enum', values: ['cachorro', 'joven', 'adulto', 'senior', 'exact'] }, hasBirthDate: { kind: 'bool' } } },
  'dog.phenotype_completed': { group: 'identity', payload: { fields: { kind: 'codeArray' } } },
  'location.optin': { group: 'identity', payload: { zoneLevel: { kind: 'enum', values: ['country', 'region', 'city', 'neighborhood'] } } },
  'location.optout': { group: 'identity', payload: {} },

  // ── care ────────────────────────────────────────────────────────────────────
  'vaccine.logged': { group: 'care', payload: { vaccineType: { kind: 'code' }, onSchedule: { kind: 'bool' } } },
  'vaccine.due': { group: 'care', payload: { vaccineType: { kind: 'code' } } },
  'med.started': { group: 'care', payload: { medClass: { kind: 'code' } } },
  'med.dose_taken': { group: 'care', payload: {} },
  'med.stopped': { group: 'care', payload: { reason: { kind: 'enum', values: ['terminado', 'olvido', 'efectos', 'costo', 'indicacion_vet'] } } },
  'appointment.scheduled': { group: 'care', payload: { source: { kind: 'enum', values: ['manual', 'alert_cta'] } } },
  'appointment.completed': { group: 'care', payload: {} },
  'appointment.missed': { group: 'care', payload: {} },

  // ── signal ──────────────────────────────────────────────────────────────────
  'checkin.sent': { group: 'signal', payload: { question: { kind: 'enum', values: CHECKIN_QUESTIONS }, channel: { kind: 'enum', values: ['email', 'app'] } } },
  'checkin.answered': { group: 'signal', payload: { question: { kind: 'enum', values: CHECKIN_QUESTIONS }, answer: { kind: 'enum', values: CHECKIN_ANSWERS }, channel: { kind: 'enum', values: ['email', 'app'] }, latencyMs: { kind: 'number', optional: true } } },
  'checkin.skipped': { group: 'signal', payload: {} },
  'symptom.logged': { group: 'signal', payload: { type: { kind: 'enum', values: SYMPTOM_TYPES }, severity: { kind: 'enum', values: SEVERITIES }, entryMode: { kind: 'enum', values: ['quick', 'full'] } } },
  'symptom.resolved': { group: 'signal', payload: { type: { kind: 'enum', values: SYMPTOM_TYPES }, durationHours: { kind: 'number' } } },
  'weight.logged': { group: 'signal', payload: { source: { kind: 'enum', values: ['onboarding', 'checkin_suggestion', 'manual', 'vet_visit'] } } },

  // ── bond ──────────────────────────────────────────────────────────────────────
  'behavior.logged': { group: 'bond', payload: { kind: { kind: 'enum', values: ['logro', 'travesura', 'momento'] } } },
  'milestone.reached': { group: 'bond', payload: { milestoneType: { kind: 'code' } } },
  'card.shared': { group: 'bond', payload: { template: { kind: 'code' }, format: { kind: 'enum', values: ['square', 'story'], optional: true } } },
  'card.downloaded': { group: 'bond', payload: { template: { kind: 'code' } } },

  // ── growth ────────────────────────────────────────────────────────────────────
  'referral.shared': { group: 'growth', payload: { channel: { kind: 'code' } } },
  'referral.signup': { group: 'growth', payload: {} },
  'referral.activated': { group: 'growth', payload: {} },
  'surprise.shown': { group: 'growth', payload: { rewardType: { kind: 'enum', values: ['breed_fact', 'sticker', 'boosted_referral'] } } },
  'surprise.claimed': { group: 'growth', payload: { rewardType: { kind: 'enum', values: ['breed_fact', 'sticker', 'boosted_referral'] } } },
  'premium.started': { group: 'growth', payload: { source: { kind: 'enum', values: ['referral', 'paid'] } } },
  'premium.expired': { group: 'growth', payload: {} },
  // Kit de Activación Veterinaria.
  'clinic.registered': { group: 'growth', payload: { source: { kind: 'enum', values: ['admin', 'self'] } } },
  'clinic.signup': { group: 'growth', payload: { src: { kind: 'enum', values: ['qr', 'link', 'unknown'] } } },
  'clinic.activated': { group: 'growth', payload: {} },

  // ── outcome ─────────────────────────────────────────────────────────────────
  'alert.shown': { group: 'outcome', payload: { ruleId: { kind: 'code' }, alertType: { kind: 'code' } } },
  'alert.actioned': { group: 'outcome', payload: { ruleId: { kind: 'code' }, action: { kind: 'enum', values: ['cita_agendada', 'descartada', 'ignorada'] } } },
  'visit.outcome': { group: 'outcome', payload: { followUp: { kind: 'enum', values: ['nada', 'tratamiento', 'serio'] } } },

  // ── notification (Fase 4 — conversion tracking) ─────────────────────────────
  // Embudo: sent → clicked → converted, por campaña y canal.
  'notification.sent': { group: 'outcome', payload: { campaign: { kind: 'enum', values: NOTIFICATION_CAMPAIGNS }, channel: { kind: 'enum', values: ['email', 'push'] } } },
  'notification.clicked': { group: 'outcome', payload: { campaign: { kind: 'enum', values: NOTIFICATION_CAMPAIGNS }, channel: { kind: 'enum', values: ['email', 'push'] } } },
  'notification.converted': { group: 'outcome', payload: { campaign: { kind: 'enum', values: NOTIFICATION_CAMPAIGNS } } },
};

function validateField(spec, value) {
  switch (spec.kind) {
    case 'enum':
      return spec.values.includes(value) ? null : `must be one of ${spec.values.join(', ')}`;
    case 'number':
      return typeof value === 'number' && Number.isFinite(value) ? null : 'must be a finite number';
    case 'bool':
      return typeof value === 'boolean' ? null : 'must be a boolean';
    case 'code':
      return typeof value === 'string' && CODE_RE.test(value) && (!spec.values || spec.values.includes(value))
        ? null : 'must be a controlled code (no free text)';
    case 'codeArray':
      return Array.isArray(value) && value.every((v) => typeof v === 'string' && CODE_RE.test(v))
        ? null : 'must be an array of controlled codes';
    default:
      return 'unknown field kind';
  }
}

/**
 * Valida un evento contra el catálogo.
 * @returns {{ ok: boolean, errors: string[] }}
 */
function validateEvent(type, payload = {}) {
  const def = EVENTS[type];
  if (!def) return { ok: false, errors: [`unknown event type "${type}"`] };

  const errors = [];
  const spec = def.payload;

  // Campos no declarados → rechazo (payloads cerrados).
  for (const key of Object.keys(payload)) {
    if (!spec[key]) errors.push(`unexpected field "${key}"`);
  }

  for (const [field, fieldSpec] of Object.entries(spec)) {
    const present = payload[field] !== undefined && payload[field] !== null;
    if (!present) {
      if (!fieldSpec.optional) errors.push(`missing field "${field}"`);
      continue;
    }
    const err = validateField(fieldSpec, payload[field]);
    if (err) errors.push(`field "${field}" ${err}`);
  }

  return { ok: errors.length === 0, errors };
}

const EVENT_TYPES = Object.keys(EVENTS);

module.exports = { EVENTS, EVENT_TYPES, validateEvent, SYMPTOM_TYPES, CHECKIN_QUESTIONS, NOTIFICATION_CAMPAIGNS };
